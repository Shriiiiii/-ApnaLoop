from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from database import get_db
from models import User, Follow
from schemas import UserOut, UserUpdate
from auth import get_current_user
import os
import uuid

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")

router = APIRouter(prefix="/api/users", tags=["users"])


async def _build_user_out(user: User, db: AsyncSession, current_user_id: int = None) -> UserOut:
    followers_q = await db.execute(select(func.count()).where(Follow.following_id == user.id))
    following_q = await db.execute(select(func.count()).where(Follow.follower_id == user.id))

    is_following = False
    if current_user_id and current_user_id != user.id:
        fq = await db.execute(
            select(Follow).where(and_(Follow.follower_id == current_user_id, Follow.following_id == user.id))
        )
        is_following = fq.scalar_one_or_none() is not None

    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name or user.username,
        bio=user.bio or "",
        avatar_url=user.avatar_url or "",
        created_at=user.created_at,
        followers_count=followers_q.scalar(),
        following_count=following_q.scalar(),
        is_following=is_following,
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _build_user_out(current_user, db)


@router.get("/search")
async def search_users(q: str = "", current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            (User.username.ilike(f"%{q}%")) | (User.display_name.ilike(f"%{q}%"))
        ).where(User.username != "apnaloop_ai").limit(20)
    )
    users = result.scalars().all()
    return [await _build_user_out(u, db, current_user.id) for u in users]


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await _build_user_out(user, db, current_user.id)


@router.put("/me", response_model=UserOut)
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.bio is not None:
        current_user.bio = data.bio
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    await db.flush()
    await db.refresh(current_user)
    return await _build_user_out(current_user, db)


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    current_user.avatar_url = f"/uploads/{filename}"
    await db.flush()
    await db.refresh(current_user)
    return await _build_user_out(current_user, db)


@router.post("/{user_id}/follow")
async def follow_user(user_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(Follow).where(and_(Follow.follower_id == current_user.id, Follow.following_id == user_id))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already following")

    db.add(Follow(follower_id=current_user.id, following_id=user_id))
    return {"message": "Followed successfully"}


@router.delete("/{user_id}/follow")
async def unfollow_user(user_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Follow).where(and_(Follow.follower_id == current_user.id, Follow.following_id == user_id))
    )
    follow = result.scalar_one_or_none()
    if not follow:
        raise HTTPException(status_code=400, detail="Not following this user")
    await db.delete(follow)
    return {"message": "Unfollowed successfully"}


@router.get("/{user_id}/followers")
async def get_followers(user_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).join(Follow, Follow.follower_id == User.id).where(Follow.following_id == user_id)
    )
    users = result.scalars().all()
    return [await _build_user_out(u, db, current_user.id) for u in users]


@router.get("/{user_id}/following")
async def get_following(user_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).join(Follow, Follow.following_id == User.id).where(Follow.follower_id == user_id)
    )
    users = result.scalars().all()
    return [await _build_user_out(u, db, current_user.id) for u in users]

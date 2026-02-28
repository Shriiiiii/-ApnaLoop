from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from database import get_db
from models import User, Post, PostLike, Follow, Comment, Notification
from schemas import PostCreate, PostOut, CommentOut
from auth import get_current_user
import os
import uuid

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")

router = APIRouter(prefix="/api/posts", tags=["posts"])


async def _build_post_out(post: Post, db: AsyncSession, current_user_id: int) -> PostOut:
    author = await db.execute(select(User).where(User.id == post.author_id))
    author = author.scalar_one_or_none()

    liked = await db.execute(
        select(PostLike).where(and_(PostLike.user_id == current_user_id, PostLike.post_id == post.id))
    )
    is_liked = liked.scalar_one_or_none() is not None

    comments_q = await db.execute(select(func.count()).select_from(Comment).where(Comment.post_id == post.id))
    comments_count = comments_q.scalar() or 0

    return PostOut(
        id=post.id, author_id=post.author_id, image_url=post.image_url,
        caption=post.caption, likes_count=post.likes_count,
        comments_count=comments_count,
        created_at=post.created_at,
        author_username=author.username if author else "",
        author_avatar=author.avatar_url if author else "",
        is_liked=is_liked,
    )


@router.post("")
async def create_post(
    caption: str = Form(""), image_url: str = Form(""), file: UploadFile = File(None),
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    final_url = image_url
    if file and file.filename:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        filename = f"post_{uuid.uuid4().hex[:12]}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
        final_url = f"/uploads/{filename}"
    if not final_url:
        raise HTTPException(status_code=400, detail="An image URL or file is required")
    post = Post(author_id=current_user.id, image_url=final_url, caption=caption)
    db.add(post)
    await db.flush()
    await db.refresh(post)
    return await _build_post_out(post, db, current_user.id)


@router.get("/feed")
async def get_feed(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    following_q = await db.execute(select(Follow.following_id).where(Follow.follower_id == current_user.id))
    following_ids = [row[0] for row in following_q.fetchall()]
    following_ids.append(current_user.id)
    result = await db.execute(select(Post).where(Post.author_id.in_(following_ids)).order_by(desc(Post.created_at)).limit(50))
    posts = result.scalars().all()
    return [await _build_post_out(p, db, current_user.id) for p in posts]


@router.get("/explore")
async def get_explore(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).order_by(desc(Post.created_at)).limit(50))
    posts = result.scalars().all()
    return [await _build_post_out(p, db, current_user.id) for p in posts]


@router.get("/user/{user_id}")
async def get_user_posts(user_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.author_id == user_id).order_by(desc(Post.created_at)))
    posts = result.scalars().all()
    return [await _build_post_out(p, db, current_user.id) for p in posts]


@router.post("/{post_id}/like")
async def toggle_like(post_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = await db.execute(select(Post).where(Post.id == post_id))
    post = post.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = await db.execute(select(PostLike).where(and_(PostLike.user_id == current_user.id, PostLike.post_id == post_id)))
    like = existing.scalar_one_or_none()
    if like:
        await db.delete(like)
        post.likes_count = max(0, post.likes_count - 1)
        return {"liked": False, "likes_count": post.likes_count}
    else:
        db.add(PostLike(user_id=current_user.id, post_id=post_id))
        post.likes_count += 1
        # Create notification for post author
        if post.author_id != current_user.id:
            db.add(Notification(
                user_id=post.author_id,
                actor_id=current_user.id,
                type="like",
                target_id=post.id,
                text=f"{current_user.display_name or current_user.username} liked your post",
            ))
        return {"liked": True, "likes_count": post.likes_count}


# ---- Comments ----
@router.get("/{post_id}/comments")
async def get_comments(post_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Comment).where(Comment.post_id == post_id).order_by(Comment.created_at))
    comments = result.scalars().all()
    out = []
    for c in comments:
        author_q = await db.execute(select(User).where(User.id == c.author_id))
        author = author_q.scalar_one_or_none()
        out.append(CommentOut(
            id=c.id, post_id=c.post_id, author_id=c.author_id,
            content=c.content, created_at=c.created_at,
            author_username=author.username if author else "",
            author_avatar=author.avatar_url if author else "",
        ))
    return out


@router.post("/{post_id}/comments")
async def add_comment(post_id: int, content: str = Form(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = await db.execute(select(Post).where(Post.id == post_id))
    post = post.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = Comment(post_id=post_id, author_id=current_user.id, content=content)
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    # Create notification for post author
    if post.author_id != current_user.id:
        db.add(Notification(
            user_id=post.author_id,
            actor_id=current_user.id,
            type="comment",
            target_id=post.id,
            text=f"{current_user.display_name or current_user.username} commented: {content[:50]}",
        ))
    return CommentOut(
        id=comment.id, post_id=comment.post_id, author_id=comment.author_id,
        content=comment.content, created_at=comment.created_at,
        author_username=current_user.username, author_avatar=current_user.avatar_url or "",
    )

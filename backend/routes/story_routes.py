from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from models import Story, User
from auth import get_current_user
from datetime import datetime, timedelta, timezone
import os
import uuid

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")

router = APIRouter(prefix="/api/stories", tags=["stories"])


@router.post("")
async def create_story(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"story_{uuid.uuid4().hex[:12]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    image_url = f"/uploads/{filename}"
    story = Story(
        user_id=current_user.id,
        image_url=image_url,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(story)
    await db.flush()
    await db.refresh(story)
    return {
        "id": story.id,
        "user_id": story.user_id,
        "image_url": story.image_url,
        "created_at": story.created_at.isoformat() if story.created_at else None,
        "expires_at": story.expires_at.isoformat() if story.expires_at else None,
    }


@router.get("")
async def get_stories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Story)
        .where(Story.expires_at > now)
        .order_by(desc(Story.created_at))
    )
    stories = result.scalars().all()

    # Group by user
    grouped = {}
    for s in stories:
        if s.user_id not in grouped:
            author_q = await db.execute(select(User).where(User.id == s.user_id))
            author = author_q.scalar_one_or_none()
            grouped[s.user_id] = {
                "user_id": s.user_id,
                "username": author.username if author else "",
                "display_name": author.display_name if author else "",
                "avatar_url": author.avatar_url if author else "",
                "stories": [],
            }
        grouped[s.user_id]["stories"].append({
            "id": s.id,
            "image_url": s.image_url,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        })

    # Put current user first
    result_list = []
    if current_user.id in grouped:
        result_list.append(grouped.pop(current_user.id))
    result_list.extend(grouped.values())
    return result_list

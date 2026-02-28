from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, update
from database import get_db
from models import Notification, User
from auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(50)
    )
    notifications = result.scalars().all()
    out = []
    for n in notifications:
        actor_q = await db.execute(select(User).where(User.id == n.actor_id))
        actor = actor_q.scalar_one_or_none()
        out.append({
            "id": n.id,
            "type": n.type,
            "text": n.text,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "target_id": n.target_id,
            "actor": {
                "id": actor.id if actor else 0,
                "username": actor.username if actor else "",
                "display_name": actor.display_name if actor else "",
                "avatar_url": actor.avatar_url if actor else "",
            } if actor else None,
        })
    return out


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
    )
    count = result.scalar() or 0
    return {"count": count}


@router.post("/read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    return {"status": "ok"}

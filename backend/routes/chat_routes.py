from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func, delete
from database import get_db, async_session
from models import User, Conversation, ConversationMember, Message, MessageReaction
from schemas import ConversationCreate, GroupCreate, MessageOut, ConversationOut, UserOut, ReactionOut
from auth import get_current_user
from jose import JWTError, jwt
from auth import SECRET_KEY, ALGORITHM
import json
from datetime import datetime, timezone

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [ws for ws in self.active_connections[user_id] if ws != websocket]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def send_to_conversation(self, member_ids: list[int], message: dict):
        for uid in member_ids:
            await self.send_to_user(uid, message)


manager = ConnectionManager()

AI_BOT_USERNAME = "apnaloop_ai"


async def _build_conv_out(conv, db, current_user_id):
    msg_q = await db.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(desc(Message.created_at)).limit(1)
    )
    last_msg = msg_q.scalar_one_or_none()

    members_q = await db.execute(
        select(ConversationMember).where(ConversationMember.conversation_id == conv.id)
    )
    all_members = members_q.scalars().all()
    member_count = len(all_members)

    other_user = None
    if not conv.is_group:
        for m in all_members:
            if m.user_id != current_user_id:
                u_q = await db.execute(select(User).where(User.id == m.user_id))
                other = u_q.scalar_one_or_none()
                if other:
                    other_user = UserOut(
                        id=other.id, username=other.username, email=other.email,
                        display_name=other.display_name or other.username,
                        bio=other.bio or "", avatar_url=other.avatar_url or "",
                        created_at=other.created_at,
                    )
                break

    return ConversationOut(
        id=conv.id, name=conv.name or "", is_group=conv.is_group,
        created_at=conv.created_at, updated_at=conv.updated_at,
        last_message=last_msg.content if last_msg else "",
        other_user=other_user, member_count=member_count,
    )


@router.get("/conversations")
async def get_conversations(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).join(ConversationMember)
        .where(ConversationMember.user_id == current_user.id)
        .order_by(desc(Conversation.updated_at))
    )
    conversations = result.scalars().unique().all()
    return [await _build_conv_out(c, db, current_user.id) for c in conversations]


@router.post("/conversations")
async def create_conversation(data: ConversationCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not data.user_id:
        raise HTTPException(status_code=400, detail="user_id required for DM")

    my_convs = await db.execute(select(ConversationMember.conversation_id).where(ConversationMember.user_id == current_user.id))
    my_conv_ids = [row[0] for row in my_convs.fetchall()]

    if my_conv_ids:
        other_convs = await db.execute(
            select(ConversationMember.conversation_id).where(
                and_(ConversationMember.user_id == data.user_id, ConversationMember.conversation_id.in_(my_conv_ids))
            )
        )
        for row in other_convs.fetchall():
            cq = await db.execute(select(Conversation).where(and_(Conversation.id == row[0], Conversation.is_group == False)))
            if cq.scalar_one_or_none():
                return {"id": row[0], "existing": True}

    conv = Conversation(name=data.name or "", is_group=False)
    db.add(conv)
    await db.flush()
    db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id))
    db.add(ConversationMember(conversation_id=conv.id, user_id=data.user_id))
    await db.flush()
    return {"id": conv.id, "existing": False}


@router.post("/groups")
async def create_group(data: GroupCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    conv = Conversation(name=data.name, is_group=True)
    db.add(conv)
    await db.flush()
    db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id))
    for uid in data.member_ids:
        if uid != current_user.id:
            db.add(ConversationMember(conversation_id=conv.id, user_id=uid))
    await db.flush()
    return {"id": conv.id}


@router.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    member = await db.execute(
        select(ConversationMember).where(and_(ConversationMember.conversation_id == conv_id, ConversationMember.user_id == current_user.id))
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member")

    # Mark messages as read
    unread = await db.execute(
        select(Message).where(and_(Message.conversation_id == conv_id, Message.sender_id != current_user.id, Message.status != "read"))
    )
    for msg in unread.scalars().all():
        msg.status = "read"
    await db.flush()

    result = await db.execute(select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at).limit(200))
    messages = result.scalars().all()

    out = []
    for msg in messages:
        sender_q = await db.execute(select(User).where(User.id == msg.sender_id))
        sender = sender_q.scalar_one_or_none()

        reactions_q = await db.execute(select(MessageReaction).where(MessageReaction.message_id == msg.id))
        reactions = []
        for r in reactions_q.scalars().all():
            ru_q = await db.execute(select(User).where(User.id == r.user_id))
            ru = ru_q.scalar_one_or_none()
            reactions.append(ReactionOut(emoji=r.emoji, user_id=r.user_id, username=ru.username if ru else ""))

        out.append(MessageOut(
            id=msg.id, conversation_id=msg.conversation_id, sender_id=msg.sender_id,
            content=msg.content, status=msg.status or "sent", created_at=msg.created_at,
            sender_username=sender.username if sender else "", reactions=reactions,
        ))
    return out


@router.delete("/conversations/{conv_id}/messages")
async def clear_chat(conv_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    member = await db.execute(
        select(ConversationMember).where(and_(ConversationMember.conversation_id == conv_id, ConversationMember.user_id == current_user.id))
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member")
    await db.execute(delete(Message).where(Message.conversation_id == conv_id))
    return {"cleared": True}


@router.get("/conversations/{conv_id}/members")
async def get_members(conv_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).join(ConversationMember, ConversationMember.user_id == User.id)
        .where(ConversationMember.conversation_id == conv_id)
    )
    users = result.scalars().all()
    return [UserOut(id=u.id, username=u.username, email=u.email, display_name=u.display_name or u.username, bio=u.bio or "", avatar_url=u.avatar_url or "", created_at=u.created_at) for u in users]


# ---- WebSocket ----
@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, Exception):
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)
            msg_type = msg_data.get("type", "message")

            if msg_type == "reaction":
                # Handle reaction
                message_id = msg_data.get("message_id")
                emoji = msg_data.get("emoji", "👍")
                conv_id = msg_data.get("conversation_id")

                async with async_session() as db:
                    # Toggle reaction
                    existing = await db.execute(
                        select(MessageReaction).where(and_(
                            MessageReaction.message_id == message_id,
                            MessageReaction.user_id == user_id,
                            MessageReaction.emoji == emoji
                        ))
                    )
                    ex = existing.scalar_one_or_none()
                    if ex:
                        await db.delete(ex)
                    else:
                        db.add(MessageReaction(message_id=message_id, user_id=user_id, emoji=emoji))
                    await db.commit()

                    sender_q = await db.execute(select(User).where(User.id == user_id))
                    sender = sender_q.scalar_one_or_none()

                    members_q = await db.execute(select(ConversationMember.user_id).where(ConversationMember.conversation_id == conv_id))
                    member_ids = [r[0] for r in members_q.fetchall()]

                await manager.send_to_conversation(member_ids, {
                    "type": "reaction",
                    "message_id": message_id,
                    "emoji": emoji,
                    "user_id": user_id,
                    "username": sender.username if sender else "",
                    "action": "remove" if ex else "add",
                })
                continue

            # Regular message
            conversation_id = msg_data.get("conversation_id")
            content = msg_data.get("content", "").strip()
            if not conversation_id or not content:
                continue

            async with async_session() as db:
                message = Message(conversation_id=conversation_id, sender_id=user_id, content=content, status="sent")
                db.add(message)
                conv_q = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
                conv = conv_q.scalar_one_or_none()
                if conv:
                    conv.updated_at = datetime.now(timezone.utc)
                await db.commit()
                await db.refresh(message)

                sender_q = await db.execute(select(User).where(User.id == user_id))
                sender = sender_q.scalar_one_or_none()
                members_q = await db.execute(select(ConversationMember.user_id).where(ConversationMember.conversation_id == conversation_id))
                member_ids = [r[0] for r in members_q.fetchall()]

                # Mark as delivered for online users
                message.status = "delivered"
                await db.commit()

            await manager.send_to_conversation(member_ids, {
                "type": "new_message",
                "message": {
                    "id": message.id,
                    "conversation_id": conversation_id,
                    "sender_id": user_id,
                    "content": content,
                    "status": "delivered",
                    "created_at": message.created_at.isoformat(),
                    "sender_username": sender.username if sender else "",
                    "reactions": [],
                },
            })

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)

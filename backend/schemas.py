from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ---------- Auth ----------
class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    display_name: Optional[str] = ""

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- User ----------
class UserOut(BaseModel):
    id: int
    username: str
    email: str
    display_name: str
    bio: str
    avatar_url: str
    created_at: datetime
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    is_following: Optional[bool] = False

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


# ---------- Post ----------
class PostCreate(BaseModel):
    image_url: str
    caption: Optional[str] = ""

class CommentOut(BaseModel):
    id: int
    post_id: int
    author_id: int
    content: str
    created_at: datetime
    author_username: Optional[str] = ""
    author_avatar: Optional[str] = ""

    class Config:
        from_attributes = True

class PostOut(BaseModel):
    id: int
    author_id: int
    image_url: str
    caption: str
    likes_count: int
    comments_count: Optional[int] = 0
    created_at: datetime
    author_username: Optional[str] = ""
    author_avatar: Optional[str] = ""
    is_liked: Optional[bool] = False

    class Config:
        from_attributes = True


# ---------- Chat ----------
class ConversationCreate(BaseModel):
    user_id: Optional[int] = None
    name: Optional[str] = ""

class GroupCreate(BaseModel):
    name: str
    member_ids: List[int]

class MessageCreate(BaseModel):
    content: str

class ReactionOut(BaseModel):
    emoji: str
    user_id: int
    username: Optional[str] = ""

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    status: Optional[str] = "sent"
    created_at: datetime
    sender_username: Optional[str] = ""
    reactions: Optional[List[ReactionOut]] = []

    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id: int
    name: str
    is_group: bool
    created_at: datetime
    updated_at: datetime
    last_message: Optional[str] = ""
    other_user: Optional[UserOut] = None
    member_count: Optional[int] = 0

    class Config:
        from_attributes = True

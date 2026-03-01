from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User
from schemas import UserRegister, UserLogin, Token
from auth import hash_password, verify_password, create_access_token
import traceback

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    try:
        # Check existing username
        result = await db.execute(select(User).where(User.username == data.username))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")

        # Check existing email
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
            display_name=data.display_name or data.username,
            avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={data.username}",
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        token = create_access_token({"sub": str(user.id)})
        return Token(access_token=token)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)

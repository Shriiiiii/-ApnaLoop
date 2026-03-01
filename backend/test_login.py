import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, async_session, Base
from models import User
from sqlalchemy import select
from auth import verify_password

async def test_pwd():
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == "praveen"))
        user = result.scalar_one_or_none()
        if user:
            print(f"Hashed pwd: {user.hashed_password}")
            print("Verify password 'ApnaLoop2024!':", verify_password("ApnaLoop2024!", user.hashed_password))
        else:
            print("User not found")

if __name__ == "__main__":
    asyncio.run(test_pwd())

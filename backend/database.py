from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os

# Try to get Supabase Postgres URL from environment, otherwise fallback to local SQLite
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "sqlite+aiosqlite:///" + os.path.abspath(os.path.join(os.path.dirname(__file__), "nexus.db"))
)

# Convert +asyncpg to +psycopg silently if the user forgot to change it in Render vars
if "postgresql+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg")

engine_kwargs = {"echo": False}
if "psycopg" in DATABASE_URL:
    engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    async with engine.begin() as conn:
        from models import Base as _Base  # noqa
        await conn.run_sync(_Base.metadata.create_all)

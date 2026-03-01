from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os

# Try to get Supabase Postgres URL from environment, otherwise fallback to local SQLite
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "sqlite+aiosqlite:///" + os.path.abspath(os.path.join(os.path.dirname(__file__), "nexus.db"))
)

engine_kwargs = {"echo": False}
if "asyncpg" in DATABASE_URL:
    engine_kwargs["pool_pre_ping"] = True
    # Prevent asyncpg from preparing statements which breaks PgBouncer transaction mode
    engine_kwargs["connect_args"] = {"statement_cache_size": 0, "prepared_statement_cache_size": 0}

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

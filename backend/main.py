from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from database import init_db
from routes.auth_routes import router as auth_router
from routes.user_routes import router as user_router
from routes.post_routes import router as post_router
from routes.chat_routes import router as chat_router
from routes.upload_routes import router as upload_router
from routes.ai_routes import router as ai_router
from routes.story_routes import router as story_router
from routes.notification_routes import router as notification_router
import os

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="Nexus API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(post_router)
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(ai_router)
app.include_router(story_router)
app.include_router(notification_router)


@app.get("/")
async def root():
    return {"message": "Nexus API is running", "version": "2.0.0"}

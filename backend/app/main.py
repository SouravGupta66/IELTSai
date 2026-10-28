# backend/app/main.py
import os
import sys

# Windows consoles default to a non-UTF-8 codepage (cp1252), which crashes
# on the emoji in the startup/shutdown prints below. Force UTF-8 so this
# works regardless of PYTHONIOENCODING being set in the shell.
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from .database import engine, Base, create_tables
from .routers import speaking, writing, listening, reading, auth_router, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting IELTS AI Platform...")
    create_tables()
    print("✅ Database tables created")
    yield
    print("🛑 Shutting down...")

app = FastAPI(
    title="IELTS AI Practice Platform",
    description="AI-powered IELTS preparation with local Qwen 3B via Ollama",
    version="1.0.0",
    lifespan=lifespan
)

# ✅ CORS - MUST BE BEFORE ROUTERS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ STATIC FILES - serve generated/uploaded audio
os.makedirs("uploads/audio", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ ROUTERS
app.include_router(auth_router.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(speaking.router, prefix="/api/speaking", tags=["Speaking"])
app.include_router(writing.router, prefix="/api/writing", tags=["Writing"])
app.include_router(listening.router, prefix="/api/listening", tags=["Listening"])
app.include_router(reading.router, prefix="/api/reading", tags=["Reading"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "IELTS AI Platform", "version": "1.0.0"}

@app.get("/")
async def root():
    return {"message": "IELTS AI Practice Platform API", "docs": "/docs"}
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.students import router as students_router
from app.api.documents import router as documents_router
from app.api.quizzes import router as quizzes_router
from app.database import Base, engine, repair_orphaned_records


@asynccontextmanager
async def lifespan(_: FastAPI):
    # A personal desktop app should work on first launch without a separate
    # database server or migration command.
    Base.metadata.create_all(bind=engine)
    repair_orphaned_records()
    yield


app = FastAPI(title="Smartify Local API", lifespan=lifespan)


app.include_router(health_router)
app.include_router(students_router)
app.include_router(documents_router)
app.include_router(quizzes_router)
app.add_middleware(
    CORSMiddleware,
    # Only a loopback server is exposed. Wildcard origin also permits the
    # packaged Electron UI's file:// origin without cookies or credentials.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

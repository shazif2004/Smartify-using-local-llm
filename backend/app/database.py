from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine_options = {"pool_pre_ping": True}

if settings.DATABASE_URL.startswith("sqlite"):
    # FastAPI handles requests on worker threads, so SQLite connections must
    # be allowed to move between those threads.
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, **engine_options)


def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    """Make SQLite honor ON DELETE rules on every connection."""
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


if settings.DATABASE_URL.startswith("sqlite"):
    event.listen(engine, "connect", _enable_sqlite_foreign_keys)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


_SQLITE_ORPHAN_CLEANUP = (
    """
    DELETE FROM quiz_answers
    WHERE NOT EXISTS (
        SELECT 1 FROM quiz_attempts
        WHERE quiz_attempts.id = quiz_answers.attempt_id
    )
    OR NOT EXISTS (
        SELECT 1 FROM quiz_questions
        WHERE quiz_questions.id = quiz_answers.question_id
    )
    """,
    """
    DELETE FROM quiz_short_answer_questions
    WHERE NOT EXISTS (
        SELECT 1 FROM quizzes
        WHERE quizzes.id = quiz_short_answer_questions.quiz_id
    )
    """,
    """
    DELETE FROM quiz_questions
    WHERE NOT EXISTS (
        SELECT 1 FROM quizzes
        WHERE quizzes.id = quiz_questions.quiz_id
    )
    """,
    """
    DELETE FROM quiz_attempts
    WHERE NOT EXISTS (
        SELECT 1 FROM quizzes
        WHERE quizzes.id = quiz_attempts.quiz_id
    )
    OR NOT EXISTS (
        SELECT 1 FROM users
        WHERE users.id = quiz_attempts.user_id
    )
    """,
    """
    DELETE FROM quizzes
    WHERE NOT EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = quizzes.document_id
    )
    OR NOT EXISTS (
        SELECT 1 FROM users
        WHERE users.id = quizzes.owner_id
    )
    """,
    """
    DELETE FROM document_chunks
    WHERE NOT EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_chunks.document_id
    )
    """,
    """
    DELETE FROM documents
    WHERE NOT EXISTS (
        SELECT 1 FROM users
        WHERE users.id = documents.owner_id
    )
    """,
)


def _cleanup_orphaned_records(connection) -> int:
    """Remove legacy child rows whose parent was already deleted."""
    removed = 0

    for statement in _SQLITE_ORPHAN_CLEANUP:
        result = connection.execute(text(statement))
        if result.rowcount and result.rowcount > 0:
            removed += result.rowcount

    return removed


def repair_orphaned_records() -> int:
    """Repair data left by older builds that did not enable SQLite FKs."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return 0

    with engine.begin() as connection:
        return _cleanup_orphaned_records(connection)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()

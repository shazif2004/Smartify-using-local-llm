import sqlite3

from sqlalchemy import create_engine

from app.database import (
    Base,
    _cleanup_orphaned_records,
    _enable_sqlite_foreign_keys,
)
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.quiz import Quiz
from app.models.quiz_answer import QuizAnswer
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_question import QuizQuestion
from app.models.quiz_short_answer_question import QuizShortAnswerQuestion
from app.models.user import User


def test_enable_sqlite_foreign_keys() -> None:
    connection = sqlite3.connect(":memory:")

    try:
        _enable_sqlite_foreign_keys(connection, None)
        enabled = connection.execute("PRAGMA foreign_keys").fetchone()[0]
    finally:
        connection.close()

    assert enabled == 1


def test_cleanup_removes_legacy_orphan_rows() -> None:
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(test_engine)

    with test_engine.begin() as connection:
        connection.exec_driver_sql(
            """
            INSERT INTO document_chunks (
                document_id, page_number, chunk_index, title,
                content, word_count, char_count
            ) VALUES (999, 1, 0, NULL, 'orphaned notes', 2, 14)
            """
        )
        connection.exec_driver_sql(
            """
            INSERT INTO quiz_short_answer_questions (
                quiz_id, topic, question, expected_answer
            ) VALUES (999, 'Old quiz', 'Question?', 'Answer')
            """
        )

        removed = _cleanup_orphaned_records(connection)

        chunks = connection.exec_driver_sql(
            "SELECT count(*) FROM document_chunks"
        ).scalar_one()
        short_answers = connection.exec_driver_sql(
            "SELECT count(*) FROM quiz_short_answer_questions"
        ).scalar_one()

    assert removed == 2
    assert chunks == 0
    assert short_answers == 0

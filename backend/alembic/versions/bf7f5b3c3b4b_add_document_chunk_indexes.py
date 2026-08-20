"""add document chunk indexes"""

from typing import Sequence, Union

from alembic import op

revision = "bf7f5b3c3b4b"
down_revision = "e139885b5b72"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_document_chunks_document_id",
        "document_chunks",
        ["document_id"],
    )

    op.create_index(
        "ix_document_chunks_page_number",
        "document_chunks",
        ["page_number"],
    )

    op.create_unique_constraint(
        "uq_document_chunk_index",
        "document_chunks",
        ["document_id", "chunk_index"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_document_chunk_index",
        "document_chunks",
        type_="unique",
    )

    op.drop_index(
        "ix_document_chunks_page_number",
        table_name="document_chunks",
    )

    op.drop_index(
        "ix_document_chunks_document_id",
        table_name="document_chunks",
    )

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User


LOCAL_PROFILE_EMAIL = "local@smartify.invalid"


def get_local_user(database: Session = Depends(get_db)) -> User:
    """Return Smartify's single on-device profile without authentication."""
    user = database.scalar(
        select(User).where(User.email == LOCAL_PROFILE_EMAIL)
    )

    if user is None:
        user = User(
            name="Local User",
            email=LOCAL_PROFILE_EMAIL,
            # This value is never accepted by an API and is not a credential.
            # It only satisfies the legacy database column while preserving
            # compatibility with existing document relationships.
            password_hash="local-profile-has-no-password",
        )
        database.add(user)
        database.commit()
        database.refresh(user)

    return user

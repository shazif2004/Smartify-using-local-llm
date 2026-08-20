"""Entry point used by the packaged Smartify desktop application."""

import os

import uvicorn
from app.main import app


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=int(os.environ.get("SMARTIFY_API_PORT", "8765")),
        log_level=os.environ.get("SMARTIFY_LOG_LEVEL", "warning"),
        access_log=False,
    )

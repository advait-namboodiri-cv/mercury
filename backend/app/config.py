"""Runtime config, loaded from the backend .env file."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# load backend/.env regardless of where the server is started from
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)


class Config:
    VAULT_PATH: str = os.getenv("VAULT_PATH", "")
    MLX_MODEL: str = os.getenv("MLX_MODEL", "mlx-community/Qwen3-14B-4bit")
    PORT: int = int(os.getenv("PORT", "8000"))

    @property
    def vault(self) -> Path | None:
        return Path(self.VAULT_PATH).expanduser() if self.VAULT_PATH else None


config = Config()

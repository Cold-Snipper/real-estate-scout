from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class MailerConfig:
    operator_id: int
    limit: int = 10
    headless: bool = True
    dry_run: bool = False
    source: str = "all"  # athome | immotop | all

    # WhatsApp Web automation (optional)
    whatsapp_web_send: bool = False
    # Preferred: persistent profile dir (logged in once, reused forever)
    whatsapp_profile_dir: Path | None = None
    # Legacy/optional: storage_state JSON for logged-in WhatsApp Web
    whatsapp_storage_state_path: Path | None = None

    # Rate limiting / pacing
    min_delay_s: float = 1.5
    max_delay_s: float = 4.0
    page_timeout_ms: int = 45_000

    # Browser identity
    locale: str = "en-US"
    timezone_id: str = "Europe/Luxembourg"

    # Persistence
    crm_db_path: Path | None = None  # default: lib/crm_storage.py default

    # Diagnostics
    screenshots_dir: Path = Path("data/mailer_screens")


"""
Load Property Valuation Context for Daily Rental (and other) prompts from the ai_lm_content folder.
Push/pull to a dedicated MongoDB database so this content can be synced independently.

Environment:
- MONGO_URI: same as main app (optional; if not set, push/pull are no-ops or raise).
- MONGO_AI_CONTENT_DB: database name for AI content (default: immosnippy_ai_content).
  This is a distinct "folder" in the database you can push/pull by itself.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

_CONTENT_ROOT = Path(__file__).resolve().parent

# Content IDs → subfolder name under ai_lm_content
_CONTENT_IDS = {
    "property_valuation_daily_rental": "property_valuation_daily_rental",
}

# Default MongoDB database for this content (distinct from coldbot/listings)
AI_CONTENT_DB_NAME = os.getenv("MONGO_AI_CONTENT_DB", "immosnippy_ai_content")
COLLECTION_PROMPTS = "prompts"


def _prompt_path(content_id: str) -> Path:
    if content_id not in _CONTENT_IDS:
        raise ValueError(f"Unknown content_id: {content_id}. Known: {list(_CONTENT_IDS)}")
    return _CONTENT_ROOT / _CONTENT_IDS[content_id] / "system_prompt.txt"


def _schema_path(content_id: str) -> Path:
    if content_id not in _CONTENT_IDS:
        raise ValueError(f"Unknown content_id: {content_id}. Known: {list(_CONTENT_IDS)}")
    return _CONTENT_ROOT / _CONTENT_IDS[content_id] / "output_schema.json"


def get_prompt(content_id: str = "property_valuation_daily_rental") -> str:
    """Load system prompt from the ai_lm_content folder."""
    path = _prompt_path(content_id)
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8").strip()


def get_reference_context(content_id: str = "property_valuation_daily_rental") -> str:
    """
    Load 2026 reference data (business sources + city stats) for the analyst.
    Append this to the system prompt when calling the LLM for Property Valuation Context for Daily Rental.
    Returns empty string if reference files are missing.
    """
    if content_id not in _CONTENT_IDS:
        return ""
    folder = _CONTENT_ROOT / _CONTENT_IDS[content_id]
    parts = []
    for name in ("reference_business_sources_2026.md", "reference_city_stats_2026.md"):
        path = folder / name
        if path.exists():
            parts.append(path.read_text(encoding="utf-8").strip())
    if not parts:
        return ""
    return "\n\n---\n\n".join(parts)


def get_schema_path(content_id: str = "property_valuation_daily_rental") -> Path:
    """Return path to the output JSON schema (for validation or docs)."""
    path = _schema_path(content_id)
    if not path.exists():
        raise FileNotFoundError(f"Schema file not found: {path}")
    return path


def get_schema(content_id: str = "property_valuation_daily_rental") -> Dict[str, Any]:
    """Load output schema as a dict."""
    with open(get_schema_path(content_id), encoding="utf-8") as f:
        return json.load(f)


def _get_ai_content_collection():
    """Get MongoDB collection for AI content (lazy). Uses distinct DB."""
    uri = os.getenv("MONGO_URI")
    if not uri:
        raise RuntimeError("MONGO_URI not set. Set it to push/pull ai_lm_content to MongoDB.")
    try:
        from pymongo import MongoClient
    except ImportError:
        raise RuntimeError("pymongo not installed. Run: pip install pymongo")
    client = MongoClient(uri)
    db = client[AI_CONTENT_DB_NAME]
    return db[COLLECTION_PROMPTS]


def push_to_db(content_id: str = "property_valuation_daily_rental", version: Optional[str] = None) -> Dict[str, Any]:
    """
    Push this folder's prompt and schema to the dedicated AI content database.
    The database (immosnippy_ai_content by default) is distinct so you can
    backup/restore or deploy this content independently.

    Returns:
        {"ok": True, "content_id": "...", "version": "...", "db": "..."}
    """
    prompt_path = _prompt_path(content_id)
    schema_path = _schema_path(content_id)
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")

    prompt_text = prompt_path.read_text(encoding="utf-8").strip()
    schema_doc = json.loads(schema_path.read_text(encoding="utf-8"))

    version = version or "1"
    doc = {
        "content_id": content_id,
        "version": version,
        "system_prompt": prompt_text,
        "output_schema": schema_doc,
    }

    coll = _get_ai_content_collection()
    coll.replace_one(
        {"content_id": content_id},
        doc,
        upsert=True,
    )
    return {
        "ok": True,
        "content_id": content_id,
        "version": version,
        "db": AI_CONTENT_DB_NAME,
        "collection": COLLECTION_PROMPTS,
    }


def pull_from_db(content_id: str = "property_valuation_daily_rental", version: Optional[str] = None) -> Dict[str, Any]:
    """
    Pull prompt and schema from the AI content database into this folder.
    Overwrites local system_prompt.txt and output_schema.json for the content_id.

    If version is None, uses the single document for content_id (latest).

    Returns:
        {"ok": True, "content_id": "...", "version": "...", "path": "..."}
    """
    coll = _get_ai_content_collection()
    query = {"content_id": content_id}
    if version is not None:
        query["version"] = version
    doc = coll.find_one(query)
    if not doc:
        raise LookupError(f"No document in DB for content_id={content_id}" + (f" version={version}" if version else ""))

    folder = _CONTENT_ROOT / _CONTENT_IDS[content_id]
    folder.mkdir(parents=True, exist_ok=True)

    prompt_path = folder / "system_prompt.txt"
    schema_path = folder / "output_schema.json"

    prompt_path.write_text(doc.get("system_prompt", ""), encoding="utf-8")
    schema_path.write_text(json.dumps(doc.get("output_schema", {}), indent=2), encoding="utf-8")

    return {
        "ok": True,
        "content_id": content_id,
        "version": doc.get("version", "?"),
        "path": str(folder),
    }


def list_content_ids() -> list:
    """Return registered content IDs (e.g. property_valuation_daily_rental)."""
    return list(_CONTENT_IDS)

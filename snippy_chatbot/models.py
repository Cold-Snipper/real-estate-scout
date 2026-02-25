from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class ChatRequest(BaseModel):
    session_id: str
    operator_id: int
    message: str


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    valuation_json: Optional[str] = None


class ValuationResult(BaseModel):
    full_json: Dict[str, Any]
    natural_summary: str
    score: int
    recommendation: str

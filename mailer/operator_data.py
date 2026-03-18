from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class OperatorContact:
    first_name: str
    last_name: str
    email: str
    phone: str


def _get_env_contact() -> OperatorContact | None:
    fn = (os.getenv("MAILER_OPERATOR_FIRST_NAME") or "").strip()
    ln = (os.getenv("MAILER_OPERATOR_LAST_NAME") or "").strip()
    email = (os.getenv("MAILER_OPERATOR_EMAIL") or "").strip()
    phone = (os.getenv("MAILER_OPERATOR_PHONE") or "").strip()
    if fn and ln and email and phone:
        return OperatorContact(first_name=fn, last_name=ln, email=email, phone=phone)
    return None


def load_operator_contact(operator_id: int) -> OperatorContact:
    """
    Load operator contact info used for filling contact forms.

    The operator onboarding schema in this repo does not have dedicated first/last/email/phone fields.
    So we support two sources:
    - Environment variables: MAILER_OPERATOR_FIRST_NAME, MAILER_OPERATOR_LAST_NAME, MAILER_OPERATOR_EMAIL, MAILER_OPERATOR_PHONE
    - Optional keys inside operator.agency_context_ext (JSON) if present:
        contact_first_name, contact_last_name, contact_email, contact_phone
    """
    # 1) Prefer explicit env (best for production).
    env = _get_env_contact()
    if env:
        return env

    # 2) Fallback: attempt to read from agency_context_ext (if user stores it there).
    try:
        from operator_onboarding.operators import get_operator
    except Exception as e:
        raise RuntimeError(
            "Operator onboarding not importable; set MAILER_OPERATOR_* env vars. "
            f"Import error: {e}"
        )

    op: dict[str, Any] | None = get_operator(operator_id)
    if not op:
        raise RuntimeError(f"Operator {operator_id} not found; set MAILER_OPERATOR_* env vars.")

    ext = op.get("agency_context_ext") if isinstance(op, dict) else None
    if isinstance(ext, dict):
        fn = (ext.get("contact_first_name") or "").strip()
        ln = (ext.get("contact_last_name") or "").strip()
        email = (ext.get("contact_email") or "").strip()
        phone = (ext.get("contact_phone") or "").strip()
        if fn and ln and email and phone:
            return OperatorContact(first_name=fn, last_name=ln, email=email, phone=phone)

    raise RuntimeError(
        "Missing operator contact details for form fill.\n"
        "Set env vars: MAILER_OPERATOR_FIRST_NAME, MAILER_OPERATOR_LAST_NAME, MAILER_OPERATOR_EMAIL, MAILER_OPERATOR_PHONE\n"
        "Or store them in operator.agency_context_ext as contact_first_name/contact_last_name/contact_email/contact_phone."
    )


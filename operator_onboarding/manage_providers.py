#!/usr/bin/env python3
"""
operator_onboarding/manage_providers.py
CLI for operators (Airbnb agencies). Uses OPERATORS_DB_PATH or PROVIDERS_DB for DB path.

  python manage_providers.py list
  python manage_providers.py add
  python manage_providers.py view <id>
  python manage_providers.py delete <id>
"""
import argparse
import os
import sys
from pathlib import Path

# Ensure OPERATORS_DB_PATH is respected (Step 1 config)
_db_path = os.environ.get("OPERATORS_DB_PATH")
if _db_path and not os.environ.get("PROVIDERS_DB"):
    os.environ["PROVIDERS_DB"] = _db_path

try:
    from .db import init_db, get_db_path
    from .operators import (
        get_all_operators,
        get_operator,
        create_operator,
        update_operator,
        delete_operator,
    )
    from .context_builder import get_provider_context
except ImportError:
    from db import init_db, get_db_path
    from operators import (
        get_all_operators,
        get_operator,
        create_operator,
        update_operator,
        delete_operator,
    )
    from context_builder import get_provider_context

# Same options as UI (Create operator form)
TONE_OPTIONS = [
    ("professional and friendly", "Professional and friendly"),
    ("warm and consultative", "Warm and consultative"),
    ("direct and high-energy", "Direct and high-energy"),
    ("calm and expert", "Calm and expert"),
]
TARGET_OWNER_OPTIONS = [
    ("busy professionals", "Busy professionals"),
    ("investors", "Investors"),
    ("retirees", "Retirees"),
    ("expat landlords", "Expat landlords"),
    ("first-time hosts", "First-time hosts"),
    ("inherited property owners", "Inherited property owners"),
]
PREFERRED_PROPERTY_OPTIONS = [
    ("apartments", "Apartments"),
    ("houses", "Houses"),
    ("villas", "Villas"),
    ("studios", "Studios"),
    ("any", "Any"),
]
FEE_STRUCTURE_OPTIONS = [
    ("20-25% commission", "20–25% commission"),
    ("15-20% commission", "15–20% commission"),
    ("performance-based minimum", "Performance-based minimum"),
    ("flat + percentage", "Flat + percentage"),
]
CALL_BOOKING_OPTIONS = [
    ("Always offer 15-min call first", "Always offer 15-min call first"),
    ("Always offer 30-min discovery call", "Always offer 30-min discovery call"),
    ("Qualify then offer call", "Qualify then offer call"),
    ("Send audit before asking for call", "Send audit before asking for call"),
]
COUNTRY_CODES = ["AT", "BE", "CH", "DE", "ES", "FR", "GR", "IT", "NL", "PT", "UK", "Other"]


def _prompt(text: str, default: str = "") -> str:
    if default:
        s = input(f"{text} [{default}]: ").strip()
        return s if s else default
    return input(f"{text}: ").strip()


def _prompt_choice(text: str, options: list[tuple[str, str]], default_index: int = 0) -> str:
    default_val, default_label = options[default_index]
    for i, (val, label) in enumerate(options, 1):
        print(f"  {i}. {label}")
    try:
        raw = input(f"{text} (1-{len(options)}) [{default_index + 1}]: ").strip()
        idx = int(raw) if raw else (default_index + 1)
        if 1 <= idx <= len(options):
            return options[idx - 1][0]
    except ValueError:
        pass
    return default_val


def _prompt_multi(text: str, choices: list[str]) -> list[str]:
    print(f"{text} (comma-separated codes, e.g. FR,DE,AT). Options: {', '.join(choices)}")
    raw = input("Countries: ").strip()
    if not raw:
        return []
    return [c.strip().upper() for c in raw.split(",") if c.strip()]


def cmd_list() -> None:
    init_db()
    operators = get_all_operators()
    if not operators:
        print("No operators. Use: python manage_providers.py add")
        return
    for o in operators:
        print(f"  {o['id']}: {o.get('company_name', '')}  ({o.get('countries', '') or '-'})")


def cmd_add() -> None:
    init_db()
    print("Add operator (same fields as UI questionnaire)\n")
    company_name = _prompt("Company name *")
    if not company_name:
        print("Company name is required.", file=sys.stderr)
        sys.exit(1)
    website_url = _prompt("Website URL")
    tagline = _prompt("Tagline")
    countries_list = _prompt_multi("Countries", COUNTRY_CODES)
    countries = ", ".join(countries_list) if countries_list else ""

    print()
    tone_style = _prompt_choice("Tone", TONE_OPTIONS)
    ideal_client_profile = _prompt_choice("Target owner type", TARGET_OWNER_OPTIONS)
    preferred_property_types = _prompt_choice("Preferred property type", PREFERRED_PROPERTY_OPTIONS)
    pricing_model = _prompt_choice("Management fee structure", FEE_STRUCTURE_OPTIONS)
    qualification_rules = _prompt_choice("Call booking preference", CALL_BOOKING_OPTIONS)

    print()
    calendly_link = _prompt("Calendly link")
    notes = _prompt("Notes")

    data = {
        "company_name": company_name,
        "website_url": website_url or None,
        "tagline": tagline or None,
        "countries": countries or None,
        "tone_style": tone_style,
        "ideal_client_profile": ideal_client_profile,
        "preferred_property_types": preferred_property_types,
        "pricing_model": pricing_model,
        "qualification_rules": qualification_rules,
        "calendly_link": calendly_link or None,
        "notes": notes or None,
    }
    oid = create_operator(data)
    print(f"Created operator id={oid}")


def cmd_view(operator_id: int) -> None:
    init_db()
    o = get_operator(operator_id)
    if not o:
        print(f"Operator {operator_id} not found.", file=sys.stderr)
        sys.exit(1)
    print("--- Operator ---")
    for k, v in o.items():
        if k == "rules" and isinstance(v, list):
            print(f"  {k}: ({len(v)} rules)")
        else:
            print(f"  {k}: {v}")
    print("\n--- Full LLM context (get_provider_context) ---\n")
    print(get_provider_context(operator_id))


def cmd_delete(operator_id: int) -> None:
    init_db()
    o = get_operator(operator_id)
    if not o:
        print(f"Operator {operator_id} not found.", file=sys.stderr)
        sys.exit(1)
    confirm = input(f"Delete operator {operator_id} ({o.get('company_name', '')})? [y/N]: ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        return
    if delete_operator(operator_id):
        print(f"Deleted operator {operator_id}.")
    else:
        print("Delete failed.", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manage operators (Airbnb agencies). DB: OPERATORS_DB_PATH or PROVIDERS_DB, default operators dir.",
        prog="python manage_providers.py",
    )
    parser.add_argument(
        "--db",
        dest="db_path",
        default=os.environ.get("OPERATORS_DB_PATH") or os.environ.get("PROVIDERS_DB"),
        help="Override DB path (or set OPERATORS_DB_PATH / PROVIDERS_DB)",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List all operators")

    sub.add_parser("add", help="Add operator (questionnaire, same as UI)")

    view_p = sub.add_parser("view", help="View operator and full LLM context")
    view_p.add_argument("id", type=int, help="Operator id")

    del_p = sub.add_parser("delete", help="Delete operator")
    del_p.add_argument("id", type=int, help="Operator id")

    args = parser.parse_args()
    if args.db_path:
        os.environ["PROVIDERS_DB"] = args.db_path

    if args.command == "list":
        cmd_list()
    elif args.command == "add":
        cmd_add()
    elif args.command == "view":
        cmd_view(args.id)
    elif args.command == "delete":
        cmd_delete(args.id)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
operator_onboarding/view_context.py
Integration test / CLI: print the full provider context for an operator (onboarding → DB → context builder → LLM-ready prompt).
DB path: OPERATORS_DB_PATH or PROVIDERS_DB (see db.get_db_path()).
Usage: cd operator_onboarding && python view_context.py <operator_id>
"""
import sys

try:
    from .context_builder import get_provider_context
    from .db import init_db
except ImportError:
    from context_builder import get_provider_context
    from db import init_db


def main() -> None:
    init_db()
    if len(sys.argv) < 2:
        print("Usage: python view_context.py <operator_id>", file=sys.stderr)
        sys.exit(1)
    try:
        operator_id = int(sys.argv[1])
    except ValueError:
        print("operator_id must be an integer", file=sys.stderr)
        sys.exit(1)
    prompt = get_provider_context(operator_id)
    print(prompt)


if __name__ == "__main__":
    main()

from __future__ import annotations

import asyncio
import json

from mailer.integration_tests import run_integration_test


async def main() -> int:
    results = {}
    for t in ("whatsapp", "website", "athome", "immotop"):
        r = await run_integration_test(t)  # type: ignore[arg-type]
        results[t] = r
        print(f"[{t}] ok={r['success']} title={r['title']!r} url={r['url']}", flush=True)
        if not r["success"]:
            print(f"  -> {r['message']}", flush=True)
    print(json.dumps(results, indent=2, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))


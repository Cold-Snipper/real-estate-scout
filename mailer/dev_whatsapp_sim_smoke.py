from __future__ import annotations

"""
Smoke test for WhatsApp automation without real WhatsApp Web.

This script simulates WhatsApp Web by intercepting requests to:
- https://web.whatsapp.com/
- https://wa.me/*

and fulfilling them with a small HTML page that contains the selectors our automation expects.

Run:
  python3 mailer/dev_whatsapp_sim_smoke.py
"""

import asyncio
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

# Allow running as a plain file: `python mailer/dev_whatsapp_sim_smoke.py`
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from mailer.whatsapp_automation import (
    ensure_logged_in,
    send_message,
    send_message_to_group,
    create_group,
    add_to_group,
)


WHATSAPP_FAKE_HTML = """
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>WhatsApp</title>
    <style>
      body { font-family: sans-serif; padding: 12px; }
      header { padding: 8px; border: 1px solid #ddd; margin-bottom: 10px; }
      .row { padding: 6px; border: 1px dashed #ddd; margin: 6px 0; }
      .toolbar { display: flex; gap: 10px; align-items: center; }
      .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid #aaa; cursor: pointer; }
      .textbox { border: 1px solid #aaa; padding: 8px; min-height: 24px; }
      .send { border: 1px solid #0a0; padding: 6px 10px; cursor: pointer; display: inline-block; }
    </style>
  </head>
  <body>
    <header>Fake WhatsApp Web</header>

    <div class="toolbar">
      <span class="btn" data-icon="chat">New chat</span>
      <span class="btn">New group</span>
      <span class="btn">Add participant</span>
      <span class="btn">Create</span>
      <span class="btn" data-icon="arrow-forward">Next</span>
      <span class="btn" data-icon="checkmark">✓</span>
    </div>

    <div class="row">
      <div contenteditable="true" role="textbox" aria-label="Search input textbox" data-tab="3" class="textbox">
        Search box
      </div>
    </div>

    <div class="row">
      <div contenteditable="true" role="textbox" data-tab="10" class="textbox">
        Message input
      </div>
      <button class="send" aria-label="Send"><span data-icon="send">send</span></button>
    </div>

    <script>
      // Minimal behavior: pressing Enter in search shouldn't reload page.
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });
    </script>
  </body>
</html>
"""


async def main() -> int:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        async def handler(route, request):
            u = request.url
            host = urlparse(u).netloc
            if host in ("web.whatsapp.com", "wa.me"):
                await route.fulfill(status=200, content_type="text/html", body=WHATSAPP_FAKE_HTML)
                return
            await route.fulfill(status=200, content_type="text/html", body=WHATSAPP_FAKE_HTML)

        await context.route("**/*", handler)
        page = await context.new_page()

        # 1) ensure_logged_in
        await ensure_logged_in(page, timeout_ms=5_000)
        print("OK ensure_logged_in")

        # 2) send_message (1:1)
        ok = await send_message(context, "352661123456", "Hello from simulated WA", delay_between_chars=True, timeout_ms=5_000)
        print("OK send_message:", ok)

        # 3) send_message_to_group
        okg = await send_message_to_group(context, "My Group", "Hello group", timeout_ms=5_000)
        print("OK send_message_to_group:", okg)

        # 4) create_group + add_to_group (best-effort)
        created = await create_group(context, ["352661000001", "352661000002"], "Test Group", timeout_ms=5_000)
        print("OK create_group:", created)
        added = await add_to_group(context, "Test Group", ["352661000003"], timeout_ms=5_000)
        print("OK add_to_group:", added)

        await context.close()
        await browser.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))


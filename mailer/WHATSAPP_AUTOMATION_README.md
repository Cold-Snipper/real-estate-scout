# WhatsApp Web Automation (Playwright, 2026)

This folder contains `mailer/whatsapp_automation.py`, a production-oriented WhatsApp Web automation helper.

## Legal / compliance disclaimer

- Only use with accounts you own/control.
- Only message contacts you’re legally allowed to contact.
- Keep volumes low and human-like. Avoid unsolicited bulk outreach.
- WhatsApp actively detects automation; any automation can be fragile over time.

## Recommended session strategy (permanent login)

Use a **persistent Chromium profile** directory (best for “stay logged in”):

- Create a folder (example): `data/whatsapp_profile/`
- Run the mailer’s login initializer:

```bash
python3 -m mailer --whatsapp-login --whatsapp-profile-dir data/whatsapp_profile --headed
```

Scan the QR once. After that, your bot reuses the same profile and stays logged in until WhatsApp invalidates the session.

## Using `whatsapp_automation.py` directly

```bash
python3 -m mailer.whatsapp_automation
```

Adjust the `demo_cli()` phone number/message inside the file for testing.

## Storage state JSON (legacy)

`storage_state.json` can work, but persistent profiles are typically more durable for long-running bots.

## Integration with Mailer

Your mailer supports WhatsApp Web sending:

```bash
python3 -m mailer --operator-id 1 --limit 5 --whatsapp-web-send --whatsapp-profile-dir data/whatsapp_profile --headed
```


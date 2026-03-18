"""
operator_onboarding/mailer_router.py

Mounts the mailer FastAPI router into the main Operator Onboarding API.

We reuse the router that ships with the mailer module (`mailer.api.router`)
so there is a single implementation of:
- /api/mailer/properties
- /api/mailer/run
- /api/mailer/status
"""

from mailer.api import router


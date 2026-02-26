# B2C Environment Setup

## MongoDB (user data persistence)

Set `MONGO_URI` in your environment to persist B2C user data (profile, filters, controls) to MongoDB. Uses the same database as the B2B backend.

```bash
MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
MONGO_DB_NAME="coldbot"  # optional, default coldbot
```

When unset, data falls back to in-memory storage (per-request only; no persistence).

## AWS-hosted Ollama (reasoning)

Set `OLLAMA_API_URL` to enable LLM-backed features:

- **Draft messages**: Bot messages drafted via Ollama (user tone, contact goal)
- **Interpret context**: Voice/text preferences parsed into structured fields
- **Rank listings**: Semantic ranking (when wired to feed)

```bash
OLLAMA_API_URL="https://your-ollama.aws.example.com"
```

The plug expects the standard Ollama HTTP API (`/api/chat`). When unset, falls back to template messages and no interpretation.

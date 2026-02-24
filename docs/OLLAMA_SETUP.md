i cant # Ollama setup (local LLM for chatbot / bot)

Ollama is installed and ready for developing the IMMO SNIPPY chatbot and bot flows.

## Where it’s installed

| What | Location |
|------|----------|
| **App** | `/Applications/Ollama.app` |
| **CLI** | `~/bin/ollama` (symlink); `~/bin` added to PATH in `.zshrc` |
| **Models** | `~/.ollama` (default; in your home directory) |

**CLI in new shells:** Open a new terminal or run `source ~/.zshrc` so `ollama` is on your PATH.

## Server

- **Option A:** Open **Ollama** from Applications (menu bar icon; server runs in background).
- **Option B:** In terminal: `ollama serve` (e.g. in a dedicated terminal or background).

The bot and any chatbot code that use the `ollama` Python package need the server running.

## Model for chatbot / bot

- **Pulled:** `llama3.2:3b` (about 2 GB).
- **Use in code:** Set `model="llama3.2:3b"` where you call the LLM (e.g. in `bot/llm.py` or config).

Useful commands:

```bash
ollama list                  # list pulled models
ollama run llama3.2:3b       # interactive chat
ollama pull llama3.2         # default size; pull others as needed
```

## How the project uses it

- **Context injection:** `operator_onboarding/llm_integration.py` → `get_system_prompt_for_operator(operator_id)`.
- **Bot:** `bot/llm.py` uses `ollama.chat()` with a system prompt (and optional provider context). Use `get_provider_context(operator_id)` or `get_system_prompt_for_operator(operator_id)` as the system message when generating replies.

To use Llama for the chatbot, point your model name to `llama3.2:3b` (or another Ollama model you pull) and ensure the Ollama server is running.

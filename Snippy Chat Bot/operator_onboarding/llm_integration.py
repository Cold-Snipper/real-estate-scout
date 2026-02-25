"""
operator_onboarding/llm_integration.py
LLM plug point: use the returned system prompt before generating messages with Ollama (or any LLM).

INJECTION POINT (when building the message-generation flow):
  Before calling ollama.chat() / your LLM to generate a reply to a lead:
  1. Resolve the active operator_id (e.g. from campaign config, lead assignment, or default).
  2. Call get_system_prompt_for_operator(operator_id) below.
  3. Pass the returned string as the "system" message (or prepend to the system prompt).
  4. Then send the conversation history + user message and get the model reply.

This ensures the bot has full context: static Airbnb model + EU tax + agency specifics + rules + documents.
"""

try:
    from .context_builder import get_provider_context
except ImportError:
    from context_builder import get_provider_context


def get_system_prompt_for_operator(operator_id: int, include_eu_str_tax: bool = True) -> str:
    """
    Return the full system prompt for the LLM when generating messages as this operator.
    INJECTION POINT: Use this as the system prompt before generating any message to a lead.

    Example (pseudo-code for your bot):
      system_prompt = get_system_prompt_for_operator(active_operator_id)
      response = ollama.chat(
          model="...",
          messages=[
              {"role": "system", "content": system_prompt},
              {"role": "user", "content": last_message_from_lead},
          ],
      )
    """
    return get_provider_context(operator_id, include_eu_str_tax=include_eu_str_tax)

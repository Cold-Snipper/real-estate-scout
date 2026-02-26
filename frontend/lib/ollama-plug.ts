/**
 * AWS-hosted Ollama reasoning plug.
 * Set OLLAMA_API_URL (e.g. https://your-ollama.aws.example.com) to enable.
 * When unset, returns stub/no-op results.
 */

const OLLAMA_URL = process.env.OLLAMA_API_URL ?? ""

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export async function ollamaChat(
  messages: OllamaChatMessage[],
  model = "llama3.2",
  options?: { format?: "json"; temperature?: number }
): Promise<string> {
  if (!OLLAMA_URL) return ""
  try {
    const res = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: options?.format ?? undefined,
        options: options?.temperature != null ? { temperature: options.temperature } : undefined,
      }),
    })
    if (!res.ok) throw new Error(`Ollama ${res.status}`)
    const data = (await res.json()) as { message?: { content?: string } }
    return data.message?.content ?? ""
  } catch (e) {
    console.error("[ollama-plug] Chat failed:", e)
    return ""
  }
}

/** Interpret voice/text context into structured location + vibe preferences. For ranking. */
export async function interpretVoiceContext(text: string): Promise<{
  communes?: string[]
  locationHint?: string
  vibeKeywords?: string[]
  budgetFlexible?: boolean
}> {
  if (!OLLAMA_URL || !text.trim()) return {}
  const content = await ollamaChat(
    [
      {
        role: "system",
        content:
          "You are a real estate preference parser. Output JSON only. Extract from the user's description: communes (Luxembourg place names), locationHint (free text area), vibeKeywords (e.g. quiet, modern, character), budgetFlexible (true if they say flexible on budget).",
      },
      { role: "user", content: `Parse: "${text}"` },
    ],
    "llama3.2",
    { format: "json" }
  )
  try {
    return JSON.parse(content) as { communes?: string[]; locationHint?: string; vibeKeywords?: string[]; budgetFlexible?: boolean }
  } catch {
    return {}
  }
}

/** Rank listings by semantic similarity to user preferences. Returns ordering. */
export async function rankListingsWithOllama(
  listingSummaries: { id: string; address: string; description?: string }[],
  userContext: string
): Promise<string[]> {
  if (!OLLAMA_URL || listingSummaries.length === 0 || !userContext.trim()) {
    return listingSummaries.map((l) => l.id)
  }
  const content = await ollamaChat(
    [
      {
        role: "system",
        content:
          "You rank real estate listings by match to user preferences. Output JSON array of listing ids in order of best-to-worst match. Only include ids from the list.",
      },
      {
        role: "user",
        content: `User: "${userContext}"\nListings:\n${listingSummaries.map((l) => `${l.id}: ${l.address} - ${l.description ?? ""}`).join("\n")}\nOutput: ["id1","id2",...]`,
      },
    ],
    "llama3.2",
    { format: "json" }
  )
  try {
    const ids = JSON.parse(content) as string[]
    return Array.isArray(ids) ? ids : listingSummaries.map((l) => l.id)
  } catch {
    return listingSummaries.map((l) => l.id)
  }
}

/** Draft bot message for contacting agent. Uses user tone + contact goal. */
export async function draftBotMessageWithOllama(
  listingAddress: string,
  userProfile: { name?: string; tone?: string },
  contactGoal: "book_call" | "book_viewing" | "request_info"
): Promise<string> {
  if (!OLLAMA_URL) return ""
  const goalText =
    contactGoal === "book_call"
      ? "schedule a call to discuss"
      : contactGoal === "book_viewing"
        ? "arrange a viewing"
        : "get more information"
  const content = await ollamaChat(
    [
      {
        role: "system",
        content:
          "Write a short, polite WhatsApp message (2-4 sentences) for a tenant/buyer to contact a real estate agent. Professional, friendly. Include the address and the request. No JSON.",
      },
      {
        role: "user",
        content: `Property: ${listingAddress}. Goal: ${goalText}. ${userProfile.name ? `Sign as ${userProfile.name}. ` : ""}${userProfile.tone ? `Tone: ${userProfile.tone}` : ""}`,
      },
    ],
    "llama3.2"
  )
  return content.trim() || ""
}

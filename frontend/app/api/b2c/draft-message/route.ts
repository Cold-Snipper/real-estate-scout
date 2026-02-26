/**
 * Draft bot message for contacting agent.
 * Uses AWS-hosted Ollama when OLLAMA_API_URL set; else returns template.
 */

import { NextResponse } from "next/server"
import { draftBotMessageWithOllama } from "@/lib/ollama-plug"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { listingId, listingAddress, contactGoal, userProfile } = body as {
      listingId?: string
      listingAddress?: string
      contactGoal?: "book_call" | "book_viewing" | "request_info"
      userProfile?: { name?: string; tone?: string }
    }
    const address = listingAddress ?? "this property"
    const goal = contactGoal ?? "book_viewing"

    const ollamaMessage = await draftBotMessageWithOllama(
      address,
      userProfile ?? {},
      goal
    )

    if (ollamaMessage) {
      return NextResponse.json({ message: ollamaMessage })
    }

    const goalPhrase =
      goal === "book_call"
        ? "schedule a call to discuss"
        : goal === "book_viewing"
          ? "arrange a viewing"
          : "get more information"
    const fallback = `Hi, I'm interested in ${address} and would like to ${goalPhrase}. Could you let me know availability and next steps?`
    return NextResponse.json({ message: fallback })
  } catch (e) {
    console.error("[b2c/draft-message POST]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

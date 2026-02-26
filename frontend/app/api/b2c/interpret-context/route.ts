/**
 * Interpret voice/text context into structured preferences.
 * Uses AWS-hosted Ollama when OLLAMA_API_URL set.
 */

import { NextResponse } from "next/server"
import { interpretVoiceContext } from "@/lib/ollama-plug"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const text = (body.text ?? body.voiceContext ?? "").trim()
    const result = await interpretVoiceContext(text)
    return NextResponse.json(result)
  } catch (e) {
    console.error("[b2c/interpret-context POST]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

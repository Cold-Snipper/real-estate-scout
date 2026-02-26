import { NextRequest } from "next/server"
import redis, { STREAM_NAME } from "@/lib/redis"

// GET /api/listings/stream
// Server-Sent Events endpoint — reads from Redis Stream and pushes events to client
export async function GET(request: NextRequest) {
  const lastEventId = request.headers.get("last-event-id") ?? "$"

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let cursor = lastEventId === "$" ? "$" : lastEventId

      const send = (data: string, id?: string) => {
        let msg = ""
        if (id) msg += `id: ${id}\n`
        msg += `data: ${data}\n\n`
        controller.enqueue(encoder.encode(msg))
      }

      // Send a keepalive comment immediately
      controller.enqueue(encoder.encode(": connected\n\n"))

      const cleanup = () => {
        try { controller.close() } catch { /* already closed */ }
      }

      request.signal.addEventListener("abort", cleanup)

      try {
        while (!request.signal.aborted) {
          // XREAD with 5s block timeout so we can check abort signal
          const results = await redis.xread(
            "COUNT", 10,
            "BLOCK", 5000,
            "STREAMS", STREAM_NAME,
            cursor
          ) as Array<[string, Array<[string, string[]]>]> | null

          if (!results) {
            // Timeout — send keepalive
            controller.enqueue(encoder.encode(": keepalive\n\n"))
            continue
          }

          for (const [, messages] of results) {
            for (const [msgId, fields] of messages) {
              // Convert flat field array to object
              const event: Record<string, unknown> = {}
              for (let i = 0; i < fields.length; i += 2) {
                const key = fields[i]
                const val = fields[i + 1]
                try { event[key] = JSON.parse(val) } catch { event[key] = val }
              }
              send(JSON.stringify(event), msgId)
              cursor = msgId
            }
          }
        }
      } catch (err) {
        if (!request.signal.aborted) {
          console.error("[SSE stream]", err)
        }
      } finally {
        cleanup()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

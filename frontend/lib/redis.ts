import Redis from "ioredis"

// Server-only — never imported in client components
declare global {
  // eslint-disable-next-line no-var
  var _redisClient: Redis | undefined
}

function createRedisClient() {
  const client = new Redis({
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT ?? "6379"),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME ?? "default",
    lazyConnect: true,
  })

  client.on("error", (err) => {
    console.error("[Redis] connection error:", err)
  })

  return client
}

let redis: Redis

if (process.env.NODE_ENV === "development") {
  if (!global._redisClient) {
    global._redisClient = createRedisClient()
  }
  redis = global._redisClient
} else {
  redis = createRedisClient()
}

export default redis

export const STREAM_NAME =
  process.env.STREAM_NAME ?? process.env.REDIS_STREAM ?? "listing:events"

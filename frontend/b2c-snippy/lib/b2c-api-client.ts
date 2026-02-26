/**
 * B2C API client — syncs profile, controls, filters with MongoDB via /api/b2c/user.
 */

export const USER_ID_KEY = "b2c_user_id"

export function getB2CUserId(): string {
  if (typeof window === "undefined") return "anonymous"
  let id = sessionStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = `b2c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

async function fetchWithUserId(method: string, body?: object) {
  const userId = getB2CUserId()
  const res = await fetch("/api/b2c/user", {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-b2c-user-id": userId,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export async function loadB2CUser() {
  try {
    return await fetchWithUserId("GET")
  } catch {
    return { profile: null, filters: null, voiceContext: "", controls: null }
  }
}

export async function saveB2CUser(update: {
  profile?: object
  filters?: object
  voiceContext?: string
  controls?: object
}) {
  return fetchWithUserId("POST", update)
}

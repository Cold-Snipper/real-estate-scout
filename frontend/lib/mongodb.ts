/**
 * MongoDB client for Next.js API routes.
 * Uses MONGO_URI from env (same as backend). Falls back gracefully when unset.
 */

import { MongoClient, Db } from "mongodb"

const uri = process.env.MONGO_URI
let _client: MongoClient | null = null
let _db: Db | null = null

export async function getMongoDb(): Promise<Db | null> {
  if (!uri) return null
  if (_db) return _db
  try {
    _client = new MongoClient(uri)
    await _client.connect()
    _db = _client.db(process.env.MONGO_DB_NAME ?? "coldbot")
    return _db
  } catch (e) {
    console.error("[mongodb] Connection failed:", e)
    return null
  }
}

export async function getB2CCollection() {
  const db = await getMongoDb()
  return db?.collection("b2c_users") ?? null
}

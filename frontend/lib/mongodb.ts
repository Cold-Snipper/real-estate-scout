import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGO_DB ?? process.env.MONGODB_DB ?? "realestate"

if (!uri) {
  throw new Error("MONGODB_URI environment variable is not set")
}

// Reuse connection across Next.js hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined
}

let client: MongoClient

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri)
  }
  client = global._mongoClient
} else {
  client = new MongoClient(uri)
}

export async function getDb() {
  await client.connect()
  return client.db(dbName)
}

export async function getListingsCollection() {
  const db = await getDb()
  return db.collection("listings")
}

#!/usr/bin/env node
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.DB_NAME || 'test'

if (!uri) {
  console.error('Missing MONGODB_URI env var. Example:')
  console.error('  export MONGODB_URI="mongodb://localhost:27017"')
  process.exit(1)
}

console.log('Connecting to', uri.replace(/:\/\/.+@/, '://****@'), 'db =', dbName)

try {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
  await client.connect()
  const db = client.db(dbName)
  const ping = await db.command({ ping: 1 })
  console.log('Ping result:', ping)
  const buildInfo = await db.admin().command({ buildInfo: 1 })
  console.log('Server version:', buildInfo.version)
  await client.close()
  console.log('OK: MongoDB connection works.')
  process.exit(0)
} catch (err) {
  console.error('FAILED to connect to MongoDB:')
  if (err && err.message) console.error(err.message)
  // Common hints
  console.error('\nHints:')
  console.error('- Is mongod running / cluster reachable?')
  console.error('- Check IP allowlist (Atlas) and credentials (username/password).')
  console.error('- If password has special characters, URL-encode it.')
  console.error('- For mongodb+srv, ensure DNS works and TLS is allowed.')
  process.exit(2)
}

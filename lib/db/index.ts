import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set')
}

// Create the connection
const connectionString = process.env.POSTGRES_URL
const client = postgres(connectionString)
export const db = drizzle(client, { schema }) 
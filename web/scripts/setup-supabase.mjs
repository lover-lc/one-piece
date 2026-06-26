#!/usr/bin/env node
/**
 * Apply initial migration to Supabase Postgres.
 * Usage: npm run db:migrate  (reads SUPABASE_DB_PASSWORD from .env.local)
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const PROJECT_REF = 'liedowqqnzrklygdaqkw'
const password = process.env.SUPABASE_DB_PASSWORD

if (!password) {
  console.error('Set SUPABASE_DB_PASSWORD (Dashboard → Settings → Database)')
  process.exit(1)
}

const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${PROJECT_REF}.supabase.co:5432/postgres`

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '../supabase/migrations')
const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log('Connected to Supabase Postgres')
  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    console.log(`Applying ${file}...`)
    await client.query(sql)
  }
  console.log('All migrations applied successfully')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await client.end()
}

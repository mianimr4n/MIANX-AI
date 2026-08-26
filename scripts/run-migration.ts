// One-time migration runner — applies Prisma migration SQL directly via pg
// Bypasses Prisma schema engine to avoid Supavisor prepared statement issues

import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const DB_URL = process.argv[2]
if (!DB_URL) {
  console.error('Usage: bun run scripts/run-migration.ts <DATABASE_URL>')
  process.exit(1)
}

// Strip query params for pg client
const baseUrl = DB_URL.replace(/\?.*$/, '')

async function run() {
  const client = new Client({ connectionString: baseUrl })

  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL')

    // Read migration SQL
    const sqlPath = join(import.meta.dir, '..', 'prisma', 'migrations', '20260821000000_init', 'migration.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    console.log(`📄 Migration SQL: ${sql.length} chars, ${sql.split('\n').length} lines`)

    // Execute migration
    console.log('⏳ Applying migration...')
    await client.query(sql)
    console.log('✅ Migration applied successfully')

    // Create _prisma_migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                      VARCHAR(36)  NOT NULL PRIMARY KEY,
        "checksum"                VARCHAR(64)  NOT NULL,
        "finished_at"             TIMESTAMPTZ  NOT NULL,
        "migration_name"          VARCHAR(255) NOT NULL,
        "logs"                    TEXT,
        "rolled_back_at"           TIMESTAMPTZ,
        "started_at"              TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "applied_steps_count"     INTEGER      NOT NULL DEFAULT 0
      )
    `)
    console.log('✅ _prisma_migrations table ensured')

    // Record the migration
    const migrationName = '20260821000000_init'
    const check = await client.query(
      'SELECT id FROM "_prisma_migrations" WHERE "migration_name" = $1',
      [migrationName]
    )
    if (check.rows.length === 0) {
      // Compute checksum of the SQL file
      const crypto = await import('crypto')
      const checksum = crypto.createHash('sha256').update(sql).digest('hex')
      await client.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
         VALUES ($1, $2, now(), $3, now(), 1)`,
        [crypto.randomUUID(), checksum, migrationName]
      )
      console.log('✅ Migration recorded in _prisma_migrations')
    } else {
      console.log('ℹ️  Migration already recorded')
    }

    // Verify table count
    const tables = await client.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations'"
    )
    console.log(`📊 Tables created: ${tables.rows[0].count}`)

    // Verify enum count
    const enums = await client.query(
      "SELECT COUNT(*) as count FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e'"
    )
    console.log(`📊 Enums created: ${enums.rows[0].count}`)

  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()

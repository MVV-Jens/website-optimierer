// Lightweight migration runner – uses @libsql/client directly.
// Replaces `prisma migrate deploy` which requires the full prisma CLI + many deps.
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const url = process.env.DATABASE_URL ?? "file:/tmp/db.sqlite";
const db = createClient({ url });

// Ensure migrations tracking table exists
await db.execute(`
  CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id                TEXT PRIMARY KEY,
    checksum          TEXT NOT NULL,
    finished_at       DATETIME,
    migration_name    TEXT NOT NULL,
    logs              TEXT,
    rolled_back_at    DATETIME,
    started_at        DATETIME NOT NULL DEFAULT current_timestamp,
    applied_steps_count INT NOT NULL DEFAULT 0
  )
`);

const migrationsDir = "./prisma/migrations";
if (!existsSync(migrationsDir)) {
  console.log("No migrations directory found, skipping.");
  await db.close();
  process.exit(0);
}

const migrationFolders = readdirSync(migrationsDir)
  .filter((name) => !name.startsWith(".") && name !== "migration_lock.toml")
  .sort();

for (const folder of migrationFolders) {
  const sqlPath = join(migrationsDir, folder, "migration.sql");
  if (!existsSync(sqlPath)) continue;

  // Check if already applied
  const existing = await db.execute({
    sql: "SELECT id FROM _prisma_migrations WHERE migration_name = ?",
    args: [folder],
  });
  if (existing.rows.length > 0) {
    console.log(`  ✓ ${folder} (bereits angewendet)`);
    continue;
  }

  const sql = readFileSync(sqlPath, "utf-8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`  → ${folder}`);
  for (const stmt of statements) {
    await db.execute(stmt + ";");
  }

  await db.execute({
    sql: `INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count)
          VALUES (?, ?, ?, datetime('now'), ?)`,
    args: [
      crypto.randomUUID(),
      folder, // simplified checksum
      folder,
      statements.length,
    ],
  });
}

await db.close();
console.log("  ✓ Migrationen abgeschlossen.");

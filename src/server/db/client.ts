import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { env } from "../env";
import { migrations } from "./schema";

/**
 * Base persistante : libSQL.
 * - En local : fichier SQLite (DATABASE_URL=file:./data/store.db).
 * - En production serverless : base libSQL/Turso distante (DATABASE_URL=libsql://…
 *   + DATABASE_AUTH_TOKEN), car le disque d'une fonction serverless n'est pas persistant.
 */
let client: Client | null = null;
let ready: Promise<void> | null = null;

function createDbClient(): Client {
  const url = env.databaseUrl();
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length);
    if (filePath && filePath !== ":memory:") mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }
  return createClient({ url, authToken: env.databaseAuthToken() });
}

async function migrate(db: Client): Promise<void> {
  await db.execute("PRAGMA foreign_keys = ON");
  if (env.databaseUrl().startsWith("file:")) {
    await db.execute("PRAGMA journal_mode = WAL");
    await db.execute("PRAGMA busy_timeout = 5000");
  }
  await db.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const applied = await db.execute("SELECT version FROM schema_migrations");
  const done = new Set(applied.rows.map((r) => Number(r.version)));
  for (const m of migrations) {
    if (done.has(m.version)) continue;
    await db.batch(
      [
        ...m.statements,
        {
          sql: "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
          args: [m.version, new Date().toISOString()],
        },
      ],
      "write",
    );
  }
}

export async function getDb(): Promise<Client> {
  if (!client) client = createDbClient();
  if (!ready) {
    ready = migrate(client).catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
  return client;
}

/** Tests uniquement : ferme la connexion pour repartir d'une base neuve. */
export function resetDbForTests(): void {
  client?.close();
  client = null;
  ready = null;
}

function isBusy(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === "SQLITE_BUSY" || /database is locked|SQLITE_BUSY/i.test(String(e?.message ?? ""));
}

/** Réessaie une opération d'écriture si la base est momentanément verrouillée (écritures concurrentes). */
export async function withBusyRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!isBusy(err) || i >= attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 40 * 2 ** i + Math.random() * 40));
    }
  }
}

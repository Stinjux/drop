import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

/** Base SQLite neuve par fichier de test. */
export function setupTempDatabase(name: string): string {
  const dir = path.resolve(__dirname, "../.tmp");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}-${process.pid}-${Date.now()}.db`);
  for (const suffix of ["", "-wal", "-shm"]) rmSync(file + suffix, { force: true });
  process.env.DATABASE_URL = `file:${file}`;
  return file;
}

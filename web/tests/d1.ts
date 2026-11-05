// Minimal D1 stand-in backed by node:sqlite, enough for API tests.
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

class Stmt {
  constructor(private db: DatabaseSync, private sql: string, private args: unknown[] = []) {}
  bind(...args: unknown[]) { return new Stmt(this.db, this.sql, args); }
  private exec() {
    const s = this.db.prepare(this.sql);
    const args = this.args as (string | number | null)[];
    return /^\s*(SELECT|WITH)/i.test(this.sql) ? { results: s.all(...args), changes: 0 } : { results: [], changes: Number(s.run(...args).changes) };
  }
  async all() { const r = this.exec(); return { results: r.results, success: true, meta: { changes: r.changes } }; }
  async first() { return (this.exec().results[0] as unknown) ?? null; }
  async run() { const r = this.exec(); return { results: [], success: true, meta: { changes: r.changes } }; }
}

export function testD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  for (const f of readdirSync("migrations").sort()) db.exec(readFileSync(`migrations/${f}`, "utf8"));
  return {
    prepare: (sql: string) => new Stmt(db, sql),
    batch: async (stmts: Stmt[]) => { db.exec("BEGIN"); try { const out = []; for (const s of stmts) out.push(await s.all()); db.exec("COMMIT"); return out; } catch (e) { db.exec("ROLLBACK"); throw e; } },
  } as unknown as D1Database;
}

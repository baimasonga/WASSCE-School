import { Hono, type Context } from "hono";
import type { JWTVerifyGetKey } from "jose";
import { CORE_PACK_ID, coreQuestions, corePack } from "../shared/bank";
import { gradedQuestions, summarize, type Session } from "../shared/insights";
import { namespacePack, validatePack, type Pack, type Question } from "../shared/questions";
import { adminList, supabaseKeys, verifyUser, type User } from "./auth";

export type Env = { DB: D1Database; ASSETS?: Fetcher; SUPABASE_URL: string; ADMIN_EMAILS?: string };
type Vars = { user: User | null; admin: boolean };
type C = Context<{ Bindings: Env; Variables: Vars }>;

const MAX_BODY = 800_000;
const COUNTRIES = new Set(["SL", "LR", "GM"]);
const TOKEN = /^[A-Za-z0-9-]{8,64}$/;
const QUESTION_ID = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,200}$/;
const ANSWERS = new Set(["A", "B", "C", "D", ""]);

class HttpError extends Error { constructor(public status: 400 | 401 | 403 | 404 | 413, message: string) { super(message); } }

/** Reads a JSON body, refusing anything over `limit` bytes. */
async function readJson<T>(c: C, limit = 64_000): Promise<T> {
  const length = Number(c.req.header("content-length") ?? 0);
  if (length > limit) throw new HttpError(413, "Request too large.");
  const text = await c.req.text();
  if (new TextEncoder().encode(text).length > limit) throw new HttpError(413, "Request too large.");
  try { return JSON.parse(text) as T; } catch { throw new HttpError(400, "Invalid JSON."); }
}

type PackRow = { id: string; title: string; version: string; subject_id: string; question_count: number; content: string; status: string; updated_at: number };

/** Published packs, cached briefly per isolate so grading doesn't re-read D1 on every request. */
let publishedCache: { at: number; packs: Pack[] } | null = null;
async function publishedPacks(db: D1Database): Promise<Pack[]> {
  if (publishedCache && Date.now() - publishedCache.at < 30_000) return publishedCache.packs;
  const { results } = await db.prepare("SELECT content FROM packs WHERE status = 'published' ORDER BY id").all<{ content: string }>();
  const packs = results.map(r => JSON.parse(r.content) as Pack);
  publishedCache = { at: Date.now(), packs };
  return packs;
}
const coreById = new Map(coreQuestions.map(q => [q.id, q]));
async function questionIndex(db: D1Database): Promise<Map<string, Question>> {
  const map = new Map(coreById);
  for (const p of await publishedPacks(db)) for (const q of namespacePack(p)) map.set(q.id, q);
  return map;
}
const packInfo = (p: Pack) => ({
  id: p.pack_id, title: p.title, version: p.version, subject_id: p.subject_id ?? "mathematics",
  countries: p.countries ?? ["SL", "LR", "GM"], exam_year: p.exam_year ?? null, exam_series: p.exam_series ?? "both", count: p.questions.length,
});

type AttemptIn = { key: string; questionId: string; answer: string; createdAt?: number };
function attemptRows(user: User, list: AttemptIn[], index: Map<string, Question>, country: string | null, examYear: number | null) {
  const now = Date.now();
  return list.map(a => {
    const q = typeof a?.questionId === "string" ? index.get(a.questionId) : undefined;
    const [token, ...rest] = typeof a?.key === "string" ? a.key.split("/") : [];
    if (!q || !TOKEN.test(token ?? "") || rest.join("/") !== q.id || !ANSWERS.has(a.answer)) throw new HttpError(400, "Invalid answer submission.");
    const at = Number.isFinite(a.createdAt) ? Math.min(now, Math.max(now - 365 * 86_400_000, Number(a.createdAt))) : now;
    return [user.id, a.key, q.id, q.subject_id ?? "mathematics", q.section, q.topic, a.answer, a.answer === q.correct_option ? 1 : 0, country, examYear, at] as const;
  });
}
const INSERT_ATTEMPT = "INSERT OR IGNORE INTO attempts (user_id, attempt_key, question_id, subject_id, section, topic, answer, correct, country, exam_year, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
const profile = (country: unknown, examYear: unknown) => ({
  country: typeof country === "string" && COUNTRIES.has(country) ? country : null,
  examYear: Number.isInteger(examYear) && (examYear as number) >= 2000 && (examYear as number) <= 2100 ? (examYear as number) : null,
});

export function createApp(options: { getKey?: JWTVerifyGetKey } = {}) {
  const app = new Hono<{ Bindings: Env; Variables: Vars }>().basePath("/api");

  app.use("*", async (c, next) => {
    const user = await verifyUser(c.req.header("authorization"), c.env.SUPABASE_URL, options.getKey ?? supabaseKeys(c.env.SUPABASE_URL));
    c.set("user", user);
    c.set("admin", !!user && adminList(c.env.ADMIN_EMAILS).has(user.email));
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
  });
  const requireUser = (c: C) => { const u = c.get("user"); if (!u) throw new HttpError(401, "Sign in to save your progress."); return u; };
  const requireAdmin = (c: C) => { const u = requireUser(c); if (!c.get("admin")) throw new HttpError(403, "Publishing access is required."); return u; };

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "Something went wrong. Please try again." }, 500);
  });
  app.notFound(c => c.json({ error: "Not found." }, 404));

  app.get("/health", c => c.json({ ok: true }));

  /** Published packs and their questions (the core bank ships with the web app itself). */
  app.get("/catalog", async c => {
    const packs = await publishedPacks(c.env.DB);
    c.header("Cache-Control", "public, max-age=60");
    return c.json({ packs: [packInfo(corePack), ...packs.map(packInfo)], questions: packs.flatMap(namespacePack) });
  });

  /** Android-compatible pack download. */
  app.get("/packs/:file", async c => {
    const id = c.req.param("file").replace(/\.json$/, "");
    const pack = id === CORE_PACK_ID ? corePack : (await publishedPacks(c.env.DB)).find(p => p.pack_id === id);
    if (!pack) throw new HttpError(404, "Pack not found.");
    return new Response(JSON.stringify(pack), { headers: {
      "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${pack.pack_id}.json"`,
      "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
  });

  app.get("/me", c => { const u = c.get("user"); return c.json({ user: u, admin: c.get("admin") }); });

  app.get("/progress", async c => {
    const u = requireUser(c);
    const [attempts, bookmarks, sessions] = await c.env.DB.batch([
      c.env.DB.prepare("SELECT attempt_key AS key, question_id AS questionId, answer, correct, created_at AS createdAt, subject_id AS subjectId, section, topic FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20000").bind(u.id),
      c.env.DB.prepare("SELECT question_id FROM bookmarks WHERE user_id = ?").bind(u.id),
      c.env.DB.prepare("SELECT token, exam, label, subject_id AS subjectId, correct, total, answered, duration_ms AS durationMs, sections, created_at AS createdAt FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").bind(u.id),
    ]);
    return c.json({
      attempts: (attempts.results as Record<string, unknown>[]).map(r => ({ ...r, correct: r.correct === 1 })),
      bookmarks: (bookmarks.results as { question_id: string }[]).map(r => r.question_id),
      sessions: (sessions.results as Record<string, unknown>[]).map(r => ({ ...r, exam: r.exam === 1, sections: JSON.parse(String(r.sections)) })),
    });
  });

  /** Records answers (a checked practice answer, or progress imported from this browser). The server grades. */
  app.post("/attempts", async c => {
    const u = requireUser(c);
    const body = await readJson<{ attempts: AttemptIn[]; country?: string; examYear?: number }>(c, 400_000);
    if (!Array.isArray(body.attempts) || body.attempts.length < 1 || body.attempts.length > 1000) throw new HttpError(400, "Send 1 to 1,000 answers.");
    const { country, examYear } = profile(body.country, body.examYear);
    const rows = attemptRows(u, body.attempts, await questionIndex(c.env.DB), country, examYear);
    const stmt = c.env.DB.prepare(INSERT_ATTEMPT);
    await c.env.DB.batch(rows.map(r => stmt.bind(...r)));
    return c.json({ ok: true, recorded: rows.length });
  });

  /** Finishes a session: grades it on the server, records its answers once, and stores the summary. */
  app.post("/sessions", async c => {
    const u = requireUser(c);
    const s = await readJson<Session>(c);
    if (!TOKEN.test(s?.token ?? "") || !Array.isArray(s.ids) || s.ids.length < 1 || s.ids.length > 100 || new Set(s.ids).size !== s.ids.length || typeof s.responses !== "object" || !s.responses)
      throw new HttpError(400, "Invalid session.");
    const index = await questionIndex(c.env.DB);
    const chosen = s.ids.map(id => index.get(id));
    if (chosen.some(q => !q)) throw new HttpError(400, "This session uses questions that are no longer available.");
    const qs = chosen as Question[];
    const responses: Record<string, string> = {};
    for (const q of qs) { const a = s.responses[q.id]; if (typeof a === "string" && ANSWERS.has(a) && a) responses[q.id] = a; }
    const session: Session = { ...s, exam: !!s.exam, label: String(s.label ?? "").slice(0, 120), subjectId: qs[0].subject_id ?? "mathematics", responses,
      startedAt: Number.isFinite(s.startedAt) ? Math.min(Date.now(), Number(s.startedAt)) : 0 };
    const now = Date.now();
    const result = summarize(session, qs, now);
    const { country, examYear } = profile(s.country, s.examYear);
    const graded = gradedQuestions(session, qs).map(q => ({ key: `${session.token}/${q.id}`, questionId: q.id, answer: responses[q.id] ?? "" }));
    const rows = attemptRows(u, graded, index, country, examYear);
    const stmt = c.env.DB.prepare(INSERT_ATTEMPT);
    await c.env.DB.batch([
      ...rows.map(r => stmt.bind(...r)),
      c.env.DB.prepare("INSERT OR IGNORE INTO sessions (user_id, token, exam, label, subject_id, correct, total, answered, duration_ms, sections, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(u.id, result.token, result.exam ? 1 : 0, result.label, result.subjectId, result.correct, result.total, result.answered, result.durationMs, JSON.stringify(result.sections), now),
    ]);
    return c.json({ ok: true, result });
  });

  app.post("/bookmarks", async c => {
    const u = requireUser(c);
    const body = await readJson<{ questionId: string; saved: boolean }>(c);
    if (typeof body.questionId !== "string" || !QUESTION_ID.test(body.questionId)) throw new HttpError(400, "Invalid question.");
    if (body.saved) {
      if (!(await questionIndex(c.env.DB)).has(body.questionId)) throw new HttpError(404, "Question not found.");
      await c.env.DB.prepare("INSERT OR IGNORE INTO bookmarks (user_id, question_id, created_at) VALUES (?,?,?)").bind(u.id, body.questionId, Date.now()).run();
    } else {
      await c.env.DB.prepare("DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?").bind(u.id, body.questionId).run();
    }
    return c.json({ ok: true });
  });

  /** Deletes all of the signed-in user's learning data (the Supabase login itself is managed separately). */
  app.delete("/me/data", async c => {
    const u = requireUser(c);
    await c.env.DB.batch(["attempts", "bookmarks", "sessions"].map(t => c.env.DB.prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(u.id)));
    return c.json({ ok: true });
  });

  // ---- Publishing (admins only) ----
  app.get("/admin/packs", async c => {
    requireAdmin(c);
    const { results } = await c.env.DB.prepare("SELECT id, title, version, subject_id, question_count, status, updated_at FROM packs ORDER BY updated_at DESC").all();
    return c.json({ packs: results });
  });
  app.get("/admin/packs/:id", async c => {
    requireAdmin(c);
    const row = await c.env.DB.prepare("SELECT content FROM packs WHERE id = ?").bind(c.req.param("id")).first<Pick<PackRow, "content">>();
    if (!row) throw new HttpError(404, "Pack not found.");
    return c.json({ pack: JSON.parse(row.content) });
  });
  app.post("/admin/packs", async c => {
    const u = requireAdmin(c);
    let pack: Pack;
    try { pack = validatePack(await readJson<unknown>(c, MAX_BODY)); } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, (e as Error).message); }
    const content = JSON.stringify(pack);
    await c.env.DB.prepare(`INSERT INTO packs (id, title, version, subject_id, question_count, content, status, updated_by, updated_at) VALUES (?,?,?,?,?,?, 'draft', ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, version = excluded.version, subject_id = excluded.subject_id, question_count = excluded.question_count,
      content = excluded.content, status = 'draft', updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
      .bind(pack.pack_id, pack.title, pack.version, pack.subject_id ?? "mathematics", pack.questions.length, content, u.email, Date.now()).run();
    publishedCache = null;
    return c.json({ ok: true, id: pack.pack_id, status: "draft" });
  });
  app.post("/admin/packs/:id/status", async c => {
    const u = requireAdmin(c);
    const { status } = await readJson<{ status: string }>(c);
    if (status !== "published" && status !== "draft") throw new HttpError(400, "Status must be published or draft.");
    const res = await c.env.DB.prepare("UPDATE packs SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?").bind(status, u.email, Date.now(), c.req.param("id")).run();
    if (!res.meta.changes) throw new HttpError(404, "Pack not found.");
    publishedCache = null;
    return c.json({ ok: true });
  });
  app.delete("/admin/packs/:id", async c => {
    requireAdmin(c);
    const res = await c.env.DB.prepare("DELETE FROM packs WHERE id = ?").bind(c.req.param("id")).run();
    if (!res.meta.changes) throw new HttpError(404, "Pack not found.");
    publishedCache = null;
    return c.json({ ok: true });
  });

  return app;
}

const app = createApp();
export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return app.fetch(request, env, ctx);
    // Static assets are normally served before the Worker runs; this is a fallback.
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

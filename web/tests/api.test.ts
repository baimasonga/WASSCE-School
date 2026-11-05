import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { coreQuestions } from "../shared/bank";
import { createApp, type Env } from "../worker/index";
import { testD1 } from "./d1";

const SUPABASE_URL = "https://example.supabase.co";
let sign: (claims: Record<string, unknown>, audience?: string) => Promise<string>;
let app: ReturnType<typeof createApp>;
let env: Env;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "ES256" };
  app = createApp({ getKey: createLocalJWKSet({ keys: [jwk] }) });
  sign = (claims, audience = "authenticated") => new SignJWT({ role: "authenticated", ...claims }).setProtectedHeader({ alg: "ES256", kid: "test" })
    .setIssuer(`${SUPABASE_URL}/auth/v1`).setAudience(audience).setIssuedAt().setExpirationTime("1h").sign(privateKey);
});
const fresh = () => { env = { DB: testD1(), SUPABASE_URL, ADMIN_EMAILS: "Admin@School.org" }; };
async function call(path: string, init: RequestInit & { token?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("authorization", `Bearer ${init.token}`);
  if (init.body) headers.set("content-type", "application/json");
  const res = await app.request(`/api${path}`, { ...init, headers }, env);
  return { status: res.status, body: await res.json() as any, res };
}
const student = () => sign({ sub: "11111111-1111-1111-1111-111111111111", email: "student@example.com" });
const admin = () => sign({ sub: "22222222-2222-2222-2222-222222222222", email: "admin@school.org" });
const q = coreQuestions[0];
const wrong = ["A", "B", "C", "D"].find(k => k !== q.correct_option)!;
const pack = (id = "english-2027") => ({ format_version: 2, pack_id: id, title: "English sample", version: "1.0", subject_id: "english-language", countries: ["SL"], exam_year: null, exam_series: "both",
  questions: [{ id: "Q1", family_id: "plurals", section: "Grammar", topic: "Plural nouns", syllabus_scope: "unmarked", question: "Plural of child?", options: { A: "childs", B: "children", C: "childes", D: "childrens" }, correct_option: "B", solution_steps: [{ step: 1, text: "Irregular plural." }] }] });

describe("auth", () => {
  it("treats missing, forged and wrong-audience tokens as signed out", async () => {
    fresh();
    expect((await call("/me")).body).toEqual({ user: null, admin: false });
    expect((await call("/progress")).status).toBe(401);
    const other = await new SignJWT({ role: "authenticated", sub: "x", email: "x@y.z" }).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("k".repeat(32)));
    expect((await call("/me", { token: other })).body.user).toBeNull();
    expect((await call("/me", { token: await sign({ sub: "x", email: "x@y.z" }, "anon") })).body.user).toBeNull();
  });
  it("recognises admins case-insensitively and keeps students out of publishing", async () => {
    fresh();
    expect((await call("/me", { token: await admin() })).body).toMatchObject({ admin: true, user: { email: "admin@school.org" } });
    expect((await call("/me", { token: await student() })).body.admin).toBe(false);
    expect((await call("/admin/packs", { token: await student() })).status).toBe(403);
    expect((await call("/admin/packs", { method: "POST", token: await student(), body: JSON.stringify(pack()) })).status).toBe(403);
  });
});

describe("progress", () => {
  it("grades on the server and never scores a session's question twice", async () => {
    fresh(); const t = await student();
    const body = JSON.stringify({ attempts: [{ key: `abcdef12/${q.id}`, questionId: q.id, answer: q.correct_option }], country: "SL", examYear: 2026 });
    expect((await call("/attempts", { method: "POST", token: t, body })).status).toBe(200);
    await call("/attempts", { method: "POST", token: t, body });
    const p = (await call("/progress", { token: t })).body;
    expect(p.attempts).toHaveLength(1);
    expect(p.attempts[0]).toMatchObject({ questionId: q.id, correct: true, section: q.section });
  });
  it("rejects keys that don't match the question, unknown questions and bad answers", async () => {
    fresh(); const t = await student();
    for (const a of [{ key: `abcdef12/${coreQuestions[1].id}`, questionId: q.id, answer: "A" }, { key: "abcdef12/nope", questionId: "nope", answer: "A" }, { key: `abcdef12/${q.id}`, questionId: q.id, answer: "E" }])
      expect((await call("/attempts", { method: "POST", token: t, body: JSON.stringify({ attempts: [a] }) })).status).toBe(400);
  });
  it("finishes exams on the server: every question counts, the summary is stored once", async () => {
    fresh(); const t = await student();
    const ids = coreQuestions.slice(0, 4).map(x => x.id);
    const session = { token: "11112222-3333-4444-5555-666677778888", ids, exam: true, label: "Mock exam", responses: { [ids[0]]: coreQuestions[0].correct_option, [ids[1]]: wrong }, startedAt: Date.now() - 60_000, country: "SL", examYear: 2026 };
    const r = await call("/sessions", { method: "POST", token: t, body: JSON.stringify(session) });
    expect(r.body.result).toMatchObject({ correct: 1, total: 4, answered: 2, exam: true });
    await call("/sessions", { method: "POST", token: t, body: JSON.stringify(session) });
    const p = (await call("/progress", { token: t })).body;
    expect(p.attempts).toHaveLength(4);
    expect(p.sessions).toHaveLength(1);
    expect(p.sessions[0]).toMatchObject({ label: "Mock exam", correct: 1, total: 4, exam: true });
  });
  it("keeps the original finish time of a session uploaded later", async () => {
    fresh(); const t = await student();
    const ids = coreQuestions.slice(0, 2).map(x => x.id);
    const finishedAt = Date.now() - 3 * 86_400_000;
    await call("/sessions", { method: "POST", token: t, body: JSON.stringify({ token: "bbbbcccc-dddd", ids, exam: true, label: "Mock exam", responses: {}, startedAt: finishedAt - 3_600_000, finishedAt }) });
    const p = (await call("/progress", { token: t })).body;
    expect(p.sessions[0].createdAt).toBe(finishedAt);
    expect(p.sessions[0].durationMs).toBe(3_600_000);
    expect(p.attempts.every((a: { createdAt: number }) => a.createdAt === finishedAt)).toBe(true);
  });
  it("practice sessions only score answered questions", async () => {
    fresh(); const t = await student();
    const ids = coreQuestions.slice(0, 3).map(x => x.id);
    const r = await call("/sessions", { method: "POST", token: t, body: JSON.stringify({ token: "aaaabbbb-cccc", ids, exam: false, label: "Quick", responses: { [ids[0]]: coreQuestions[0].correct_option }, startedAt: 0 }) });
    expect(r.body.result).toMatchObject({ correct: 1, answered: 1, total: 3 });
    expect((await call("/progress", { token: t })).body.attempts).toHaveLength(1);
  });
  it("keeps bookmarks per user and deletes all learning data on request", async () => {
    fresh(); const t = await student();
    await call("/bookmarks", { method: "POST", token: t, body: JSON.stringify({ questionId: q.id, saved: true }) });
    expect((await call("/bookmarks", { method: "POST", token: t, body: JSON.stringify({ questionId: "missing", saved: true }) })).status).toBe(404);
    expect((await call("/progress", { token: t })).body.bookmarks).toEqual([q.id]);
    expect((await call("/progress", { token: await admin() })).body.bookmarks).toEqual([]);
    await call("/me/data", { method: "DELETE", token: t });
    expect((await call("/progress", { token: t })).body).toMatchObject({ attempts: [], bookmarks: [], sessions: [] });
  });
});

describe("publishing", () => {
  it("validates, drafts, publishes and serves packs", async () => {
    fresh(); const a = await admin();
    expect((await call("/admin/packs", { method: "POST", token: a, body: JSON.stringify({ ...pack(), pack_id: "../bad" }) })).status).toBe(400);
    expect((await call("/admin/packs", { method: "POST", token: a, body: JSON.stringify(pack()) })).body).toMatchObject({ status: "draft" });
    expect((await call("/catalog")).body.packs.map((p: { id: string }) => p.id)).toEqual(["wassce-mathematics-core"]);
    expect((await call("/packs/english-2027.json")).status).toBe(404);
    await call("/admin/packs/english-2027/status", { method: "POST", token: a, body: JSON.stringify({ status: "published" }) });
    const cat = (await call("/catalog")).body;
    expect(cat.packs.map((p: { id: string }) => p.id)).toEqual(["wassce-mathematics-core", "english-2027"]);
    expect(cat.questions[0].id).toBe("english-2027/Q1");
    const dl = await call("/packs/english-2027.json");
    expect(dl.res.headers.get("content-disposition")).toContain("english-2027.json");
    // Published pack questions can be graded.
    const t = await student();
    expect((await call("/attempts", { method: "POST", token: t, body: JSON.stringify({ attempts: [{ key: "abcdef12/english-2027/Q1", questionId: "english-2027/Q1", answer: "B" }] }) })).status).toBe(200);
    // Re-uploading returns a pack to draft until it is published again.
    await call("/admin/packs", { method: "POST", token: a, body: JSON.stringify(pack()) });
    expect((await call("/catalog")).body.packs).toHaveLength(1);
  });
  it("serves the core pack for Android and refuses oversized uploads", async () => {
    fresh();
    const core = await call("/packs/wassce-mathematics-core.json");
    expect(core.body.questions).toHaveLength(1000);
    const big = JSON.stringify({ ...pack(), filler: "x".repeat(900_000) });
    expect((await call("/admin/packs", { method: "POST", token: await admin(), body: big })).status).toBe(413);
  });
});

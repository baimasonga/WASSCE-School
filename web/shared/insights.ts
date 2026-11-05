// Learning logic shared by the web app and the API. Mirrors app/src/main/java/.../Insights.kt in the Android app.
import { questionSubject } from "./catalog";
import type { Question } from "./questions";

/** Days until a question comes back for review, by Leitner box. Box 0 = got it wrong: due now. */
export const REVIEW_DAYS = [0, 1, 3, 7, 16, 35] as const;
export const DAY_MS = 86_400_000;

/** One scored answer. `key` is "<session token>/<question id>" so a session never scores a question twice. */
export type Attempt = {
  key: string; questionId: string; answer: string; correct: boolean; createdAt: number;
  subjectId: string; section: string; topic: string;
};

export type QStat = { total: number; correct: number; lastCorrect: boolean; box: number; due: number; lastAt: number };
export const EMPTY_STAT: QStat = { total: 0, correct: 0, lastCorrect: false, box: 0, due: 0, lastAt: 0 };

export function after(s: QStat, ok: boolean, now: number): QStat {
  const box = ok ? Math.min(s.box + 1, REVIEW_DAYS.length - 1) : 0;
  return { total: s.total + 1, correct: s.correct + (ok ? 1 : 0), lastCorrect: ok, box, due: now + REVIEW_DAYS[box] * DAY_MS, lastAt: now };
}
export const isDue = (s: QStat | undefined, now: number) => !!s && s.total > 0 && s.due <= now;

/** Replays attempts oldest-first into per-question stats. */
export function statsFrom(attempts: readonly Attempt[]): Map<string, QStat> {
  const out = new Map<string, QStat>();
  for (const a of [...attempts].sort((x, y) => x.createdAt - y.createdAt)) out.set(a.questionId, after(out.get(a.questionId) ?? EMPTY_STAT, a.correct, a.createdAt));
  return out;
}

export type TopicStat = { section: string; topic: string; questions: number; seen: number; attempts: number; correct: number };
export const accuracy = (t: { attempts: number; correct: number }) => (t.attempts === 0 ? 0 : t.correct / t.attempts);

export function topicStats(pool: readonly Question[], stats: Map<string, QStat>): TopicStat[] {
  const groups = new Map<string, TopicStat>();
  for (const q of pool) {
    const k = `${q.section}\u0000${q.topic}`;
    const t = groups.get(k) ?? { section: q.section, topic: q.topic, questions: 0, seen: 0, attempts: 0, correct: 0 };
    const s = stats.get(q.id);
    t.questions++;
    if (s) { t.seen++; t.attempts += s.total; t.correct += s.correct; }
    groups.set(k, t);
  }
  return [...groups.values()].sort((a, b) => a.section.localeCompare(b.section) || a.topic.localeCompare(b.topic));
}

/** Topics with at least `minAttempts` answers and accuracy below `below`; weakest first. */
export function weakTopics(topics: readonly TopicStat[], minAttempts = 3, below = 0.7): TopicStat[] {
  return topics.filter(t => t.attempts >= minAttempts && accuracy(t) < below)
    .sort((a, b) => accuracy(a) - accuracy(b) || b.attempts - a.attempts);
}

/** Local calendar day number for a timestamp. */
export const dayNumber = (ms: number, tzOffsetMinutes = new Date(ms).getTimezoneOffset()) => Math.floor((ms - tzOffsetMinutes * 60_000) / DAY_MS);

/** Consecutive practice days ending today, or yesterday if today has no practice yet. */
export function streak(days: ReadonlySet<number>, today: number): number {
  let day = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;
  if (day === null) return 0;
  let n = 0;
  while (days.has(day)) { n++; day--; }
  return n;
}

/** Deterministic PRNG (mulberry32) so tests and screenshots are repeatable. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const v = [...items];
  for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
  return v;
}
function onePerFamily(qs: readonly Question[]): Question[] {
  const seen = new Set<string>();
  return qs.filter(q => (seen.has(q.family_id) ? false : (seen.add(q.family_id), true)));
}
function oneSubject(pool: readonly Question[]) {
  if (new Set(pool.map(questionSubject)).size > 1) throw new Error("Choose one subject before starting a session.");
}

/** Random selection with one question per skill family (used for mock exams). */
export function chooseRandom(pool: readonly Question[], limit: number, random: () => number = Math.random): Question[] {
  oneSubject(pool);
  return onePerFamily(shuffle(pool, random)).slice(0, limit);
}

/** Practice selection: past mistakes, then due reviews, then unseen, then the rest. One per family; shuffled. */
export function chooseSmart(pool: readonly Question[], limit: number, stats: Map<string, QStat>, now: number, random: () => number = Math.random): Question[] {
  oneSubject(pool);
  const rank = (q: Question) => { const s = stats.get(q.id); return !s || s.total === 0 ? 2 : !s.lastCorrect ? 0 : s.due <= now ? 1 : 3; };
  const ordered = shuffle(pool, random).map((q, i) => ({ q, i, r: rank(q) })).sort((a, b) => a.r - b.r || a.i - b.i).map(x => x.q);
  return shuffle(onePerFamily(ordered).slice(0, limit), random);
}

export type Session = {
  token: string; ids: string[]; exam: boolean; label: string; subjectId: string;
  index: number; responses: Record<string, string>; revealed: string[]; flagged: string[];
  startedAt: number; deadline: number; finished: boolean; finishedAt: number;
  country: string; examYear: number;
};

export type SectionScore = { section: string; correct: number; total: number };
export type SessionResult = {
  token: string; exam: boolean; label: string; subjectId: string; correct: number; total: number;
  answered: number; durationMs: number; sections: SectionScore[]; createdAt: number;
};
export const outOf = (r: Pick<SessionResult, "exam" | "total" | "answered">) => (r.exam ? r.total : r.answered);
export const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part * 100) / whole));

/** Exams are marked out of every question; practice only out of the questions answered. */
export function gradedQuestions(s: Pick<Session, "exam" | "responses">, chosen: readonly Question[]): Question[] {
  return s.exam ? [...chosen] : chosen.filter(q => q.id in s.responses);
}

export function summarize(s: Session, chosen: readonly Question[], now: number): SessionResult {
  const graded = gradedQuestions(s, chosen);
  const bySection = new Map<string, SectionScore>();
  for (const q of graded) {
    const row = bySection.get(q.section) ?? { section: q.section, correct: 0, total: 0 };
    row.total++; if (s.responses[q.id] === q.correct_option) row.correct++;
    bySection.set(q.section, row);
  }
  return {
    token: s.token, exam: s.exam, label: s.label || (s.exam ? "Mock exam" : "Practice"), subjectId: s.subjectId,
    correct: graded.filter(q => s.responses[q.id] === q.correct_option).length, total: chosen.length,
    answered: chosen.filter(q => q.id in s.responses).length,
    durationMs: s.startedAt > 0 ? Math.max(0, now - s.startedAt) : 0,
    sections: [...bySection.values()].sort((a, b) => a.section.localeCompare(b.section)), createdAt: now,
  };
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

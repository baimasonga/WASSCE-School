import { describe, expect, it } from "vitest";
import { coreQuestions } from "../shared/bank";
import { after, chooseRandom, chooseSmart, DAY_MS, EMPTY_STAT, isDue, seeded, statsFrom, streak, summarize, topicStats, weakTopics, type Session } from "../shared/insights";
import type { Question } from "../shared/questions";

const now = 1_800_000_000_000;
const mk = (id: string, family = id, topic = "Fractions", section = "A. Number"): Question => ({ ...coreQuestions[0], id, family_id: family, topic, section, subject_id: "mathematics" });

describe("spaced review", () => {
  it("spaces correct answers out and resets after a wrong one", () => {
    const once = after(EMPTY_STAT, true, now);
    expect(once).toMatchObject({ box: 1, due: now + DAY_MS }); expect(isDue(once, now)).toBe(false);
    const wrong = after(after(once, true, now), false, now);
    expect(wrong).toMatchObject({ box: 0, total: 3, correct: 2, lastCorrect: false }); expect(isDue(wrong, now)).toBe(true);
    expect(isDue(undefined, now)).toBe(false);
  });
  it("replays attempts oldest first", () => {
    const s = statsFrom([
      { key: "b/1", questionId: "1", answer: "A", correct: true, createdAt: now, subjectId: "mathematics", section: "A", topic: "T" },
      { key: "a/1", questionId: "1", answer: "B", correct: false, createdAt: now - DAY_MS, subjectId: "mathematics", section: "A", topic: "T" },
    ]).get("1")!;
    expect(s).toMatchObject({ total: 2, correct: 1, lastCorrect: true, box: 1 });
  });
});

describe("selection", () => {
  it("puts mistakes, then due reviews, then unseen questions first", () => {
    const pool = Array.from({ length: 40 }, (_, i) => mk(String(i + 1)));
    const stats = new Map([["1", after(EMPTY_STAT, false, now)], ["2", after(EMPTY_STAT, true, now - 2 * DAY_MS)], ...Array.from({ length: 28 }, (_, i) => [String(i + 3), after(EMPTY_STAT, true, now)] as const)]);
    const picked = new Set(chooseSmart(pool, 12, stats, now, seeded(7)).map(q => q.id));
    expect(picked.has("1") && picked.has("2")).toBe(true);
    for (let i = 31; i <= 40; i++) expect(picked.has(String(i))).toBe(true);
  });
  it("uses one question per family and refuses mixed subjects", () => {
    const pool = Array.from({ length: 30 }, (_, i) => mk(String(i), `f${i % 5}`));
    expect(chooseRandom(pool, 20)).toHaveLength(5);
    expect(() => chooseSmart([mk("1"), { ...mk("2"), subject_id: "physics" }], 5, new Map(), now)).toThrow();
  });
});

describe("insights", () => {
  it("finds weak topics with enough answers, weakest first", () => {
    const pool = [mk("1", "1", "Fractions"), mk("2", "2", "Indices"), mk("3", "3", "Surds"), mk("4", "4", "Sets")];
    const stats = new Map([["1", { ...EMPTY_STAT, total: 4, correct: 1 }], ["2", { ...EMPTY_STAT, total: 5, correct: 3 }], ["3", { ...EMPTY_STAT, total: 2, correct: 0 }], ["4", { ...EMPTY_STAT, total: 5, correct: 5 }]]);
    expect(weakTopics(topicStats(pool, stats)).map(t => t.topic)).toEqual(["Fractions", "Indices"]);
  });
  it("counts streaks from today or yesterday", () => {
    expect(streak(new Set([10, 11, 12]), 12)).toBe(3);
    expect(streak(new Set([10, 11, 12]), 13)).toBe(3);
    expect(streak(new Set([10, 11, 12]), 14)).toBe(0);
  });
  it("marks exams out of every question and practice out of answered ones", () => {
    const chosen = [mk("1", "1", "T", "A"), mk("2", "2", "T", "A"), mk("3", "3", "T", "B"), mk("4", "4", "T", "B")];
    const right = chosen[0].correct_option, other = ["A", "B", "C", "D"].find(k => k !== right)!;
    const base: Session = { token: "t", ids: chosen.map(q => q.id), exam: true, label: "", subjectId: "mathematics", index: 0, responses: { "1": right, "2": other, "3": right }, revealed: [], flagged: [], startedAt: now - 60_000, deadline: 0, finished: false, finishedAt: 0, country: "SL", examYear: 2026 };
    expect(summarize(base, chosen, now)).toMatchObject({ correct: 2, total: 4, answered: 3, durationMs: 60_000, label: "Mock exam" });
    expect(summarize({ ...base, exam: false }, chosen, now).sections).toEqual([{ section: "A", correct: 1, total: 2 }, { section: "B", correct: 1, total: 1 }]);
  });
});

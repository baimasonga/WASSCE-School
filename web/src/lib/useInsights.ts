import { useMemo } from "react";
import { accuracy, isDue, outOf, topicStats, weakTopics } from "../../shared/insights";
import { useApp } from "./store";

/** Derived study numbers for the current profile's question pool. */
export function useInsights() {
  const { pool, stats, now, progress, profile } = useApp();
  return useMemo(() => {
    const topics = topicStats(pool, stats);
    const attempts = pool.reduce((n, q) => n + (stats.get(q.id)?.total ?? 0), 0);
    const correct = pool.reduce((n, q) => n + (stats.get(q.id)?.correct ?? 0), 0);
    const results = progress.results.filter(r => r.subjectId === profile.subjectId);
    const mocks = results.filter(r => r.exam);
    return {
      topics, weak: weakTopics(topics),
      due: pool.filter(q => isDue(stats.get(q.id), now)),
      mistakes: pool.filter(q => stats.get(q.id)?.lastCorrect === false),
      saved: pool.filter(q => progress.bookmarks.includes(q.id)),
      seen: pool.filter(q => stats.has(q.id)).length,
      attempts, correct, accuracy: accuracy({ attempts, correct }), results, mocks,
      bestMock: mocks.length ? Math.max(...mocks.map(m => Math.round((m.correct * 100) / Math.max(1, outOf(m))))) : null,
    };
  }, [pool, stats, now, progress, profile.subjectId]);
}

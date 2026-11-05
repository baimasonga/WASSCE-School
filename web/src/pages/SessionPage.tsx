import { ArrowLeft, Flag, LayoutGrid, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { subjectName } from "../../shared/catalog";
import { formatDuration, outOf, percent, summarize, type Session } from "../../shared/insights";
import type { Question } from "../../shared/questions";
import { Bar, Button, Card, Chip, Dialog, LinkButton, cx } from "../components/ui";
import { useApp } from "../lib/store";

type Mark = "open" | "answered" | "correct" | "wrong";
const markOf = (s: Session, q: Question): Mark =>
  s.finished || (!s.exam && s.revealed.includes(q.id)) ? (s.responses[q.id] === q.correct_option ? "correct" : "wrong") : q.id in s.responses ? "answered" : "open";

export function SessionPage() {
  const { session: s, sessionQuestions: qs, now, update, check, finish, toggleBookmark, progress, discard } = useApp();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(!!s?.finished);
  const [grid, setGrid] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (s?.finished) setSummary(true); }, [s?.finished]);
  useEffect(() => { if (!summary) window.scrollTo(0, 0); }, [s?.index, summary]);

  if (!s || qs.length === 0) return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No session in progress</h1>
      <p className="mt-2 text-muted">Start a practice set or a mock exam from your learning page.</p>
      <LinkButton to="/learn" className="mt-6">Go to Learn</LinkButton>
    </div>
  );

  const index = Math.min(s.index, qs.length - 1);
  const q = qs[index];
  const answered = qs.filter(x => x.id in s.responses).length;
  const flagged = qs.filter(x => s.flagged.includes(x.id)).length;
  const revealed = s.finished || (!s.exam && s.revealed.includes(q.id));
  const selected = s.responses[q.id];
  const go = (i: number) => update({ ...s, index: i });
  const left = s.deadline - now;

  const submit = async () => { setConfirm(false); await finish(); setSummary(true); };
  const done = () => { discard(); navigate("/progress"); };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-4">
      <div className="sticky top-16 z-20 -mx-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" className="rounded-lg p-2 hover:bg-surface-2" onClick={() => (s.finished && !summary ? setSummary(true) : navigate("/learn"))}
            aria-label={s.finished && !summary ? "Back to results" : "Leave and resume later"}><ArrowLeft size={20} /></button>
          <div className="flex-1">
            <p className="font-semibold leading-tight">{s.label}</p>
            <p className="text-xs text-muted">{summary ? "Results" : `Question ${index + 1} of ${qs.length}`}</p>
          </div>
          {!summary && <>
            <button type="button" className="rounded-lg p-2 hover:bg-surface-2" onClick={() => toggleBookmark(q.id)}
              aria-label={progress.bookmarks.includes(q.id) ? "Remove from saved questions" : "Save this question"} aria-pressed={progress.bookmarks.includes(q.id)}>
              <Star size={20} className={progress.bookmarks.includes(q.id) ? "fill-accent text-accent" : "text-muted"} />
            </button>
            <button type="button" className="rounded-lg p-2 hover:bg-surface-2" onClick={() => setGrid(true)} aria-label="All questions"><LayoutGrid size={20} /></button>
          </>}
        </div>
        <Bar value={answered / qs.length} className="mt-3" />
        {s.exam && !s.finished && (
          <div className={cx("mt-3 flex items-center justify-between rounded-lg px-3 py-1.5 text-sm", left < 5 * 60_000 ? "bg-bad-soft text-bad" : "bg-surface-2")}>
            <span className="font-semibold tabular-nums" role="timer" aria-live={left < 60_000 ? "polite" : "off"}>Time left {formatDuration(left)}</span><span className="text-xs">{answered} answered</span>
          </div>
        )}
      </div>

      {summary && s.finished ? <Results s={s} qs={qs} onOpen={i => { go(i); setSummary(false); }} onDone={done} /> : (
        <article className="pt-6">
          <p className="text-sm font-semibold text-brand">{subjectName(q.subject_id)} · {q.topic}</p>
          {q.syllabus_scope === "marked" && <p className="text-xs font-medium text-accent">Country-marked syllabus topic</p>}
          <h2 className="mt-3 text-xl font-semibold leading-relaxed sm:text-2xl">{q.question}</h2>
          <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Answer options">
            {(["A", "B", "C", "D"] as const).map(k => {
              const isAnswer = k === q.correct_option, isPicked = selected === k;
              const state = revealed ? (isAnswer ? "good" : isPicked ? "bad" : "none") : isPicked ? "picked" : "none";
              return (
                <button key={k} type="button" role="radio" aria-checked={isPicked} disabled={revealed}
                  onClick={() => update({ ...s, responses: { ...s.responses, [q.id]: k } })}
                  className={cx("flex items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors disabled:cursor-default",
                    state === "good" && "border-good bg-good-soft", state === "bad" && "border-bad bg-bad-soft",
                    state === "picked" && "border-brand bg-brand-soft", state === "none" && "border-line bg-surface hover:border-brand/50")}>
                  <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                    state === "good" ? "bg-good text-surface" : state === "bad" ? "bg-bad text-surface" : state === "picked" ? "bg-brand text-brand-ink" : "bg-surface-3")}>{k}</span>
                  <span className="flex-1">
                    <span className="block">{q.options[k]}</span>
                    {state === "good" && <span className="text-xs font-semibold text-good">✓ Correct answer</span>}
                    {state === "bad" && <span className="text-xs font-semibold text-bad">✗ Your answer</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {!s.finished && <div className="mt-4"><Chip selected={s.flagged.includes(q.id)} onClick={() => update({ ...s, flagged: s.flagged.includes(q.id) ? s.flagged.filter(x => x !== q.id) : [...s.flagged, q.id] })}>
            <span className="inline-flex items-center gap-1.5"><Flag size={14} />{s.flagged.includes(q.id) ? "Flagged for review" : "Flag for review"}</span></Chip></div>}
          {revealed && <Solution q={q} picked={selected} key={q.id} />}
          {s.exam && !s.finished && <button type="button" className="mt-8 text-sm font-semibold text-brand hover:underline" onClick={() => setConfirm(true)}>Submit exam now</button>}
        </article>
      )}

      {!summary && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3">
            <Button variant="secondary" className="flex-1" disabled={index === 0} onClick={() => go(index - 1)}>Previous</Button>
            {!s.exam && !revealed && selected ? <Button className="flex-1" onClick={() => check(q)}>Check answer</Button>
              : index < qs.length - 1 ? <Button className="flex-1" onClick={() => go(index + 1)}>Next</Button>
              : s.finished ? <Button className="flex-1" onClick={() => setSummary(true)}>Results</Button>
              : <Button className="flex-1" onClick={() => (s.exam || answered < qs.length ? setConfirm(true) : submit())}>{s.exam ? "Submit exam" : "Finish"}</Button>}
          </div>
        </div>
      )}

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={s.exam ? "Submit your exam?" : "Finish practice?"}
        actions={<><Button variant="secondary" onClick={() => setConfirm(false)}>Keep working</Button><Button onClick={submit}>{s.exam ? "Submit" : "Finish"}</Button></>}>
        You have answered {answered} of {qs.length} questions.
        {answered < qs.length && (s.exam ? ` ${qs.length - answered} unanswered will be marked wrong.` : " Only answered questions count towards your progress.")}
        {flagged > 0 && ` ${flagged} flagged for review.`}
        {s.exam && " You can't change answers after submitting."}
      </Dialog>

      <Dialog open={grid} onClose={() => setGrid(false)} title="Questions">
        <p className="mb-3 text-xs">{s.finished || !s.exam ? "✓ correct · ✗ wrong · filled = answered · ⚑ flagged" : "Filled = answered · ⚑ = flagged. Choose a number to go there."}</p>
        <div className="grid max-h-[60vh] grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2 overflow-y-auto p-1">
          {qs.map((x, i) => { const m = markOf(s, x); return (
            <button key={x.id} type="button" onClick={() => { go(i); setGrid(false); setSummary(false); }}
              aria-label={`Question ${i + 1}: ${m}${s.flagged.includes(x.id) ? ", flagged" : ""}`}
              className={cx("h-12 rounded-xl text-sm font-semibold", i === index && "ring-2 ring-accent",
                m === "correct" && "bg-good-soft text-good", m === "wrong" && "bg-bad-soft text-bad", m === "answered" && "bg-brand text-brand-ink", m === "open" && "bg-surface-2 text-ink")}>
              {i + 1}{m === "correct" ? "✓" : m === "wrong" ? "✗" : ""}{s.flagged.includes(x.id) ? "⚑" : ""}
            </button>); })}
        </div>
      </Dialog>
    </div>
  );
}

function Solution({ q, picked }: { q: Question; picked?: string }) {
  const [shown, setShown] = useState(0);
  const ok = picked === q.correct_option;
  return (
    <section className="mt-6" aria-live="polite">
      <div className={cx("rounded-2xl p-4", ok ? "bg-good-soft" : "bg-surface-2")}>
        <p className={cx("text-lg font-bold", ok ? "text-good" : "text-bad")}>{!picked ? "Not answered" : ok ? "Correct!" : "Not quite"}</p>
        <p className="text-sm">Correct answer: {q.correct_option}. {q.options[q.correct_option]}</p>
      </div>
      <h3 className="mt-6 font-semibold">Worked solution</h3>
      <ol className="mt-2 grid gap-2">
        {q.solution_steps.slice(0, shown).map(st => (
          <li key={st.step} className="flex gap-3"><span className="font-bold text-brand">{st.step}.</span><span>{st.text}</span></li>
        ))}
      </ol>
      {shown < q.solution_steps.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShown(n => n + 1)}>{shown === 0 ? "Show first step" : "Next step"}</Button>
          <Button variant="ghost" onClick={() => setShown(q.solution_steps.length)}>Show all {q.solution_steps.length} steps</Button>
        </div>
      )}
    </section>
  );
}

function Results({ s, qs, onOpen, onDone }: { s: Session; qs: Question[]; onOpen: (i: number) => void; onDone: () => void }) {
  const r = summarize(s, qs, s.finishedAt || Date.now());
  const [wrongOnly, setWrongOnly] = useState(false);
  return (
    <div className="pt-6">
      <Card className="border-0 bg-brand-soft text-center">
        <p className="font-display text-6xl font-bold text-brand-strong">{percent(r.correct, outOf(r))}%</p>
        <p className="mt-1 text-lg font-semibold">{r.correct} of {outOf(r)} correct</p>
        <p className="text-sm text-muted">{r.durationMs > 0 && `Time ${formatDuration(r.durationMs)}`}
          {r.answered < r.total && (s.exam ? ` · ${r.total - r.answered} unanswered` : ` · ${r.total - r.answered} skipped (not counted)`)}</p>
      </Card>
      {r.sections.length > 1 && <>
        <h3 className="mb-2 mt-8 font-semibold">By section</h3>
        <div className="grid gap-3">{r.sections.map(x => (
          <div key={x.section}><div className="flex justify-between text-sm"><span>{x.section}</span><span className="text-muted">{x.correct}/{x.total}</span></div><Bar value={x.total ? x.correct / x.total : 0} className="mt-1" /></div>
        ))}</div>
      </>}
      <div className="mb-2 mt-8 flex items-center justify-between"><h3 className="font-semibold">Review answers</h3><Chip selected={wrongOnly} onClick={() => setWrongOnly(w => !w)}>Wrong only</Chip></div>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {qs.map((q, i) => {
          const picked = s.responses[q.id], ok = picked === q.correct_option;
          if (wrongOnly && ok) return null;
          return (
            <li key={q.id}><button type="button" onClick={() => onOpen(i)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2">
              <span className={cx("w-6 text-center text-lg font-bold", ok ? "text-good" : "text-bad")} aria-label={ok ? "Correct" : "Wrong"}>{ok ? "✓" : "✗"}</span>
              <span className="flex-1"><span className="line-clamp-2 block text-sm">{i + 1}. {q.question}</span>
                <span className="text-xs text-muted">{!picked ? `Not answered · answer ${q.correct_option}` : ok ? `You chose ${picked}` : `You chose ${picked} · answer ${q.correct_option}`}</span></span>
            </button></li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3"><Button onClick={onDone}>Done</Button><Link to="/practice" className="self-center text-sm font-semibold text-brand hover:underline">Practise more →</Link></div>
    </div>
  );
}

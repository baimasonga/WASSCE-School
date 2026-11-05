import { ArrowRight, CalendarClock, ChevronDown, FlaskConical, Play, RotateCcw, Target } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { COUNTRIES, subjectName } from "../../shared/catalog";
import { accuracy, chooseRandom, chooseSmart, dayNumber, formatDuration, outOf, percent, type TopicStat } from "../../shared/insights";
import type { Question } from "../../shared/questions";
import { Bar, Button, Card, Chip, Dialog, LinkButton, Notice, PageHeader, SectionTitle, Spinner, Stat, cx } from "../components/ui";
import { EXAM_QUESTIONS } from "../config";
import { subjectOf, useApp } from "../lib/store";
import { useInsights } from "../lib/useInsights";

const Page = ({ children }: { children: ReactNode }) => <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</div>;
const pct = (v: number, has: boolean) => (has ? `${Math.round(v * 100)}%` : "—");

export function useProfileLine() {
  const { profile } = useApp();
  return `${subjectName(profile.subjectId)} · ${COUNTRIES.find(c => c.id === profile.country)?.name} · ${profile.examYear} ${profile.examSeries} candidates`;
}

/** Starts sessions, asking before replacing an unfinished one. */
export function useStarter() {
  const { session, start, discard } = useApp();
  const navigate = useNavigate();
  const [pending, setPending] = useState<null | (() => void)>(null);
  const run = (qs: Question[], exam: boolean, label: string) => {
    const go = () => { discard(); start(qs, exam, label); navigate("/session"); };
    if (session && !session.finished) setPending(() => go); else go();
  };
  const dialog = (
    <Dialog open={!!pending} onClose={() => setPending(null)} title="Replace your saved session?"
      actions={<><Button variant="secondary" onClick={() => setPending(null)}>Keep saved session</Button><Button onClick={() => { const p = pending; setPending(null); p?.(); }}>Start new</Button></>}>
      Answers you haven't checked in your saved {session?.exam ? "mock exam" : "practice set"} will be lost. Answers you already checked stay in your progress.
    </Dialog>
  );
  return { run, dialog };
}

function MockDialog({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: () => void }) {
  const { profile } = useApp();
  return (
    <Dialog open={open} onClose={onClose} title="Start a mock exam?"
      actions={<><Button variant="secondary" onClick={onClose}>Not now</Button><Button onClick={onStart}>Start the clock</Button></>}>
      Up to {EXAM_QUESTIONS} {subjectName(profile.subjectId)} questions with a 90-minute clock. Answers and solutions appear after you submit. The clock keeps running if you leave the page.
    </Dialog>
  );
}

function Action({ icon, title, text, onClick, emphasis }: { icon: ReactNode; title: string; text: string; onClick: () => void; emphasis?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cx("flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors",
      emphasis ? "border-brand bg-brand-soft hover:bg-brand-soft/70" : "border-line bg-surface hover:bg-surface-2")}>
      <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", emphasis ? "bg-brand text-brand-ink" : "bg-surface-2 text-brand")}>{icon}</span>
      <span className="flex-1"><span className="block font-semibold">{title}</span><span className="block text-sm text-muted">{text}</span></span>
      <ArrowRight size={18} className="text-muted" />
    </button>
  );
}

export function Learn() {
  const { ready, loadError, auth, pool, profileBank, stats, now, streak, session, sessionQuestions, profile } = useApp();
  const ins = useInsights();
  const line = useProfileLine();
  const { run, dialog } = useStarter();
  const navigate = useNavigate();
  const [mock, setMock] = useState(false);
  if (loadError) return <Page><Notice tone="bad">{loadError}</Notice></Page>;
  if (!ready) return <Page><Spinner label="Getting your questions ready…" /></Page>;
  const subject = subjectOf(profile.subjectId);
  const answered = session ? sessionQuestions.filter(q => q.id in session.responses).length : 0;
  return (
    <Page>
      {dialog}
      <MockDialog open={mock} onClose={() => setMock(false)} onStart={() => { setMock(false); run(chooseRandom(pool, EXAM_QUESTIONS), true, "Mock exam"); }} />
      <PageHeader eyebrow="Your learning" title="Welcome back">{line} · <Link to="/account" className="font-medium text-brand hover:underline">Change</Link></PageHeader>
      {!auth && <div className="mb-6"><Notice>Your progress is saved in this browser. <Link to="/signup" className="font-semibold underline">Create a free account</Link> to keep it on every device.</Notice></div>}
      {session && (
        <Card className="mb-6 border-accent bg-accent-soft">
          <p className="font-semibold">{session.finished ? "Your results are ready" : "Continue where you left off"}</p>
          <p className="text-sm text-muted">{session.label} · {answered} of {sessionQuestions.length} answered
            {session.exam && !session.finished && ` · ${formatDuration(session.deadline - now)} left (the clock keeps running)`}</p>
          <div className="mt-3 flex gap-2"><LinkButton to="/session">{session.finished ? "See results" : "Resume"}</LinkButton></div>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={streak} label="day streak" />
        <Stat value={pct(ins.accuracy, ins.attempts > 0)} label="accuracy" />
        <Stat value={`${ins.seen}`} label={`of ${pool.length} questions seen`} />
        <Stat value={ins.bestMock != null ? `${ins.bestMock}%` : "—"} label="best mock exam" />
      </div>
      {profileBank.length === 0 ? (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold">{subject.name} is being prepared</h2>
          <p className="mt-1 text-sm text-muted">There are no questions for this subject and exam profile yet. Choose another subject, or check back soon.</p>
          <p className="mt-3 text-sm"><span className="font-medium">Topic outline (awaiting syllabus review):</span> <span className="text-muted">{subject.topics.join(" · ")}</span></p>
          <LinkButton to="/subjects" variant="secondary" className="mt-4">Browse subjects</LinkButton>
        </Card>
      ) : (
        <>
          <SectionTitle>Today</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            {ins.due.length > 0 && <Action emphasis icon={<RotateCcw size={20} />} title={`Review ${ins.due.length} due question${ins.due.length === 1 ? "" : "s"}`}
              text="Questions you missed, and ones you got right a while ago. Short daily reviews help them stick." onClick={() => run(chooseSmart(ins.due, 20, stats, now), false, "Review")} />}
            {ins.weak.length > 0 && <Action emphasis={!ins.due.length} icon={<Target size={20} />} title="Practise your weak topics"
              text={ins.weak.slice(0, 3).map(t => `${t.topic} ${Math.round(accuracy(t) * 100)}%`).join(" · ")}
              onClick={() => { const keys = new Set(ins.weak.slice(0, 3).map(t => `${t.section}|${t.topic}`)); run(chooseSmart(pool.filter(q => keys.has(`${q.section}|${q.topic}`)), 15, stats, now), false, "Weak topics"); }} />}
            <Action emphasis={!ins.due.length && !ins.weak.length} icon={<Play size={20} />} title="Quick practice · 10 questions"
              text={ins.seen ? "A mixed set, favouring questions you haven't seen yet." : "A mixed set to get you started."} onClick={() => run(chooseSmart(pool, 10, stats, now), false, "Quick practice")} />
            <Action icon={<CalendarClock size={20} />} title="Mock exam · 50 questions · 90 minutes" text="Timed. Answers and solutions appear after you submit." onClick={() => setMock(true)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link to="/practice" className="font-medium text-brand hover:underline">Choose a section or topic →</Link>
            <Link to="/progress" className="font-medium text-brand hover:underline">See your progress →</Link>
          </div>
        </>
      )}
      <SectionTitle>Chemistry lab</SectionTitle>
      <Action icon={<FlaskConical size={20} />} title="Virtual practicals" text="Titrations, salt analysis, gas tests and a timed mock practical." onClick={() => navigate("/lab")} />
    </Page>
  );
}

export function Practice() {
  const { ready, pool, profileBank, stats, now, profile, setProfile } = useApp();
  const ins = useInsights();
  const line = useProfileLine();
  const { run, dialog } = useStarter();
  const [mode, setMode] = useState<"all" | "due" | "mistakes" | "saved">("all");
  const [section, setSection] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [size, setSize] = useState(20);
  const [mock, setMock] = useState(false);
  const base = { all: pool, due: ins.due, mistakes: ins.mistakes, saved: ins.saved }[mode];
  const sections = useMemo(() => [...new Set(pool.map(q => q.section))].sort(), [pool]);
  const topics = useMemo(() => [...new Set(pool.filter(q => q.section === section).map(q => q.topic))].sort(), [pool, section]);
  const matching = base.filter(q => (!section || q.section === section) && (!topic || q.topic === topic));
  const families = new Set(matching.map(q => q.family_id)).size;
  if (!ready) return <Page><Spinner /></Page>;
  const topicStat = (t: string) => ins.topics.find(x => x.section === section && x.topic === t);
  return (
    <Page>
      {dialog}
      <MockDialog open={mock} onClose={() => setMock(false)} onStart={() => { setMock(false); run(chooseRandom(pool, EXAM_QUESTIONS), true, "Mock exam"); }} />
      <PageHeader eyebrow="Practice" title="Choose what to practise">{line}</PageHeader>
      {profileBank.length === 0 ? <Notice>No questions for this subject and profile yet. <Link to="/subjects" className="font-semibold underline">Choose another subject</Link>.</Notice> : (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-muted">Questions</h2>
            <div className="flex flex-wrap gap-2">
              {([["all", "All", pool.length], ["due", "Due for review", ins.due.length], ["mistakes", "Mistakes", ins.mistakes.length], ["saved", "Saved", ins.saved.length]] as const)
                .map(([id, label, n]) => <Chip key={id} selected={mode === id} onClick={() => setMode(id)}>{label} · {n}</Chip>)}
            </div>
            <h2 className="mb-2 mt-6 text-sm font-semibold text-muted">Section</h2>
            <div className="flex flex-wrap gap-2">
              <Chip selected={!section} onClick={() => { setSection(null); setTopic(null); }}>All sections</Chip>
              {sections.map(s => <Chip key={s} selected={section === s} onClick={() => { setSection(s); setTopic(null); }}>{s}</Chip>)}
            </div>
            {section && topics.length > 1 && <>
              <h2 className="mb-2 mt-6 text-sm font-semibold text-muted">Topic</h2>
              <div className="flex flex-wrap gap-2">
                <Chip selected={!topic} onClick={() => setTopic(null)}>All topics</Chip>
                {topics.map(t => { const s = topicStat(t); return <Chip key={t} selected={topic === t} onClick={() => setTopic(t)}>{t}{s && s.attempts > 0 ? ` · ${Math.round(accuracy(s) * 100)}%` : ""}</Chip>; })}
              </div>
            </>}
            <label className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" checked={profile.includeMarked} onChange={e => setProfile({ includeMarked: e.target.checked })} />
              <span><span className="block font-medium">Include country-marked topics</span>
                <span className="text-sm text-muted">{profileBank.filter(q => q.syllabus_scope === "marked").length} questions on topics only some countries examine. Check with your teacher.</span></span>
            </label>
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <h2 className="font-semibold">Length</h2>
              <div className="mt-2 flex gap-2">{[10, 20, 30].map(n => <Chip key={n} selected={size === n} onClick={() => setSize(n)}>{n}</Chip>)}</div>
              <p className="mt-4 text-sm text-muted">{matching.length} matching questions in {families} skill group{families === 1 ? "" : "s"}.</p>
              <Button className="mt-3 w-full" disabled={!matching.length} onClick={() => {
                const label = [topic ?? section?.replace(/^[A-Z]\.\s*/, ""), { all: null, due: "Review", mistakes: "Mistakes", saved: "Saved" }[mode]].filter(Boolean).join(" · ") || "Practice";
                run(chooseSmart(matching, size, stats, now), false, label);
              }}>{matching.length ? `Start ${Math.min(size, families)} questions` : "No questions match"}</Button>
              <p className="mt-3 text-xs text-muted">One question per skill, with mistakes, due reviews and unseen questions first.</p>
            </Card>
            <Card className="mt-4">
              <h2 className="font-semibold">Mock exam</h2>
              <p className="mt-1 text-sm text-muted">50 questions · 90 minutes · covers every section, ignoring the filters here.</p>
              <Button variant="secondary" className="mt-3 w-full" onClick={() => setMock(true)}>Start a mock exam</Button>
            </Card>
          </aside>
        </div>
      )}
    </Page>
  );
}

export function ProgressPage() {
  const { ready, pool, stats, now, streak, progress } = useApp();
  const ins = useInsights();
  const line = useProfileLine();
  const { run, dialog } = useStarter();
  const [open, setOpen] = useState<string | null>(null);
  if (!ready) return <Page><Spinner /></Page>;
  const practise = (t: TopicStat) => run(chooseSmart(pool.filter(q => q.section === t.section && q.topic === t.topic), 15, stats, now), false, t.topic);
  const today = dayNumber(now);
  const last14 = Array.from({ length: 14 }, (_, i) => today - 13 + i).map(d => ({ d, n: progress.attempts.filter(a => dayNumber(a.createdAt) === d).length }));
  const peak = Math.max(1, ...last14.map(x => x.n));
  const bySection: [string, TopicStat[]][] = [];
  for (const t of ins.topics) { const last = bySection[bySection.length - 1]; if (last && last[0] === t.section) last[1].push(t); else bySection.push([t.section, [t]]); }
  const mocks = ins.mocks;
  return (
    <Page>
      {dialog}
      <PageHeader eyebrow="Progress" title="How you're doing">{line}</PageHeader>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={pct(ins.accuracy, ins.attempts > 0)} label="accuracy" />
        <Stat value={ins.attempts} label={ins.attempts === 1 ? "answer" : "answers"} />
        <Stat value={streak} label="day streak" />
        <Stat value={mocks.length} label="mock exams" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle>Last 14 days</SectionTitle>
          <Card>
            <div className="flex h-28 items-end gap-1.5" role="img" aria-label={`Answers per day over the last 14 days: ${last14.map(x => x.n).join(", ")}`}>
              {last14.map(x => <div key={x.d} className="flex flex-1 flex-col items-center gap-1"><div className={cx("w-full rounded-t", x.d === today ? "bg-accent" : "bg-brand")} style={{ height: `${(x.n / peak) * 100}%`, minHeight: x.n ? 4 : 1 }} /></div>)}
            </div>
            <p className="mt-2 text-xs text-muted">Answers per day. Today is highlighted.</p>
          </Card>
          {mocks.length > 0 && <>
            <SectionTitle>Mock exams</SectionTitle>
            <Card>
              <p className="text-sm">{mocks.length} taken · best {ins.bestMock}% · latest {percent(mocks[0].correct, outOf(mocks[0]))}%
                {mocks.length > 1 && (() => { const d = percent(mocks[0].correct, outOf(mocks[0])) - percent(mocks[1].correct, outOf(mocks[1])); return ` (${d > 0 ? `up ${d}` : d < 0 ? `down ${-d}` : "no change"} since the one before)`; })()}</p>
            </Card>
          </>}
          {ins.weak.length > 0 && <>
            <SectionTitle>Needs work</SectionTitle>
            <div className="grid gap-2">
              {ins.weak.slice(0, 6).map(t => (
                <Card key={t.section + t.topic} className="flex items-center gap-3 py-3">
                  <div className="flex-1"><p className="font-medium">{t.topic}</p><p className="text-xs text-muted">{t.section.replace(/^[A-Z]\.\s*/, "")} · {Math.round(accuracy(t) * 100)}% of {t.attempts} answers</p></div>
                  <Button variant="ghost" onClick={() => practise(t)}>Practise</Button>
                </Card>
              ))}
            </div>
          </>}
        </section>
        <section>
          <SectionTitle>By section</SectionTitle>
          <Card className="p-2">
            {bySection.length === 0 && <p className="p-3 text-sm text-muted">No questions for this profile yet.</p>}
            {bySection.map(([section, ts]) => {
              const q = ts.reduce((n, t) => n + t.questions, 0), seen = ts.reduce((n, t) => n + t.seen, 0);
              const att = ts.reduce((n, t) => n + t.attempts, 0), cor = ts.reduce((n, t) => n + t.correct, 0);
              return (
                <div key={section} className="border-b border-line last:border-0">
                  <button type="button" className="flex w-full items-center gap-3 p-3 text-left hover:bg-surface-2" aria-expanded={open === section} onClick={() => setOpen(open === section ? null : section)}>
                    <span className="flex-1"><span className="block text-sm font-medium">{section}</span><Bar value={q ? seen / q : 0} className="mt-2" /></span>
                    <span className="w-28 text-right text-xs text-muted">{seen}/{q} seen<br />{att ? `${Math.round((cor * 100) / att)}% correct` : "not started"}</span>
                    <ChevronDown size={16} className={cx("text-muted transition-transform", open === section && "rotate-180")} />
                  </button>
                  {open === section && <ul className="px-3 pb-3">{ts.map(t => (
                    <li key={t.topic} className="flex items-center gap-3 py-1.5 text-sm">
                      <span className="flex-1">{t.topic}</span><span className="text-xs text-muted">{t.seen}/{t.questions} · {t.attempts ? `${Math.round(accuracy(t) * 100)}%` : "—"}</span>
                      <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={() => practise(t)}>Practise</button>
                    </li>))}</ul>}
                </div>
              );
            })}
          </Card>
          <SectionTitle>Recent sessions</SectionTitle>
          {ins.results.length === 0 ? <p className="text-sm text-muted">Finished practice sets and mock exams appear here.</p> : (
            <Card className="p-0">
              <ul>{ins.results.slice(0, 12).map(r => (
                <li key={r.token} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                  <span className={cx("w-14 rounded-lg py-1 text-center text-sm font-bold", r.exam ? "bg-accent-soft text-accent" : "bg-surface-2 text-brand")}>{percent(r.correct, outOf(r))}%</span>
                  <span className="flex-1"><span className="block text-sm font-medium">{r.label}</span>
                    <span className="text-xs text-muted">{r.correct}/{outOf(r)} correct · {new Date(r.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}{r.durationMs ? ` · ${formatDuration(r.durationMs)}` : ""}</span></span>
                </li>))}</ul>
            </Card>
          )}
        </section>
      </div>
    </Page>
  );
}

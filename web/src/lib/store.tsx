import type { Session as AuthSession } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { countryApplies, questionSubject, SUBJECTS, type Country } from "../../shared/catalog";
import { dayNumber, gradedQuestions, statsFrom, streak, summarize, type Attempt, type QStat, type Session, type SessionResult } from "../../shared/insights";
import type { Question } from "../../shared/questions";
import { EXAM_MS } from "../config";
import { api, ApiError } from "./api";

/** The server permanently refused this item (e.g. its questions were removed): retrying won't help. */
const rejected = (e: unknown) => e instanceof ApiError && (e.status === 400 || e.status === 404);
import { load, save } from "./storage";
import { supabase } from "./supabase";

export type Profile = { country: Country; subjectId: string; examYear: number; examSeries: "school" | "private"; includeMarked: boolean };
export type PackInfo = { id: string; title: string; version: string; subject_id: string; countries: string[]; exam_year: number | null; exam_series: string; count: number };
type Progress = { attempts: Attempt[]; bookmarks: string[]; results: SessionResult[] };

const DEFAULT_PROFILE: Profile = { country: "SL", subjectId: "mathematics", examYear: 2026, examSeries: "school", includeMarked: false };
const EMPTY: Progress = { attempts: [], bookmarks: [], results: [] };
// pending: finished sessions not yet stored on the server (a guest's, until sign-in; or a failed upload), retried later.
const K = { profile: "ws.profile", session: "ws.session", local: "ws.progress", pending: "ws.pending" };

export const matchesProfile = (q: Question, p: Profile) =>
  questionSubject(q) === p.subjectId && countryApplies(q.countries, p.country) &&
  (q.exam_year == null || q.exam_year === p.examYear) && (!q.exam_series || q.exam_series === "both" || q.exam_series === p.examSeries);

type Ctx = {
  ready: boolean; loadError: string; auth: AuthSession | null; admin: boolean;
  profile: Profile; setProfile: (p: Partial<Profile>) => void;
  bank: Question[]; byId: Map<string, Question>; packs: PackInfo[];
  /** Questions for the current profile (subject, country, year, series), respecting the marked-topics switch. */
  pool: Question[]; profileBank: Question[];
  progress: Progress; stats: Map<string, QStat>; streak: number; now: number;
  session: Session | null; sessionQuestions: Question[];
  start: (qs: Question[], exam: boolean, label: string) => void;
  update: (s: Session) => void; check: (q: Question) => Promise<void>; finish: () => Promise<void>; discard: () => void;
  toggleBookmark: (id: string) => Promise<void>;
  notice: string; setNotice: (n: string) => void; refresh: () => Promise<void>;
};
const AppContext = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(AppContext); if (!c) throw new Error("useApp outside AppProvider"); return c; };

export function AppProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [profile, setProfileState] = useState<Profile>(() => ({ ...DEFAULT_PROFILE, ...load<Partial<Profile>>(K.profile, {}) }));
  const [core, setCore] = useState<Question[] | null>(null);
  const [packQs, setPackQs] = useState<Question[]>([]);
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [loadError, setLoadError] = useState("");
  const [progress, setProgress] = useState<Progress>(() => load(K.local, EMPTY));
  const [session, setSession] = useState<Session | null>(() => load<Session | null>(K.session, null));
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const userId = auth?.user.id ?? null;

  // Sign-in state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setAuth(data.session); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Question bank: the core bank ships with the app (separate chunk); published packs come from the API.
  useEffect(() => {
    import("../../shared/bank").then(m => setCore(m.coreQuestions)).catch(() => setLoadError("The question bank could not be loaded. Refresh the page to try again."));
    api<{ packs: PackInfo[]; questions: Question[] }>("/catalog").then(c => { setPacks(c.packs); setPackQs(c.questions); }).catch(() => { /* core bank still works offline */ });
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) { setProgress(load(K.local, EMPTY)); setAdmin(false); return; }
    const [me, p] = await Promise.all([
      api<{ admin: boolean }>("/me"),
      api<{ attempts: Attempt[]; bookmarks: string[]; sessions: SessionResult[] }>("/progress"),
    ]);
    setAdmin(me.admin);
    setProgress({ attempts: p.attempts, bookmarks: p.bookmarks, results: p.sessions });
  }, [userId]);

  /** Uploads finished sessions the server doesn't have yet. Each is removed only once stored; the server ignores repeats. */
  const flushPending = useCallback(async () => {
    let pending = load<Session[]>(K.pending, []);
    while (pending.length) {
      try { await api("/sessions", { body: pending[0] }); } catch (e) { if (!rejected(e)) return false; }
      pending = pending.slice(1); save(K.pending, pending.length ? pending : null);
    }
    return true;
  }, []);

  // On sign-in: move progress saved in this browser into the account, then load the account's progress.
  // Each part is removed from the browser only after it has been stored, so a failure loses nothing.
  const imported = useRef<string | null>(null);
  useEffect(() => {
    if (!authReady) return;
    (async () => {
      if (userId && imported.current !== userId) {
        imported.current = userId;
        let local = load<Progress>(K.local, EMPTY);
        const sessions = load<Session[]>(K.pending, []).length;
        const answers = local.attempts.length;
        let complete = true;
        try {
          // Answers first, so each keeps the time it was checked; then whole sessions (repeats are ignored by the server).
          for (let i = 0; i < local.attempts.length; i += 1000) {
            await api("/attempts", { body: { attempts: local.attempts.slice(i, i + 1000).map(a => ({ key: a.key, questionId: a.questionId, answer: a.answer, createdAt: a.createdAt })) } });
          }
          local = { ...local, attempts: [], results: [] };
        } catch { complete = false; }
        if (complete) complete = await flushPending();
        const failed: string[] = [];
        for (const id of local.bookmarks) await api("/bookmarks", { body: { questionId: id, saved: true } }).catch(e => { if (!rejected(e)) failed.push(id); });
        local = { ...local, bookmarks: failed };
        if (failed.length) complete = false;
        save(K.local, local.attempts.length || local.bookmarks.length ? local : null);
        if (answers || sessions) setNotice(complete ? `Your progress from this browser (${answers} answer${answers === 1 ? "" : "s"}, ${sessions} session${sessions === 1 ? "" : "s"}) is now saved to your account.`
          : "Some of your progress from this browser couldn't be saved yet. It's kept here and will be retried next time you sign in.");
        if (!complete) imported.current = null;
      }
      await refresh().catch(e => setLoadError((e as Error).message));
    })();
  }, [authReady, userId, refresh, flushPending]);

  // Retry pending uploads when the connection comes back.
  useEffect(() => {
    if (!userId) return;
    const retry = () => { void flushPending().then(ok => { if (ok) void refresh(); }); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [userId, flushPending, refresh]);

  const setProfile = useCallback((p: Partial<Profile>) => setProfileState(old => { const next = { ...old, ...p }; save(K.profile, next); return next; }), []);
  const persistSession = useCallback((s: Session | null) => { save(K.session, s); setSession(s); }, []);
  const persistLocal = useCallback((fn: (p: Progress) => Progress) => setProgress(old => { const next = fn(old); if (!userId) save(K.local, next); return next; }), [userId]);

  const bank = useMemo(() => [...(core ?? []), ...packQs], [core, packQs]);
  const byId = useMemo(() => new Map(bank.map(q => [q.id, q])), [bank]);
  const profileBank = useMemo(() => bank.filter(q => matchesProfile(q, profile)), [bank, profile]);
  const pool = useMemo(() => profileBank.filter(q => profile.includeMarked || q.syllabus_scope !== "marked"), [profileBank, profile.includeMarked]);
  const stats = useMemo(() => statsFrom(progress.attempts), [progress.attempts]);
  const days = useMemo(() => new Set(progress.attempts.map(a => dayNumber(a.createdAt))), [progress.attempts]);
  const sessionQuestions = useMemo(() => (session ? session.ids.map(id => byId.get(id)).filter((q): q is Question => !!q) : []), [session, byId]);

  const localAttempt = (q: Question, token: string, answer: string, at: number): Attempt =>
    ({ key: `${token}/${q.id}`, questionId: q.id, answer, correct: answer === q.correct_option, createdAt: at, subjectId: questionSubject(q), section: q.section, topic: q.topic });

  const start = useCallback((qs: Question[], exam: boolean, label: string) => {
    if (!qs.length) return;
    const at = Date.now();
    persistSession({ token: crypto.randomUUID(), ids: qs.map(q => q.id), exam, label, subjectId: questionSubject(qs[0]), index: 0, responses: {}, revealed: [], flagged: [],
      startedAt: at, deadline: exam ? at + EXAM_MS : 0, finished: false, finishedAt: 0, country: profile.country, examYear: profile.examYear });
    setNow(at);
  }, [persistSession, profile.country, profile.examYear]);

  const check = useCallback(async (q: Question) => {
    if (!session) return;
    const answer = session.responses[q.id]; if (!answer) return;
    persistSession({ ...session, revealed: [...new Set([...session.revealed, q.id])] });
    const a = localAttempt(q, session.token, answer, Date.now());
    if (userId) {
      setProgress(p => ({ ...p, attempts: p.attempts.some(x => x.key === a.key) ? p.attempts : [a, ...p.attempts] }));
      await api("/attempts", { body: { attempts: [{ key: a.key, questionId: q.id, answer }], country: session.country, examYear: session.examYear } })
        .catch(() => setNotice("Your answer couldn't be saved to your account. Check your connection."));
    } else persistLocal(p => ({ ...p, attempts: p.attempts.some(x => x.key === a.key) ? p.attempts : [a, ...p.attempts].slice(0, 20000) }));
  }, [session, userId, persistSession, persistLocal]);

  const finishing = useRef(false);
  const finish = useCallback(async () => {
    const s = session; if (!s || s.finished || finishing.current) return;
    finishing.current = true;
    const at = Date.now();
    const chosen = s.ids.map(id => byId.get(id)).filter((q): q is Question => !!q);
    if (chosen.length !== s.ids.length) { finishing.current = false; return; } // questions still loading: never score a partial session
    const done: Session = { ...s, finished: true, finishedAt: at };
    persistSession(done);
    // Queue first, so the session reaches the account even if this upload fails or the tab closes.
    save(K.pending, [...load<Session[]>(K.pending, []).filter(x => x.token !== done.token), done].slice(-100));
    try {
      if (userId) {
        if (await flushPending()) await refresh();
        else setNotice("Your results are shown here but couldn't be saved to your account yet. They'll be sent when you're back online.");
      } else {
        const result = summarize(done, chosen, at);
        persistLocal(p => {
          const keys = new Set(p.attempts.map(a => a.key));
          const fresh = gradedQuestions(done, chosen).map(q => localAttempt(q, s.token, s.responses[q.id] ?? "", at)).filter(a => !keys.has(a.key));
          return { ...p, attempts: [...fresh, ...p.attempts].slice(0, 20000), results: [result, ...p.results].slice(0, 100) };
        });
      }
    } finally { finishing.current = false; }
  }, [session, byId, userId, persistSession, persistLocal, refresh, flushPending]);

  // Exam clock: auto-submits when time runs out, even if the exam page isn't open.
  useEffect(() => {
    if (!session?.exam || session.finished) return;
    // Only submit once sign-in state and all of this session's questions have loaded.
    const loaded = authReady && sessionQuestions.length === session.ids.length;
    const t = setInterval(() => { const n = Date.now(); setNow(n); if (n >= session.deadline && loaded) void finish(); }, 500);
    return () => clearInterval(t);
  }, [session, finish, authReady, sessionQuestions.length]);

  const toggleBookmark = useCallback(async (id: string) => {
    const saved = !progress.bookmarks.includes(id);
    const next = (p: Progress) => ({ ...p, bookmarks: saved ? [...p.bookmarks, id] : p.bookmarks.filter(b => b !== id) });
    if (userId) { setProgress(next); await api("/bookmarks", { body: { questionId: id, saved } }).catch(() => { setProgress(p => ({ ...p, bookmarks: progress.bookmarks })); setNotice("Couldn't update saved questions. Check your connection."); }); }
    else persistLocal(next);
  }, [progress.bookmarks, userId, persistLocal]);

  const value: Ctx = {
    ready: !!core && authReady, loadError, auth, admin, profile, setProfile, bank, byId, packs, pool, profileBank, progress, stats,
    streak: streak(days, dayNumber(now)), now, session, sessionQuestions, start,
    update: persistSession, check, finish, discard: () => persistSession(null), toggleBookmark, notice, setNotice, refresh,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const subjectOf = (id: string) => SUBJECTS.find(s => s.id === id) ?? SUBJECTS[0];

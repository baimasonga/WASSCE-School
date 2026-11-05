import type { Session as AuthSession } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { countryApplies, questionSubject, SUBJECTS, type Country } from "../../shared/catalog";
import { dayNumber, gradedQuestions, statsFrom, streak, summarize, type Attempt, type QStat, type Session, type SessionResult } from "../../shared/insights";
import type { Question } from "../../shared/questions";
import { EXAM_MS } from "../config";
import { api } from "./api";
import { load, save } from "./storage";
import { supabase } from "./supabase";

export type Profile = { country: Country; subjectId: string; examYear: number; examSeries: "school" | "private"; includeMarked: boolean };
export type PackInfo = { id: string; title: string; version: string; subject_id: string; countries: string[]; exam_year: number | null; exam_series: string; count: number };
type Progress = { attempts: Attempt[]; bookmarks: string[]; results: SessionResult[] };

const DEFAULT_PROFILE: Profile = { country: "SL", subjectId: "mathematics", examYear: 2026, examSeries: "school", includeMarked: false };
const EMPTY: Progress = { attempts: [], bookmarks: [], results: [] };
const K = { profile: "ws.profile", session: "ws.session", local: "ws.progress" };

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

  // On sign-in: move progress saved in this browser into the account once, then load the account's progress.
  const imported = useRef<string | null>(null);
  useEffect(() => {
    if (!authReady) return;
    (async () => {
      if (userId && imported.current !== userId) {
        imported.current = userId;
        const local = load<Progress>(K.local, EMPTY);
        try {
          for (let i = 0; i < local.attempts.length; i += 1000) {
            await api("/attempts", { body: { attempts: local.attempts.slice(i, i + 1000).map(a => ({ key: a.key, questionId: a.questionId, answer: a.answer, createdAt: a.createdAt })) } });
          }
          for (const id of local.bookmarks) await api("/bookmarks", { body: { questionId: id, saved: true } }).catch(() => undefined);
          if (local.attempts.length || local.bookmarks.length) {
            save(K.local, null);
            setNotice(`Your progress from this browser (${local.attempts.length} answers) is now saved to your account.`);
          }
        } catch { /* keep local copy; try again next sign-in */ imported.current = null; }
      }
      await refresh().catch(e => setLoadError((e as Error).message));
    })();
  }, [authReady, userId, refresh]);

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
    persistSession({ ...s, finished: true, finishedAt: at });
    try {
      if (userId) {
        await api("/sessions", { body: s });
        await refresh();
      } else {
        const result = summarize(s, chosen, at);
        persistLocal(p => {
          const keys = new Set(p.attempts.map(a => a.key));
          const fresh = gradedQuestions(s, chosen).map(q => localAttempt(q, s.token, s.responses[q.id] ?? "", at)).filter(a => !keys.has(a.key));
          return { ...p, attempts: [...fresh, ...p.attempts].slice(0, 20000), results: [result, ...p.results].slice(0, 100) };
        });
      }
    } catch { setNotice("Your results are shown here but couldn't be saved to your account. Check your connection."); }
    finally { finishing.current = false; }
  }, [session, byId, userId, persistSession, persistLocal, refresh]);

  // Exam clock: auto-submits when time runs out, even if the exam page isn't open.
  useEffect(() => {
    if (!session?.exam || session.finished) return;
    const t = setInterval(() => { const n = Date.now(); setNow(n); if (n >= session.deadline) void finish(); }, 500);
    return () => clearInterval(t);
  }, [session, finish]);

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

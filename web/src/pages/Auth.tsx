import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { COUNTRIES, SUBJECTS, type Country } from "../../shared/catalog";
import { Button, Card, Dialog, Notice, PageHeader } from "../components/ui";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";

const input = "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-medium">{label}{children}</label>; }
function Shell({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-12"><PageHeader title={title}>{sub}</PageHeader><Card>{children}</Card></div>;
}
const friendly = (m: string) => /invalid login/i.test(m) ? "Wrong email or password, or your email isn't confirmed yet." : /rate limit/i.test(m) ? "Too many attempts. Wait a few minutes and try again." : m;
const origin = () => window.location.origin;

export function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(friendly(error.message)); else navigate("/learn");
  };
  return (
    <Shell title="Sign in" sub={<>New here? <Link to="/signup" className="font-semibold text-brand hover:underline">Create a free account</Link></>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Email"><input className={input} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input className={input} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></Field>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <Link to="/forgot-password" className="text-center text-sm text-brand hover:underline">Forgot your password?</Link>
      </form>
    </Shell>
  );
}

export function SignUp() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${origin()}/learn` } });
    setBusy(false);
    if (error) setError(friendly(error.message)); else setSent(true);
  };
  if (sent) return <Shell title="Check your email"><p className="text-muted">We sent a confirmation link to <strong className="text-ink">{email}</strong>. Open it to finish creating your account, then sign in. Check your spam folder if it doesn't arrive within a few minutes.</p></Shell>;
  return (
    <Shell title="Create your account" sub={<>Already have one? <Link to="/signin" className="font-semibold text-brand hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Email"><input className={input} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input className={input} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></Field>
        <p className="text-xs text-muted">At least 8 characters. Progress you've made in this browser moves into your account when you first sign in.</p>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
      </form>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin()}/reset-password` });
    if (error) setError(friendly(error.message)); else setSent(true);
  };
  return (
    <Shell title="Reset your password">
      {sent ? <p className="text-muted">If an account exists for <strong className="text-ink">{email}</strong>, you'll get an email with a link to choose a new password.</p> : (
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Email"><input className={input} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
          {error && <Notice tone="bad">{error}</Notice>}
          <Button type="submit">Send reset link</Button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const { auth } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState(""); const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(friendly(error.message)); else navigate("/learn");
  };
  return (
    <Shell title="Choose a new password">
      {!auth ? <p className="text-muted">Open this page from the link in your reset email. Links expire after a while; <Link to="/forgot-password" className="text-brand underline">request a new one</Link> if needed.</p> : (
        <form onSubmit={submit} className="grid gap-4">
          <Field label="New password"><input className={input} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></Field>
          {error && <Notice tone="bad">{error}</Notice>}
          <Button type="submit">Save password</Button>
        </form>
      )}
    </Shell>
  );
}

export function Account() {
  const { auth, profile, setProfile, refresh, setNotice } = useApp();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { document.title = "Account · WASSCE School"; }, []);
  const select = "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink";
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader eyebrow="Account" title="Your exam and account" />
      <Card>
        <h2 className="font-semibold">Your exam</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Country"><select className={select} value={profile.country} onChange={e => setProfile({ country: e.target.value as Country })}>{COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Subject"><select className={select} value={profile.subjectId} onChange={e => setProfile({ subjectId: e.target.value })}>{SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Exam year"><select className={select} value={profile.examYear} onChange={e => setProfile({ examYear: Number(e.target.value) })}>{[2026, 2027, 2028, 2029, 2030].map(y => <option key={y}>{y}</option>)}</select></Field>
          <Field label="Candidates"><select className={select} value={profile.examSeries} onChange={e => setProfile({ examSeries: e.target.value as "school" | "private" })}><option value="school">School candidates</option><option value="private">Private candidates</option></select></Field>
        </div>
        <p className="mt-3 text-xs text-muted">Subject availability depends on country, year and series. Confirm your registration subjects with your school or national WAEC office.</p>
      </Card>
      <Card className="mt-4">
        <h2 className="font-semibold">Sign-in</h2>
        {auth ? <>
          <p className="mt-1 text-sm text-muted">Signed in as <strong className="text-ink">{auth.user.email}</strong>. Your progress is saved to your account.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>Sign out</Button>
            <Button variant="ghost" className="text-bad" onClick={() => setConfirm(true)}>Delete my learning data</Button>
          </div>
        </> : <>
          <p className="mt-1 text-sm text-muted">You're not signed in. Progress is saved in this browser only.</p>
          <div className="mt-4 flex gap-2"><Button onClick={() => navigate("/signup")}>Create account</Button><Button variant="secondary" onClick={() => navigate("/signin")}>Sign in</Button></div>
        </>}
      </Card>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Delete your learning data?"
        actions={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={async () => { setConfirm(false); try { await api("/me/data", { method: "DELETE" }); await refresh(); setNotice("Your answers, saved questions and results were deleted."); } catch (e) { setNotice((e as Error).message); } }}>Delete</Button></>}>
        This permanently deletes your answers, saved questions and session history. Your sign-in stays, so you can start again.
      </Dialog>
    </div>
  );
}

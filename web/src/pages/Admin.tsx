import { Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { subjectName } from "../../shared/catalog";
import { validatePack, type Pack } from "../../shared/questions";
import { Button, Card, Dialog, Notice, PageHeader, SectionTitle, Spinner, cx } from "../components/ui";
import { api } from "../lib/api";
import { useApp } from "../lib/store";

type Row = { id: string; title: string; version: string; subject_id: string; question_count: number; status: "draft" | "published"; updated_at: number };

export function Admin() {
  const { auth, admin, ready } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [preview, setPreview] = useState<Pack | null>(null);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<Row | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const load = useCallback(() => api<{ packs: Row[] }>("/admin/packs").then(r => setRows(r.packs)).catch(e => setError((e as Error).message)), []);
  useEffect(() => { if (admin) void load(); }, [admin, load]);

  if (!ready) return <div className="mx-auto max-w-4xl px-4"><Spinner /></div>;
  if (!auth || !admin) return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <PageHeader title="Publishing">Only publishing accounts can manage question packs.</PageHeader>
      {!auth ? <Link to="/signin" className="font-semibold text-brand hover:underline">Sign in →</Link>
        : <Notice>Signed in as {auth.user.email}, which isn't a publishing account. Ask the site owner to add your email to <code>ADMIN_EMAILS</code>.</Notice>}
    </div>
  );

  const pick = async (f: File | undefined) => {
    setError(""); setMessage(""); setPreview(null);
    if (!f) return;
    if (f.size > 750_000) return setError("This file is over the 750 KB limit.");
    try { setPreview(validatePack(JSON.parse(await f.text()))); } catch (e) { setError(e instanceof SyntaxError ? "This isn't valid JSON." : (e as Error).message); }
    if (file.current) file.current.value = "";
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setError(""); setMessage("");
    try { await fn(); setMessage(ok); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader eyebrow="Publishing" title="Question packs">Upload a pack to check it, publish it for web practice and Android download, or take it back to draft.</PageHeader>
      <Card>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line p-8 text-center hover:bg-surface-2">
          <Upload className="text-brand" /><span className="font-semibold">Choose a JSON question pack</span>
          <span className="text-sm text-muted">Format 2 with subject, countries, year and series. Up to 750 KB and 1,000 questions. Checked here before uploading.</span>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={e => pick(e.target.files?.[0])} />
        </label>
        {error && <div className="mt-4"><Notice tone="bad">{error}</Notice></div>}
        {message && <div className="mt-4"><Notice>{message}</Notice></div>}
        {preview && (
          <div className="mt-5 rounded-xl bg-surface-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-good">Valid · ready to upload as a draft</p>
            <p className="mt-1 font-semibold">{preview.title} <span className="font-normal text-muted">({preview.pack_id} · v{preview.version})</span></p>
            <p className="text-sm text-muted">{subjectName(preview.subject_id)} · {preview.questions.length} question{preview.questions.length === 1 ? "" : "s"} · {(preview.countries ?? ["SL", "LR", "GM"]).join(", ")} · {preview.exam_year ?? "any year"} · {preview.exam_series ?? "both"} series</p>
            <div className="mt-3 rounded-lg bg-surface p-3 text-sm"><p className="font-medium">Q1. {preview.questions[0].question}</p>
              <p className="mt-1 text-muted">{Object.entries(preview.questions[0].options).map(([k, v]) => `${k}. ${v}`).join("  ·  ")} — answer {preview.questions[0].correct_option}</p></div>
            {rows?.some(r => r.id === preview.pack_id) && <p className="mt-2 text-sm text-accent">A pack with this ID exists. Uploading replaces it and returns it to draft until you publish again.</p>}
            <div className="mt-3 flex gap-2">
              <Button disabled={busy} onClick={() => act(async () => { await api("/admin/packs", { body: preview }); setPreview(null); }, "Uploaded as a draft. Publish it when you're ready.")}>Upload draft</Button>
              <Button variant="secondary" onClick={() => setPreview(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>
      <SectionTitle>Your packs</SectionTitle>
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-sm text-muted">No packs yet. The built-in mathematics bank is always available.</p> : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {rows.map(r => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1"><span className="block font-medium">{r.title}</span>
                <span className="text-xs text-muted">{r.id} · v{r.version} · {subjectName(r.subject_id)} · {r.question_count} question{r.question_count === 1 ? "" : "s"} · updated {new Date(r.updated_at).toLocaleDateString()}</span></span>
              <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-semibold", r.status === "published" ? "bg-brand-soft text-brand-strong" : "bg-surface-2 text-muted")}>{r.status === "published" ? "Published" : "Draft"}</span>
              <Button variant="secondary" disabled={busy} onClick={() => act(() => api(`/admin/packs/${r.id}/status`, { body: { status: r.status === "published" ? "draft" : "published" } }), r.status === "published" ? "Moved back to draft." : "Published.")}>
                {r.status === "published" ? "Unpublish" : "Publish"}</Button>
              <Button variant="ghost" className="text-bad" disabled={busy} onClick={() => setRemove(r)}>Delete</Button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-muted">Publish original or licensed questions only. Country-marked content should be reviewed by a local teacher. Don't reuse question IDs for different questions: learners' progress is keyed by ID.</p>
      <Dialog open={!!remove} onClose={() => setRemove(null)} title={`Delete ${remove?.title}?`}
        actions={<><Button variant="secondary" onClick={() => setRemove(null)}>Cancel</Button><Button variant="danger" onClick={() => { const r = remove!; setRemove(null); void act(() => api(`/admin/packs/${r.id}`, { method: "DELETE" }), "Deleted."); }}>Delete</Button></>}>
        The pack is removed from the website and Android downloads. Learners keep their past answers.
      </Dialog>
    </div>
  );
}

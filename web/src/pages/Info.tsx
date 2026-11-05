import { Download, ExternalLink, FlaskConical, Smartphone } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { CATALOG_SOURCES, COUNTRIES, COUNTRY_NOTES, SUBJECTS, countryApplies, questionSubject, subjectStatus, type Country } from "../../shared/catalog";
import { Button, Card, Chip, LinkButton, Notice, PageHeader, SectionTitle, cx } from "../components/ui";
import { APK_URL, RELEASES_URL } from "../config";
import { useApp } from "../lib/store";

const Page = ({ children, narrow }: { children: ReactNode; narrow?: boolean }) => <div className={cx("mx-auto px-4 py-8 sm:py-10", narrow ? "max-w-3xl" : "max-w-6xl")}>{children}</div>;

export function Subjects() {
  const { profile, setProfile, bank } = useApp();
  const [country, setCountry] = useState<Country>(profile.country);
  const [open, setOpen] = useState<string | null>(null);
  const counts = new Map<string, number>();
  for (const q of bank) if (countryApplies(q.countries, country)) counts.set(questionSubject(q), (counts.get(questionSubject(q)) ?? 0) + 1);
  const categories = [...new Set(SUBJECTS.map(s => s.category))];
  return (
    <Page>
      <PageHeader eyebrow="Subjects" title="Find your subject">Choose your country, then a WASSCE subject. Mathematics has a full question bank now; other subjects show topic outlines while their questions are prepared.</PageHeader>
      <div className="flex flex-wrap gap-2">{COUNTRIES.map(c => <Chip key={c.id} selected={country === c.id} onClick={() => setCountry(c.id)}>{c.name}</Chip>)}</div>
      <p className="mt-3 max-w-3xl text-xs text-muted">{COUNTRY_NOTES[country]}</p>
      {categories.map(cat => (
        <section key={cat}>
          <SectionTitle>{cat}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.filter(s => s.category === cat).map(s => {
              const n = counts.get(s.id) ?? 0, active = profile.subjectId === s.id && profile.country === country;
              const status = subjectStatus(s, country, profile.examYear, profile.examSeries);
              return (
                <Card key={s.id} className={cx("flex flex-col", active && "border-brand")}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{s.name}</h3>
                    <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", n ? "bg-brand-soft text-brand-strong" : "bg-surface-2 text-muted")}>{n ? `${n} questions` : "Coming soon"}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{status}</p>
                  <button type="button" className="mt-2 self-start text-xs font-semibold text-brand hover:underline" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                    {open === s.id ? "Hide topics" : "Show topics"}</button>
                  {open === s.id && <p className="mt-1 text-sm text-muted">{s.topics.join(" · ")}</p>}
                  <div className="mt-auto pt-4">
                    {active ? <span className="text-sm font-semibold text-brand">✓ Your subject</span>
                      : <Button variant="secondary" className="w-full" onClick={() => setProfile({ subjectId: s.id, country })}>Study {s.name}</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
      <p className="mt-10 text-xs text-muted">Topic outlines for subjects awaiting content are planning guides, not a verified complete syllabus. Sources checked:{" "}
        {CATALOG_SOURCES.map((s, i) => <span key={s.url}>{i > 0 && " · "}<a href={s.url} className="underline" target="_blank" rel="noreferrer">{s.label}</a></span>)}.</p>
    </Page>
  );
}

export function Lab() {
  return (
    <Page narrow>
      <PageHeader eyebrow="Chemistry · virtual practicals" title="Learn by experimenting">Set up apparatus, add reagents, record observations and practise WASSCE Paper 3 skills on an interactive bench.</PageHeader>
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><FlaskConical size={32} /></span>
        <div className="flex-1">
          <h2 className="font-semibold">WASSCE virtual Chemistry laboratory</h2>
          <p className="mt-1 text-sm text-muted">Titrations, salt analysis, gas tests, rates of reaction and a timed mock practical. Choose a mission or use the free lab.</p>
        </div>
        <a href="/chemistry-lab/index.html" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-ink hover:bg-brand-strong">Open the lab <ExternalLink size={16} /></a>
      </Card>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card><h3 className="font-semibold">For classes</h3><p className="mt-1 text-sm text-muted">Students can join a class with a code from their teacher, and results go to the teacher.</p>
          <a href="/chemistry-lab/teacher.html" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Teacher dashboard →</a></Card>
        <Card><h3 className="font-semibold">Offline on Android</h3><p className="mt-1 text-sm text-muted">The Android app includes the same lab and works without internet.</p>
          <Link to="/download" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Get the app →</Link></Card>
      </div>
      <p className="mt-6 text-xs text-muted">Lab scores are separate from question practice. Simulations support learning; real laboratory work needs teacher supervision. On a small screen, turn your phone sideways for more bench space.</p>
    </Page>
  );
}

export function DownloadPage() {
  const { packs, profile } = useApp();
  const mine = packs.filter(p => p.subject_id === profile.subjectId && countryApplies(p.countries, profile.country));
  return (
    <Page narrow>
      <PageHeader eyebrow="Android app" title="Practise anywhere, even offline">Download once, then keep practising without data. Your progress stays on your phone.</PageHeader>
      <Card className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-brand-ink"><Smartphone size={24} /></span>
            <div><h2 className="font-semibold">WASSCE School for Android</h2><p className="text-sm text-muted">Free · Android 8.0 or newer · about 7 MB</p></div></div>
          <ul className="mt-4 grid gap-1 text-sm text-muted">
            <li>✓ 1,000 maths questions with worked solutions</li><li>✓ Smart practice, progress insights and timed mocks</li><li>✓ The virtual Chemistry lab, offline</li>
          </ul>
        </div>
        <a href={APK_URL} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-brand-ink hover:bg-brand-strong"><Download size={18} /> Download the app</a>
      </Card>
      <SectionTitle>Installing</SectionTitle>
      <ol className="grid list-decimal gap-2 pl-5 text-sm text-muted">
        <li>Tap <strong className="text-ink">Download the app</strong> on your Android phone.</li>
        <li>Open the downloaded file, <code>WASSCE-School.apk</code>.</li>
        <li>If asked, allow installs from your browser, then tap <strong className="text-ink">Install</strong>.</li>
      </ol>
      <Notice tone="warn">New versions install over the old one and keep your progress. If you installed an early test version, uninstall it once first.</Notice>
      <p className="mt-3 text-sm"><a href={RELEASES_URL} className="font-semibold text-brand hover:underline" target="_blank" rel="noreferrer">All versions and release notes →</a></p>
      <SectionTitle>Question packs for the app</SectionTitle>
      <p className="mb-3 text-sm text-muted">Download a pack, then in the app choose <em>More → Import a downloaded JSON pack</em>. Showing packs for your subject and country.</p>
      {mine.length === 0 ? <p className="text-sm text-muted">No packs for this subject yet.</p> : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">{mine.map(p => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex-1"><span className="block text-sm font-medium">{p.title}</span><span className="text-xs text-muted">{p.count} questions · v{p.version}</span></span>
            <a href={`/api/packs/${p.id}.json`} className="text-sm font-semibold text-brand hover:underline" download>Download</a>
          </li>))}</ul>
      )}
    </Page>
  );
}

export function About() {
  return (
    <Page narrow>
      <PageHeader eyebrow="About" title="About WASSCE School" />
      <div className="grid gap-4 text-muted [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:text-ink">
        <p>WASSCE School is a free practice platform for students preparing for the West African Senior School Certificate Examination in Sierra Leone, Liberia and The Gambia, with a companion Android app that works offline.</p>
        <h2>The questions</h2>
        <p>The questions are original practice material written for WASSCE preparation. They are not official WAEC past questions, and WASSCE School is not affiliated with or endorsed by WAEC. Country-marked topics may not be examined everywhere; confirm with your teacher or national WAEC office.</p>
        <h2>Your data</h2>
        <p>Without an account, your progress is stored only in your browser. With an account, we store your email address (for sign-in, via Supabase), and your answers, saved questions and session results so you can use them on any device. We don't sell data, show ads or use tracking cookies. You can delete your learning data at any time from your account page.</p>
        <h2>Contact</h2>
        <p>Questions, corrections or ideas: open an issue on <a href="https://github.com/baimasonga/WASSCE-School/issues" className="text-brand underline">GitHub</a>.</p>
      </div>
    </Page>
  );
}

export function NotFound() {
  return (
    <Page narrow>
      <div className="py-16 text-center">
        <p className="font-display text-6xl font-bold text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This page doesn't exist</h1>
        <LinkButton to="/" className="mt-6">Go home</LinkButton>
      </div>
    </Page>
  );
}

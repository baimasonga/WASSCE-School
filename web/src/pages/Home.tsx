import { ArrowRight, BarChart3, Brain, Clock, FlaskConical, ListChecks, Smartphone } from "lucide-react";
import { COUNTRIES } from "../../shared/catalog";
import { LinkButton } from "../components/ui";
import { useApp } from "../lib/store";

const FEATURES = [
  { icon: ListChecks, title: "Step-by-step solutions", text: "Every question comes with worked steps. Reveal one at a time when you're stuck, or see them all." },
  { icon: Brain, title: "Practice that adapts", text: "Your mistakes and questions due for review come back first, spaced out so they stick." },
  { icon: Clock, title: "Timed mock exams", text: "50 questions in 90 minutes, with a question grid, flags and a full breakdown when you submit." },
  { icon: BarChart3, title: "See where to focus", text: "Accuracy by section and topic, your weakest topics, streaks and mock-exam trends." },
  { icon: FlaskConical, title: "Virtual Chemistry lab", text: "Titrations, salt analysis and gas tests on an interactive bench, plus a timed mock practical." },
  { icon: Smartphone, title: "Works offline on Android", text: "Download the free app once and keep practising without data. Your progress stays on your phone." },
];

export function Home() {
  const { auth } = useApp();
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-surface">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,var(--brand-soft),transparent_70%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              {COUNTRIES.map(c => c.name).join(" · ")}
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">Walk into your WASSCE <span className="text-brand">ready.</span></h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              1,000 original mathematics questions with step-by-step solutions, timed mock exams and practice that focuses on what you still need. Free, online and offline.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="/learn" className="px-6 py-3 text-base">Start practising <ArrowRight size={18} /></LinkButton>
              <LinkButton to="/download" variant="secondary" className="px-6 py-3 text-base"><Smartphone size={18} /> Get the Android app</LinkButton>
            </div>
            {!auth && <p className="mt-4 text-sm text-muted">No account needed to start. Sign up later to keep your progress on every device.</p>}
          </div>
          <SampleCard />
        </div>
      </section>

      <section className="border-b border-line">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center sm:grid-cols-4">
          {[["1,000", "practice questions"], ["3,030", "worked solution steps"], ["38", "WASSCE subjects mapped"], ["Free", "no payment, no ads"]].map(([v, l]) => (
            <div key={l}><dt className="sr-only">{l}</dt><dd className="font-display text-3xl font-bold text-brand">{v}</dd><dd className="text-sm text-muted">{l}</dd></div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight">Everything you need to prepare</h2>
        <p className="mt-2 max-w-2xl text-muted">Built around how students actually improve: practise, understand the working, and come back to what you missed.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><f.icon size={22} /></span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[["Choose your exam", "Pick your country, exam year and subject. Mathematics is ready now; more subjects are on the way."],
              ["Practise a little every day", "Ten questions a day adds up. Check each answer and read the working when you need it."],
              ["Rehearse exam day", "Take a timed mock, review every answer, then practise the topics that pulled your score down."]].map(([t, d], i) => (
              <li key={t} className="rounded-2xl bg-surface-2 p-6">
                <span className="font-display text-3xl font-bold text-accent">{i + 1}</span>
                <h3 className="mt-2 font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-8 rounded-3xl bg-brand p-8 text-brand-ink sm:p-12 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Ready for your first ten questions?</h2>
            <p className="mt-2 opacity-90">It takes about fifteen minutes. No sign-up needed.</p>
          </div>
          <LinkButton to="/learn" variant="secondary" className="px-6 py-3 text-base">Start now <ArrowRight size={18} /></LinkButton>
        </div>
        <p className="mt-6 text-center text-xs text-muted">Original practice material written for WASSCE preparation. Not official WAEC past questions; not affiliated with or endorsed by WAEC.</p>
      </section>
    </>
  );
}

function SampleCard() {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-xl" aria-label="Example question">
      <p className="text-xs font-semibold text-brand">Mathematics · Number bases</p>
      <p className="mt-2 text-lg font-semibold">Convert 11100 (base 2) to base 10.</p>
      <div className="mt-4 grid gap-2 text-sm">
        {[["A", "34", "bad"], ["B", "25", ""], ["C", "28", "good"], ["D", "31", ""]].map(([k, v, s]) => (
          <div key={k} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${s === "good" ? "border-good bg-good-soft" : s === "bad" ? "border-bad bg-bad-soft" : "border-line"}`}>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-3 text-xs font-bold">{k}</span>
            <span className="flex-1">{v}</span>
            {s === "good" && <span className="text-xs font-semibold text-good">✓ Correct</span>}
            {s === "bad" && <span className="text-xs font-semibold text-bad">✗ Your answer</span>}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
        <p className="font-semibold">Worked solution</p>
        <ol className="mt-1 list-decimal pl-5 text-muted">
          <li>Place values from the right: 1, 2, 4, 8, 16.</li>
          <li>1×16 + 1×8 + 1×4 + 0×2 + 0×1 = 28.</li>
        </ol>
      </div>
    </div>
  );
}

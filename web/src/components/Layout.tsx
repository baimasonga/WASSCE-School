import { BookOpen, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useApp } from "../lib/store";
import { cx } from "./ui";

const NAV = [
  { to: "/learn", label: "Learn" },
  { to: "/practice", label: "Practice" },
  { to: "/progress", label: "Progress" },
  { to: "/subjects", label: "Subjects" },
  { to: "/lab", label: "Chemistry lab" },
  { to: "/download", label: "Android app" },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-ink"><BookOpen size={19} /></span>
      <span className="text-[17px] tracking-tight">WASSCE School</span>
    </Link>
  );
}

export function Layout() {
  const { auth, admin, notice, setNotice } = useApp();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 7000); return () => clearTimeout(t); }, [notice, setNotice]);
  const links = admin ? [...NAV, { to: "/admin", label: "Publishing" }] : NAV;
  const link = ({ isActive }: { isActive: boolean }) => cx("rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-ink hover:bg-surface-2");

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">{links.map(l => <NavLink key={l.to} to={l.to} className={link}>{l.label}</NavLink>)}</nav>
          <div className="hidden lg:block">
            {auth ? <NavLink to="/account" className={link}>Account</NavLink>
              : <Link to="/signin" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-strong">Sign in</Link>}
          </div>
          <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" className="border-t border-line bg-surface px-4 py-3 lg:hidden" aria-label="Main">
            <div className="grid gap-1">
              {links.map(l => <NavLink key={l.to} to={l.to} className={link}>{l.label}</NavLink>)}
              <NavLink to={auth ? "/account" : "/signin"} className={link}>{auth ? "Account" : "Sign in"}</NavLink>
            </div>
          </nav>
        )}
      </header>
      {notice && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl bg-ink px-4 py-3 text-sm text-bg shadow-lg" role="status">
          <div className="flex items-start gap-3"><span className="flex-1">{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div>
        </div>
      )}
      <main id="main" className="flex-1"><Outlet /></main>
      {pathname !== "/session" && <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted">Free WASSCE practice for Sierra Leone, Liberia and The Gambia. Original practice material, not affiliated with or endorsed by WAEC.</p>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold">Study</p>
            <ul className="grid gap-1.5 text-muted">
              <li><Link className="hover:text-ink" to="/practice">Practice</Link></li><li><Link className="hover:text-ink" to="/subjects">Subjects</Link></li>
              <li><Link className="hover:text-ink" to="/lab">Chemistry lab</Link></li><li><Link className="hover:text-ink" to="/download">Android app</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold">About</p>
            <ul className="grid gap-1.5 text-muted">
              <li><Link className="hover:text-ink" to="/about">About & privacy</Link></li>
              <li><a className="hover:text-ink" href="/chemistry-lab/teacher.html">Teacher dashboard</a></li>
              <li><a className="hover:text-ink" href="https://github.com/baimasonga/WASSCE-School" rel="noreferrer">Source code</a></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-line py-4 text-center text-xs text-muted">© {new Date().getFullYear()} WASSCE School</p>
      </footer>}
    </div>
  );
}

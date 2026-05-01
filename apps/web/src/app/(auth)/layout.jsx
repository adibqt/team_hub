import Link from "next/link";
import ActivityTicker from "@/components/auth/ActivityTicker";
import { ThemeToggleIcon } from "@/components/ThemeToggle";

const VOLUME = String(new Date().getFullYear()).slice(-2);
const ISSUE = String(Math.ceil((new Date().getMonth() + 1) / 3)).padStart(2, "0");

const FEATURES = [
  {
    n: "01",
    title: "Goals that don't slip",
    body: "Milestone-tracked OKRs with progress sliders and an activity feed every owner actually reads.",
  },
  {
    n: "02",
    title: "Real-time, not real-noisy",
    body: "Live presence, instant updates, and @mentions that route to the right inbox — over WebSockets.",
  },
  {
    n: "03",
    title: "Audit-ready by default",
    body: "Every mutation is captured immutably. Filter by actor, export to CSV, and pass review boards in minutes.",
  },
];

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen flex flex-col lg:grid lg:grid-cols-12 bg-paper text-ink overflow-hidden">
      {/* Aurora — drifting ember + sage glows. Visible only in `.dark`. */}
      <div className="aurora" aria-hidden="true" />
      {/* paper grain over the entire surface */}
      <div className="grain" aria-hidden="true" />

      {/* ============================================================
          MASTHEAD — full width, mono, rules above & below
         ============================================================ */}
      <header className="lg:col-span-12 relative z-10 px-6 sm:px-10 lg:px-14 pt-6 sm:pt-8">
        <div className="flex items-end justify-between gap-6 pb-4 border-b border-ink/15">
          <Link href="/" className="group/logo flex items-baseline gap-3">
            <span
              aria-hidden="true"
              className="font-display italic text-2xl leading-none text-ink"
            >
              T<span className="text-ember">·</span>H
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 hidden sm:inline">
              The Team Hub
            </span>
          </Link>

          <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="hidden md:inline">
              VOL.&nbsp;{VOLUME} <span className="text-ink/25">/</span> ISSUE&nbsp;{ISSUE}
            </span>
            <span className="hidden md:inline-block h-3 w-px bg-ink/15" aria-hidden="true" />
            <span className="flex items-center gap-2">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-ember animate-ping opacity-50" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-ember" />
              </span>
              LIVE
            </span>
            <span className="inline-block h-3 w-px bg-ink/15" aria-hidden="true" />
            <ThemeToggleIcon />
          </div>
        </div>
      </header>

      {/* ============================================================
          EDITORIAL PANEL (left)
         ============================================================ */}
      <aside className="order-2 lg:order-none relative z-10 lg:col-span-7 px-6 sm:px-10 lg:px-14 py-10 lg:py-14 lg:border-r lg:border-ink/15 flex flex-col">
        {/* tag */}
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 flex items-center gap-3 animate-fade-in">
          <span aria-hidden="true" className="inline-block h-px w-8 bg-ink/40" />
          A field manual for shipping teams
        </div>

        {/* MASSIVE editorial headline */}
        <h1 className="mt-8 lg:mt-10 font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] tracking-[-0.02em] text-ink animate-fade-up">
          <span className="block font-light">Where</span>
          <span className="block italic font-normal pl-[0.6em]">
            teams<span className="text-ember">.</span>
          </span>
          <span className="block font-medium">
            ship&nbsp;
            <span className="relative inline-block">
              together
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 -bottom-1 h-[3px] bg-ember origin-left animate-rule-grow"
                style={{ animationDelay: "0.6s" }}
              />
            </span>
          </span>
        </h1>

        <p
          className="mt-7 max-w-xl text-[15px] leading-[1.7] text-ink/70 animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          Goals, action items, announcements, and an immutable audit trail —
          one workspace your team will actually open every day. No flair you
          don't need; every pixel earns its place.
        </p>

        {/* numbered features */}
        <ol
          className="mt-12 lg:mt-16 space-y-7 lg:space-y-8 max-w-xl animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          {FEATURES.map(({ n, title, body }, i) => (
            <li key={n} className="grid grid-cols-[auto_1fr] gap-x-6 lg:gap-x-8">
              <span
                aria-hidden="true"
                className="font-mono text-[11px] tracking-widest2 text-ember-600 pt-1.5"
              >
                {n}
              </span>
              <div>
                <h3 className="font-display italic text-xl lg:text-2xl tracking-tight text-ink">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{body}</p>
                {i < FEATURES.length - 1 && (
                  <div className="hairline text-ink/20 mt-7" aria-hidden="true" />
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* live ticker — fills any remaining vertical space, anchored to bottom */}
        <ActivityTicker />
      </aside>

      {/* ============================================================
          FORM PANEL (right)
         ============================================================ */}
      <main className="order-1 lg:order-none relative z-10 lg:col-span-5 px-6 sm:px-10 lg:px-12 py-10 lg:py-14 flex flex-col items-center">
        {/* Warm desk-lamp spotlight for dark mode only. */}
        <div className="spotlight" aria-hidden="true" />
        <div className="relative w-full max-w-md flex-1 flex flex-col">
          {children}
        </div>

        {/* footer rule */}
        <div className="mt-12 w-full max-w-md">
          <div className="hairline text-ink/20 mb-3" aria-hidden="true" />
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex items-center justify-between gap-4">
            <span>&copy; {new Date().getFullYear()} Team Hub</span>
            <span className="hidden sm:inline">
              Crafted on paper <span className="text-ember">·</span> shipped to web
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}

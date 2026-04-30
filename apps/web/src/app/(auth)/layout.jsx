import Link from "next/link";
import { Layers, Target, MessageSquare, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "Goals that don't slip",
    body: "Milestone-tracked OKRs with progress sliders and an activity feed every owner actually reads.",
  },
  {
    icon: MessageSquare,
    title: "Real-time, not real-noisy",
    body: "Live presence, instant updates, and @mentions that route to the right inbox — over WebSockets.",
  },
  {
    icon: ShieldCheck,
    title: "Audit-ready by default",
    body: "Every mutation is captured immutably. Filter by actor, export to CSV, and pass review boards in minutes.",
  },
];

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* ================= BRAND PANEL ================= */}
      <aside className="relative overflow-hidden lg:flex-1 lg:w-1/2 bg-slate-950 text-white">
        {/* animated mesh blobs */}
        <div className="absolute inset-0 -z-0">
          <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-brand-600/40 blur-3xl animate-blob-1" />
          <div className="absolute top-1/3 -right-32 w-[26rem] h-[26rem] rounded-full bg-violet-500/30 blur-3xl animate-blob-2" />
          <div className="absolute -bottom-24 left-1/4 w-[24rem] h-[24rem] rounded-full bg-fuchsia-500/25 blur-3xl animate-blob-3" />
        </div>
        {/* dot grid */}
        <div className="absolute inset-0 bg-grid-faint bg-grid-24 opacity-60 -z-0" />
        {/* gradient veil to keep text legible */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-950/20 to-slate-950/80 -z-0" />

        <div className="relative z-10 flex flex-col h-full min-h-[280px] lg:min-h-screen p-8 lg:p-14">
          {/* logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 group w-fit">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/50 transition-shadow">
              <Layers size={18} strokeWidth={2.5} className="text-white" />
            </span>
            <span className="font-semibold tracking-tight text-lg">Team Hub</span>
          </Link>

          {/* hero content - hidden on small screens */}
          <div className="hidden lg:flex flex-1 flex-col justify-center max-w-xl mt-10 animate-fade-up">
            <span className="inline-flex items-center gap-2 self-start text-xs font-medium px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Live in your workspace</span>
            </span>

            <h1 className="mt-6 text-4xl xl:text-5xl font-bold tracking-tight leading-[1.1]">
              Where teams
              <br />
              <span className="bg-gradient-to-r from-brand-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                ship together.
              </span>
            </h1>
            <p className="mt-5 text-slate-300/90 text-lg leading-relaxed">
              Goals, action items, announcements, and an immutable audit trail —
              all in one workspace your team will actually open every day.
            </p>

            <ul className="mt-10 space-y-5">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                    <Icon size={17} className="text-brand-300" />
                  </span>
                  <div>
                    <p className="font-medium text-white">{title}</p>
                    <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="hidden lg:block text-xs text-slate-500 mt-8">
            &copy; {new Date().getFullYear()} Team Hub. Crafted for collaborative teams.
          </p>
        </div>
      </aside>

      {/* ================= FORM PANEL ================= */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md animate-fade-up">{children}</div>
      </main>
    </div>
  );
}

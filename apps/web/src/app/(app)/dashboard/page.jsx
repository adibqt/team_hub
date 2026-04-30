"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, Layers } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";
import CreateWorkspaceModal from "@/components/workspaces/CreateWorkspaceModal";

const TODAY = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date());

function firstName(full) {
  if (!full) return "there";
  return full.trim().split(/\s+/)[0];
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { workspaces, load } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.resolve(load()).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [load]);

  const adminCount = workspaces.filter((w) => w.role === "ADMIN").length;
  const memberCount = workspaces.length - adminCount;

  return (
    <div className="relative max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* ============================================================
          PAGE HEADER
         ============================================================ */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8 bg-ember" />
          <span>Dossier · {TODAY}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline tabular-nums">
            FOLIO {String(workspaces.length).padStart(3, "0")}
          </span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] tracking-[-0.02em] text-ink max-w-3xl">
            <span className="font-light">Good to see you,</span>{" "}
            <span className="italic font-normal">
              {firstName(user?.name)}<span className="text-ember">.</span>
            </span>
          </h1>

          <div className="lg:max-w-md">
            <div className="hairline text-ink/20 mb-3" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-ink/65">
              Your bench, your binder. Pick a workspace below to open the
              ledger — or hold the line if a teammate is about to invite you.
            </p>
          </div>
        </div>
      </header>

      {/* ============================================================
          DOSSIER STRIP — micro-stats
         ============================================================ */}
      <section
        aria-label="Workspace summary"
        className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink/15 border-y border-ink/15 animate-fade-up"
        style={{ animationDelay: "0.1s" }}
      >
        <Stat n="01" label="Workspaces" value={loading ? "—" : workspaces.length} />
        <Stat n="02" label="Admin of"   value={loading ? "—" : adminCount} />
        <Stat n="03" label="Member of"  value={loading ? "—" : memberCount} />
        <Stat n="04" label="Status"     value={<LiveDot />} mono />
      </section>

      {/* ============================================================
          WORKSPACES SECTION
         ============================================================ */}
      <section className="mt-14 lg:mt-20" aria-labelledby="ws-heading">
        <div className="flex items-end justify-between gap-6 pb-4 border-b border-ink/15">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-1">
              <span className="text-ember">§</span>&nbsp;Section · 03
            </p>
            <h2
              id="ws-heading"
              className="font-display text-3xl lg:text-4xl tracking-tight text-ink"
            >
              <span className="italic font-normal">Your</span>{" "}
              <span className="font-light">workspaces</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden sm:block font-mono text-[10px] uppercase tracking-widest2 text-ink/40 tabular-nums">
              {loading ? "loading…" : `${workspaces.length} on file`}
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2">
                New workspace
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : workspaces.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-ink/15">
            {workspaces.map((ws, i) => (
              <li key={ws.id} className="bg-paper">
                <WorkspaceCard ws={ws} index={i + 1} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ============================================================
          FOOTER NOTE
         ============================================================ */}
      <footer className="mt-20 pt-6 border-t border-ink/15">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
          <span>End of dossier <span className="text-ember">·</span> Page 01</span>
          <span className="hidden sm:inline">
            Set in Fraunces &amp; Inter Tight <span className="text-ember">·</span> Pressed for the web
          </span>
        </p>
      </footer>

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Subcomponents (top-level — no inline defs)
   ───────────────────────────────────────────── */

function Stat({ n, label, value, mono }) {
  return (
    <div className="bg-paper px-5 lg:px-7 py-6">
      <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 flex items-center gap-2">
        <span className="text-ember tabular-nums">{n}</span>
        <span>{label}</span>
      </p>
      <p
        className={
          mono
            ? "mt-3 font-mono text-base text-ink"
            : "mt-3 font-display text-4xl lg:text-5xl leading-none text-ink tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-ember animate-ping opacity-50" />
        <span className="relative h-2 w-2 rounded-full bg-ember" />
      </span>
      <span className="text-sm tracking-widest2 uppercase">Live</span>
    </span>
  );
}

function WorkspaceCard({ ws, index }) {
  const accent = ws.accentColor || "#D34F1F";
  const desc = ws.description?.trim() || "Untitled workspace — add a description to set the tone.";
  return (
    <Link
      href={`/w/${ws.id}`}
      className="group/card relative block h-full bg-paper hover:bg-paper-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      {/* accent-color spine */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[5px]"
        style={{ background: accent }}
      />

      <div className="pl-7 pr-6 py-7">
        {/* stamp row */}
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
          <span className="flex items-center gap-2">
            <span className="text-ember tabular-nums">№ {String(index).padStart(2, "0")}</span>
            <span aria-hidden="true" className="inline-block h-px w-4 bg-ink/25" />
            <span>{ws.role || "MEMBER"}</span>
          </span>
          <ArrowUpRight
            size={14}
            strokeWidth={1.75}
            className="text-ink/35 transition-all duration-200 group-hover/card:text-ember group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5"
            aria-hidden="true"
          />
        </div>

        {/* title */}
        <h3 className="mt-5 font-display text-2xl lg:text-[1.6rem] leading-[1.1] tracking-tight text-ink">
          <span className="italic font-normal">{ws.name}</span>
        </h3>

        {/* description */}
        <p className="mt-3 text-sm leading-relaxed text-ink/65 line-clamp-3">{desc}</p>

        {/* footer rule */}
        <div className="mt-6 hairline text-ink/20" aria-hidden="true" />

        <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 ring-1 ring-ink/15"
              style={{ background: accent }}
            />
            <span className="tabular-nums">
              {ws._count?.members != null
                ? `${ws._count.members} member${ws._count.members === 1 ? "" : "s"}`
                : "Active"}
            </span>
          </span>
          <span className="text-ember opacity-0 group-hover/card:opacity-100 transition-opacity">
            Open ↗
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <ul
      aria-hidden="true"
      className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-ink/10"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="bg-paper p-7 relative overflow-hidden">
          <span className="absolute left-0 top-0 bottom-0 w-[5px] bg-ink/15" />
          <div className="h-3 w-1/3 bg-ink/10 mb-6 animate-pulse" />
          <div className="h-7 w-3/4 bg-ink/10 mb-3 animate-pulse" />
          <div className="h-3 w-full bg-ink/5 mb-1.5 animate-pulse" />
          <div className="h-3 w-5/6 bg-ink/5 animate-pulse" />
          <div className="hairline text-ink/15 mt-6" />
          <div className="h-3 w-1/2 bg-ink/10 mt-3 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="mt-10 relative border border-ink/15 bg-paper-50">
      <div className="absolute -top-px left-0 h-px w-24 bg-ember" aria-hidden="true" />
      <div className="px-7 sm:px-10 py-12 sm:py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
        <div className="max-w-xl">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="text-ember">§</span>&nbsp;Empty Drawer
          </p>
          <h3 className="mt-4 font-display text-3xl lg:text-4xl leading-[1.05] tracking-tight text-ink">
            <span className="font-light">No workspaces.</span>{" "}
            <span className="italic font-normal">Yet<span className="text-ember">.</span></span>
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-ink/65">
            Spin up a fresh ledger for your team — pick a name, a colour, and you're in.
            Or hold the line for an invitation from a teammate.
          </p>
        </div>

        <div className="lg:pl-10 lg:border-l border-ink/15">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-3 bg-ink text-paper px-5 py-3.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
          >
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest2">
              Create workspace
            </span>
          </button>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/40 flex items-center gap-2">
            <Layers size={11} strokeWidth={1.75} className="text-ember" aria-hidden="true" />
            Takes about 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

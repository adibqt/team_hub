"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Target, ListChecks, Megaphone, Users, ScrollText, Settings, UserPlus } from "lucide-react";
import { useGoalsStore } from "@/stores/goalsStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { getSocket } from "@/lib/socket";
import OnlineMembers from "@/components/OnlineMembers";

const TODAY = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date());

export default function WorkspaceHomePage() {
  const { workspaceId } = useParams();
  const { goals, load: loadGoals } = useGoalsStore();
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const loadOne = useWorkspaceStore((s) => s.loadOne);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([loadOne(workspaceId), loadGoals(workspaceId)])
      .catch(() => {})
      .finally(() => mounted && setLoading(false));

    const s = getSocket();
    const onCreated = (g) => useGoalsStore.getState().pushGoal(g);
    s.on("goal:created", onCreated);
    return () => {
      mounted = false;
      s.off("goal:created", onCreated);
    };
  }, [workspaceId, loadOne, loadGoals]);

  const accent = ws?.accentColor || "#D34F1F";
  const isAdmin = ws?.viewerRole === "ADMIN";
  const memberCount = ws?.members?.length || 0;
  const goalCount = ws?._count?.goals ?? goals.length;
  const itemCount = ws?._count?.actionItems ?? 0;
  const announcementCount = ws?._count?.announcements ?? 0;

  return (
    <div className="relative max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* ============================================================ MASTHEAD */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8" style={{ background: accent }} />
          <span>Workspace · {TODAY}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline">Folio · 01</span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] tracking-[-0.02em] text-ink max-w-3xl">
              <span className="italic font-normal">{ws?.name || "Loading"}</span>
              <span className="text-ember">.</span>
            </h1>
            {ws?.description ? (
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink/65">
                {ws.description}
              </p>
            ) : (
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink/45 italic">
                {isAdmin
                  ? "Add a description in settings — give the team a reason to open this every morning."
                  : "No description yet."}
              </p>
            )}
          </div>

          <div className="lg:max-w-md">
            <div className="hairline text-ink/20 mb-3" aria-hidden="true" />
            <div className="flex items-center gap-3 flex-wrap">
              <span aria-hidden="true" className="h-3 w-3 ring-1 ring-ink/15" style={{ background: accent }} />
              <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 tabular-nums">
                Accent · {accent.toUpperCase()}
              </p>
              <span aria-hidden="true" className="h-3 w-px bg-ink/15" />
              <OnlineMembers workspaceId={workspaceId} />
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ STATS STRIP */}
      <section
        aria-label="Workspace summary"
        className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink/15 border-y border-ink/15 animate-fade-up"
        style={{ animationDelay: "0.1s" }}
      >
        <Stat n="01" label="Members"        value={loading ? "—" : memberCount} />
        <Stat n="02" label="Goals on file"  value={loading ? "—" : goalCount} />
        <Stat n="03" label="Action items"   value={loading ? "—" : itemCount} />
        <Stat n="04" label="Announcements"  value={loading ? "—" : announcementCount} />
      </section>

      {/* ============================================================ QUICK NAV TILES */}
      <section className="mt-14 lg:mt-20" aria-labelledby="ws-nav-h">
        <div className="flex items-end justify-between gap-6 pb-4 border-b border-ink/15">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-1">
              <span className="text-ember">§</span>&nbsp;Sections · 02
            </p>
            <h2 id="ws-nav-h" className="font-display text-3xl lg:text-4xl tracking-tight text-ink">
              <span className="italic font-normal">Open</span>{" "}
              <span className="font-light">a section</span>
            </h2>
          </div>
          {isAdmin && (
            <Link
              href={`/w/${workspaceId}/members`}
              className="inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <UserPlus size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2">
                Invite a teammate
              </span>
            </Link>
          )}
        </div>

        <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-ink/15">
          <NavTile n="01" href={`/w/${workspaceId}/goals`}         icon={Target}     title="Goals"         body="OKRs, milestones, and progress sliders." accent={accent} />
          <NavTile n="02" href={`/w/${workspaceId}/items`}         icon={ListChecks} title="Action items"  body="Drag-and-drop kanban for daily work." accent={accent} />
          <NavTile n="03" href={`/w/${workspaceId}/announcements`} icon={Megaphone}  title="Announcements" body="Pinned notes, reactions, and mentions." accent={accent} />
          <NavTile n="04" href={`/w/${workspaceId}/members`}       icon={Users}      title="Members"       body="Invitations, roles, and roster admin." accent={accent} />
          <NavTile n="05" href={`/w/${workspaceId}/audit`}         icon={ScrollText} title="Audit log"     body="Immutable history of every change." accent={accent} />
          {isAdmin && (
            <NavTile n="06" href={`/w/${workspaceId}/settings`}    icon={Settings}   title="Settings"      body="Name, description, accent, danger zone." accent={accent} />
          )}
        </ul>
      </section>

      {/* ============================================================ RECENT GOALS PREVIEW */}
      {goals.length > 0 && (
        <section className="mt-14 lg:mt-20" aria-labelledby="recent-goals-h">
          <div className="flex items-end justify-between gap-6 pb-4 border-b border-ink/15">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-1">
                <span className="text-ember">§</span>&nbsp;Latest · 03
              </p>
              <h2 id="recent-goals-h" className="font-display text-3xl tracking-tight text-ink">
                <span className="italic font-normal">Recent</span>{" "}
                <span className="font-light">goals</span>
              </h2>
            </div>
            <Link
              href={`/w/${workspaceId}/goals`}
              className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 hover:text-ember transition-colors inline-flex items-center gap-1.5"
            >
              See all
              <ArrowRight size={12} strokeWidth={2} />
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-ink/10">
            {goals.slice(0, 5).map((g, i) => (
              <li key={g.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
                <span className="font-mono text-[10px] tabular-nums text-ink/40 tracking-widest2 w-8">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-display italic text-lg leading-tight text-ink truncate">{g.title}</p>
                  {g.description && (
                    <p className="text-sm text-ink/55 truncate mt-0.5">{g.description}</p>
                  )}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 px-2.5 py-1 border border-ink/15">
                  {g.status?.replace("_", " ") || "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-20 pt-6 border-t border-ink/15">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
          <span>{ws?.name ? `${ws.name} ·` : ""} Page 01 of 01</span>
          <span className="hidden sm:inline">Live · WebSocket connected</span>
        </p>
      </footer>
    </div>
  );
}

function Stat({ n, label, value }) {
  return (
    <div className="bg-paper px-5 lg:px-7 py-6">
      <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 flex items-center gap-2">
        <span className="text-ember tabular-nums">{n}</span>
        <span>{label}</span>
      </p>
      <p className="mt-3 font-display text-4xl lg:text-5xl leading-none text-ink tabular-nums">
        {value}
      </p>
    </div>
  );
}

function NavTile({ n, href, icon: Icon, title, body, accent }) {
  return (
    <li className="bg-paper">
      <Link
        href={href}
        className="group/tile relative block h-full hover:bg-paper-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[5px] transition-opacity opacity-0 group-hover/tile:opacity-100"
          style={{ background: accent }}
        />
        <div className="pl-7 pr-6 py-7">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
            <span className="flex items-center gap-2">
              <span className="text-ember tabular-nums">№ {n}</span>
              <span aria-hidden="true" className="inline-block h-px w-4 bg-ink/25" />
              <Icon size={13} strokeWidth={1.75} className="text-ink/55" />
            </span>
            <ArrowRight
              size={14}
              strokeWidth={1.75}
              className="text-ink/35 transition-all duration-200 group-hover/tile:text-ember group-hover/tile:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
          <h3 className="mt-5 font-display text-2xl leading-tight tracking-tight text-ink">
            <span className="italic font-normal">{title}</span>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/65">{body}</p>
        </div>
      </Link>
    </li>
  );
}

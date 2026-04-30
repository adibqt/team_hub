"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Target,
  CalendarDays,
  Clock4,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useGoalsStore } from "@/stores/goalsStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";
import { getSocket } from "@/lib/socket";
import Avatar from "@/components/ui/Avatar";
import CreateGoalModal from "@/components/goals/CreateGoalModal";

const STATUS_LABEL = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const STATUS_TONE = {
  NOT_STARTED: "text-ink/65 border-ink/20 bg-paper",
  IN_PROGRESS: "text-ember border-ember/40 bg-ember-50",
  COMPLETED: "text-sage-700 border-sage-500/40 bg-sage-50",
  ARCHIVED: "text-ink/45 border-ink/15 bg-paper-50",
};

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dueLabel(d) {
  if (!d) return { text: "No due date", tone: "text-ink/45" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - now) / 86400000);
  if (diffDays < 0)
    return { text: `Overdue · ${fmtDate(d)}`, tone: "text-ember" };
  if (diffDays === 0)
    return { text: `Due today`, tone: "text-ember" };
  if (diffDays <= 7)
    return { text: `Due in ${diffDays}d · ${fmtDate(d)}`, tone: "text-ink/75" };
  return { text: `Due ${fmtDate(d)}`, tone: "text-ink/55" };
}

function avgMilestoneProgress(milestones = []) {
  if (!milestones.length) return null;
  const sum = milestones.reduce((acc, m) => acc + (Number(m.progress) || 0), 0);
  return Math.round(sum / milestones.length);
}

export default function GoalsPage() {
  const { workspaceId } = useParams();
  const me = useAuthStore((s) => s.user);
  const { goals, load, pushGoal } = useGoalsStore();
  const pushMilestone = useGoalsStore((s) => s.pushMilestone);
  const patchMilestoneFromSocket = useGoalsStore((s) => s.patchMilestoneFromSocket);
  const removeMilestoneFromSocket = useGoalsStore((s) => s.removeMilestoneFromSocket);
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const loadOne = useWorkspaceStore((s) => s.loadOne);

  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([loadOne(workspaceId), load(workspaceId)])
      .catch(() => toast.error("Couldn't load goals."))
      .finally(() => mounted && setLoading(false));

    const s = getSocket();
    s.emit("workspace:join", workspaceId);
    const onCreated = (g) => pushGoal(g);
    const onMilestoneCreated = (m) => pushMilestone(m);
    const onMilestoneUpdated = (m) => patchMilestoneFromSocket(m);
    const onMilestoneDeleted = (p) => removeMilestoneFromSocket(p);
    s.on("goal:created", onCreated);
    s.on("milestone:created", onMilestoneCreated);
    s.on("milestone:updated", onMilestoneUpdated);
    s.on("milestone:deleted", onMilestoneDeleted);
    return () => {
      mounted = false;
      s.off("goal:created", onCreated);
      s.off("milestone:created", onMilestoneCreated);
      s.off("milestone:updated", onMilestoneUpdated);
      s.off("milestone:deleted", onMilestoneDeleted);
    };
  }, [
    workspaceId,
    load,
    loadOne,
    pushGoal,
    pushMilestone,
    patchMilestoneFromSocket,
    removeMilestoneFromSocket,
  ]);

  const accent = ws?.accentColor || "#D34F1F";

  // Tabs counts and filtered list (recompute together to keep them in sync).
  const counts = useMemo(() => {
    const c = { ALL: goals.length, NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0, ARCHIVED: 0 };
    for (const g of goals) c[g.status] = (c[g.status] || 0) + 1;
    return c;
  }, [goals]);

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? goals : goals.filter((g) => g.status === statusFilter)),
    [goals, statusFilter]
  );

  return (
    <div className="relative max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* ============================================================ HEADER */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8" style={{ background: accent }} />
          <span>Workspace · {ws?.name || "—"}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline">Goals</span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-ink">
              <span className="italic font-normal">Goals</span>
              <span className="text-ember">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/65">
              The objectives this workspace is held against. Each one carries an owner, a status, and an optional due date.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 tabular-nums">
              {loading ? "loading…" : `${goals.length} on file`}
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2">
                New goal
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ STATUS TABS */}
      <nav
        aria-label="Filter by status"
        className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-b border-ink/15 animate-fade-up"
        style={{ animationDelay: "0.05s" }}
      >
        {[
          { id: "ALL", label: "All" },
          { id: "NOT_STARTED", label: "Not started" },
          { id: "IN_PROGRESS", label: "In progress" },
          { id: "COMPLETED", label: "Completed" },
          { id: "ARCHIVED", label: "Archived" },
        ].map((tab) => {
          const active = statusFilter === tab.id;
          const count = counts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`relative -mb-px py-3 font-mono text-[11px] uppercase tracking-widest2 transition-colors focus:outline-none focus-visible:text-ember ${
                active ? "text-ink" : "text-ink/45 hover:text-ink/75"
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-2 text-ink/35 tabular-nums">{count}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 -bottom-px h-px bg-ember"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ============================================================ LEDGER */}
      <section
        className="mt-8 animate-fade-up"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="flex items-end justify-between pb-3 border-b border-ink/15">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="text-ember">§</span>&nbsp;Ledger · 01
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 tabular-nums">
            {filtered.length} shown
          </p>
        </div>

        {loading ? (
          <GoalSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            isFilteredEmpty={goals.length > 0}
            onCreate={() => setCreateOpen(true)}
          />
        ) : (
          <ul className="mt-2 divide-y divide-ink/10">
            {filtered.map((g, i) => {
              const due = dueLabel(g.dueDate);
              const progress = avgMilestoneProgress(g.milestones);
              const isMine = g.ownerId === me?.id;
              const goalHref = g._pending
                ? null
                : `/w/${workspaceId}/goals/${g.id}`;
              return (
                <li
                  key={g.id}
                  className={`group/goal relative grid grid-cols-[auto_1fr_auto] items-start gap-4 sm:gap-6 py-6 ${
                    g._pending ? "opacity-60" : ""
                  }`}
                >
                  <span className="hidden sm:block font-mono text-[10px] tabular-nums text-ink/40 tracking-widest2 w-8 mt-1.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      {goalHref ? (
                        <Link
                          href={goalHref}
                          className="group/title inline-flex items-baseline gap-2 font-display italic text-xl leading-tight tracking-tight text-ink hover:text-ember/90 focus:outline-none focus-visible:underline transition-colors"
                        >
                          <span>{g.title}</span>
                          <ArrowUpRight
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden="true"
                            className="text-ink/35 transition-all group-hover/title:text-ember group-hover/title:translate-x-0.5 group-hover/title:-translate-y-0.5"
                          />
                        </Link>
                      ) : (
                        <h2 className="font-display italic text-xl leading-tight tracking-tight text-ink">
                          {g.title}
                        </h2>
                      )}
                      {g._pending && (
                        <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
                          filing…
                        </span>
                      )}
                    </div>
                    {g.description && (
                      <p className="mt-1.5 text-sm text-ink/65 leading-relaxed line-clamp-2 max-w-2xl">
                        {g.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
                      {g.owner && (
                        <span className="inline-flex items-center gap-2">
                          <Avatar user={g.owner} size="xs" />
                          <span className="text-ink/75 normal-case tracking-normal text-[12px] font-sans">
                            {g.owner.name}
                          </span>
                          {isMine && (
                            <span className="text-ember">· you</span>
                          )}
                        </span>
                      )}
                      <span
                        aria-hidden="true"
                        className="hidden sm:inline-block h-3 w-px bg-ink/15"
                      />
                      <span className={`inline-flex items-center gap-1.5 ${due.tone}`}>
                        <CalendarDays size={11} strokeWidth={1.75} />
                        {due.text}
                      </span>
                      {g.createdAt && (
                        <>
                          <span
                            aria-hidden="true"
                            className="hidden sm:inline-block h-3 w-px bg-ink/15"
                          />
                          <span className="inline-flex items-center gap-1.5 text-ink/45">
                            <Clock4 size={11} strokeWidth={1.75} />
                            Filed {fmtDate(g.createdAt)}
                          </span>
                        </>
                      )}
                    </div>

                    {progress !== null && (
                      <div className="mt-4 max-w-md">
                        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/45 tabular-nums">
                          <span>
                            {g.milestones.length} milestone
                            {g.milestones.length === 1 ? "" : "s"}
                          </span>
                          <span className="text-ink/25">·</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="mt-1.5 h-[3px] w-full bg-ink/10 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 transition-[width]"
                            style={{
                              width: `${progress}%`,
                              background: accent,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 pt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 px-2.5 py-1.5 border ${STATUS_TONE[g.status] || STATUS_TONE.NOT_STARTED}`}
                    >
                      {g.status === "COMPLETED" && (
                        <ShieldCheck size={11} strokeWidth={1.75} />
                      )}
                      {STATUS_LABEL[g.status] || g.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <CreateGoalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
}

function EmptyState({ isFilteredEmpty, onCreate }) {
  return (
    <div className="mt-10 px-6 py-14 border border-dashed border-ink/15 bg-paper-50 text-center">
      <Target size={22} strokeWidth={1.5} className="mx-auto text-ink/35" />
      <p className="mt-4 font-mono text-[11px] uppercase tracking-widest2 text-ink/55">
        {isFilteredEmpty ? "Nothing in this status" : "No goals on file"}
      </p>
      <p className="mt-2 max-w-md mx-auto text-sm text-ink/55 leading-relaxed">
        {isFilteredEmpty
          ? "Switch tabs to see goals in other statuses, or file a new one below."
          : "File the first goal for this workspace and the team will see it on the home page."}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-widest2">
          New goal
        </span>
      </button>
    </div>
  );
}

function GoalSkeleton() {
  return (
    <ul aria-hidden="true" className="mt-2 divide-y divide-ink/10">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-[auto_1fr_auto] items-start gap-4 py-6"
        >
          <div className="hidden sm:block w-8" />
          <div className="space-y-3">
            <div className="h-5 w-1/2 bg-ink/10 animate-pulse" />
            <div className="h-3 w-3/4 bg-ink/5 animate-pulse" />
            <div className="h-3 w-1/3 bg-ink/5 animate-pulse" />
          </div>
          <div className="h-6 w-24 bg-ink/10 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

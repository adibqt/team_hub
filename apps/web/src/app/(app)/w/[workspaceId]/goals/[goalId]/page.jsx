"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock4,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { useGoalsStore } from "@/stores/goalsStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { getSocket } from "@/lib/socket";
import Avatar from "@/components/ui/Avatar";
import MilestoneList from "@/components/goals/MilestoneList";
import ActivityFeed from "@/components/goals/ActivityFeed";
import GoalStatusPicker from "@/components/goals/GoalStatusPicker";

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
  if (diffDays === 0) return { text: "Due today", tone: "text-ember" };
  if (diffDays <= 7)
    return { text: `Due in ${diffDays}d · ${fmtDate(d)}`, tone: "text-ink/75" };
  return { text: `Due ${fmtDate(d)}`, tone: "text-ink/55" };
}

function avgProgress(milestones = []) {
  if (!milestones.length) return null;
  const sum = milestones.reduce(
    (acc, m) => acc + (Number(m.progress) || 0),
    0
  );
  return Math.round(sum / milestones.length);
}

export default function GoalDetailPage() {
  const { workspaceId, goalId } = useParams();
  const me = useAuthStore((s) => s.user);
  const goal = useGoalsStore((s) => s.goalById[goalId]);
  const loadGoal = useGoalsStore((s) => s.loadGoal);
  const updateGoal = useGoalsStore((s) => s.updateGoal);
  const applyGoalUpdate = useGoalsStore((s) => s.applyGoalUpdate);
  const loadUpdates = useGoalsStore((s) => s.loadUpdates);
  const pushUpdate = useGoalsStore((s) => s.pushUpdate);
  const pushMilestone = useGoalsStore((s) => s.pushMilestone);
  const patchMilestoneFromSocket = useGoalsStore((s) => s.patchMilestoneFromSocket);
  const removeMilestoneFromSocket = useGoalsStore((s) => s.removeMilestoneFromSocket);

  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const loadWs = useWorkspaceStore((s) => s.loadOne);

  const [loadingGoal, setLoadingGoal] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setError("");
    setLoadingGoal(true);
    setLoadingFeed(true);

    if (!ws) loadWs(workspaceId).catch(() => {});

    loadGoal(goalId)
      .catch((err) => {
        if (!mounted) return;
        setError(
          err?.response?.status === 404
            ? "Goal not found."
            : err?.response?.data?.error || "Couldn't load goal."
        );
      })
      .finally(() => mounted && setLoadingGoal(false));

    loadUpdates(goalId)
      .catch(() => {
        if (mounted) toast.error("Couldn't load activity feed.");
      })
      .finally(() => mounted && setLoadingFeed(false));

    const s = getSocket();
    s.emit("workspace:join", workspaceId);
    const onUpdatePosted = (u) => {
      if (u.goalId === goalId) pushUpdate(u);
    };
    const onGoalUpdated = (g) => {
      if (g.id === goalId) applyGoalUpdate(g);
    };
    const onMilestoneCreated = (m) => {
      if (m.goalId === goalId) pushMilestone(m);
    };
    const onMilestoneUpdated = (m) => {
      if (m.goalId === goalId) patchMilestoneFromSocket(m);
    };
    const onMilestoneDeleted = (payload) => {
      if (payload.goalId === goalId) removeMilestoneFromSocket(payload);
    };

    s.on("goal:update:posted", onUpdatePosted);
    s.on("goal:updated", onGoalUpdated);
    s.on("milestone:created", onMilestoneCreated);
    s.on("milestone:updated", onMilestoneUpdated);
    s.on("milestone:deleted", onMilestoneDeleted);
    return () => {
      mounted = false;
      s.off("goal:update:posted", onUpdatePosted);
      s.off("goal:updated", onGoalUpdated);
      s.off("milestone:created", onMilestoneCreated);
      s.off("milestone:updated", onMilestoneUpdated);
      s.off("milestone:deleted", onMilestoneDeleted);
    };
  }, [
    workspaceId,
    goalId,
    loadGoal,
    loadUpdates,
    loadWs,
    pushUpdate,
    applyGoalUpdate,
    pushMilestone,
    patchMilestoneFromSocket,
    removeMilestoneFromSocket,
    ws,
  ]);

  const accent = ws?.accentColor || "#D34F1F";
  const due = useMemo(() => dueLabel(goal?.dueDate), [goal?.dueDate]);
  const progress = useMemo(
    () => avgProgress(goal?.milestones),
    [goal?.milestones]
  );

  if (error) {
    return (
      <div className="max-w-[800px] mx-auto px-6 sm:px-10 lg:px-14 py-16">
        <Link
          href={`/w/${workspaceId}/goals`}
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/55 hover:text-ember transition-colors"
        >
          <ArrowLeft size={12} strokeWidth={1.75} />
          Back to goals
        </Link>
        <p className="mt-10 font-display italic text-2xl text-ink">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* ============================================================ BREADCRUMB */}
      <div className="animate-fade-up flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
        <Link
          href={`/w/${workspaceId}/goals`}
          className="inline-flex items-center gap-2 hover:text-ember transition-colors"
        >
          <ArrowLeft size={12} strokeWidth={1.75} />
          Goals
        </Link>
        <span className="text-ink/25">/</span>
        <span className="text-ink/45">Detail</span>
      </div>

      {/* ============================================================ HEADER */}
      <header className="mt-5 animate-fade-up">
        {loadingGoal || !goal ? (
          <HeaderSkeleton />
        ) : (
          <>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
              <span
                aria-hidden="true"
                className="inline-block h-px w-8"
                style={{ background: accent }}
              />
              <span>{ws?.name || "Workspace"}</span>
              {goal.createdAt && (
                <>
                  <span className="text-ink/25">·</span>
                  <span>Filed {fmtDate(goal.createdAt)}</span>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="min-w-0">
                <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-ink">
                  <span className="italic font-normal">{goal.title}</span>
                  <span className="text-ember">.</span>
                </h1>
                {goal.description && (
                  <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink/65 whitespace-pre-wrap">
                    {goal.description}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {(() => {
                  const isOwner = goal.ownerId === me?.id;
                  const isAdmin = ws?.viewerRole === "ADMIN";
                  const canEdit = isOwner || isAdmin;
                  return (
                    <GoalStatusPicker
                      value={goal.status}
                      size="md"
                      disabled={!canEdit}
                      disabledReason={
                        canEdit
                          ? undefined
                          : "Only the goal's owner or a workspace admin can change status"
                      }
                      onChange={async (next) => {
                        try {
                          await updateGoal(goalId, { status: next });
                          toast.success(
                            `Status set to ${next.replace("_", " ").toLowerCase()}`
                          );
                        } catch (err) {
                          toast.error(
                            err?.response?.data?.error ||
                              "Couldn't change status."
                          );
                        }
                      }}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Meta strip */}
            <dl className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink/15 border-y border-ink/15">
              <MetaCell n="01" label="Owner">
                {goal.owner ? (
                  <span className="inline-flex items-center gap-2.5">
                    <Avatar user={goal.owner} size="xs" />
                    <span className="text-[15px] text-ink truncate">
                      {goal.owner.name}
                    </span>
                  </span>
                ) : (
                  <span className="text-ink/45 italic">Unassigned</span>
                )}
              </MetaCell>
              <MetaCell n="02" label="Due date">
                <span className={`inline-flex items-center gap-1.5 ${due.tone}`}>
                  <CalendarDays size={12} strokeWidth={1.75} />
                  <span className="text-[14px]">{due.text}</span>
                </span>
              </MetaCell>
              <MetaCell n="03" label="Progress">
                {progress === null ? (
                  <span className="text-ink/45 italic text-[14px]">
                    No milestones yet
                  </span>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center gap-3">
                      <div className="relative h-[3px] flex-1 bg-ink/10">
                        <div
                          className="absolute inset-y-0 left-0 transition-[width]"
                          style={{
                            width: `${progress}%`,
                            background: accent,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[12px] tabular-nums text-ink/75">
                        {progress}%
                      </span>
                    </div>
                  </div>
                )}
              </MetaCell>
              <MetaCell n="04" label="Filed">
                <span className="inline-flex items-center gap-1.5 text-ink/65 text-[14px]">
                  <Clock4 size={12} strokeWidth={1.75} />
                  {fmtDate(goal.createdAt)}
                </span>
              </MetaCell>
            </dl>
          </>
        )}
      </header>

      {/* ============================================================ MILESTONES */}
      {!loadingGoal && goal && (
        <div className="mt-14 lg:mt-20" style={{ animationDelay: "0.1s" }}>
          <MilestoneList goal={goal} accent={accent} />
        </div>
      )}

      {/* ============================================================ ACTIVITY */}
      <div className="mt-14 lg:mt-20" style={{ animationDelay: "0.15s" }}>
        <ActivityFeed goalId={goalId} loading={loadingFeed} />
      </div>

      <footer className="mt-20 pt-6 border-t border-ink/15">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
          <span>
            {ws?.name ? `${ws.name} · ` : ""}Goal · {goal?.id?.slice(-8) || "—"}
          </span>
          <Link
            href={`/w/${workspaceId}/goals`}
            className="hover:text-ember transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={11} strokeWidth={1.75} />
            All goals
          </Link>
        </p>
      </footer>
    </div>
  );
}

function MetaCell({ n, label, children }) {
  return (
    <div className="bg-paper px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 flex items-center gap-2 mb-2.5">
        <span className="text-ember tabular-nums">{n}</span>
        <span>{label}</span>
      </p>
      <div>{children}</div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-3 w-40 bg-ink/10 animate-pulse" />
      <div className="h-12 w-2/3 bg-ink/10 animate-pulse" />
      <div className="h-3 w-1/2 bg-ink/5 animate-pulse" />
      <div className="h-20 w-full bg-ink/5 animate-pulse" />
    </div>
  );
}

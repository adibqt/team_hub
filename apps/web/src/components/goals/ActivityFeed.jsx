"use client";
import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "@/components/ui/Avatar";
import { useGoalsStore } from "@/stores/goalsStore";
import { useAuthStore } from "@/stores/authStore";

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtRelative(date, now) {
  const minutes = Math.floor((now - date) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Compact clock chip — just a time on same-day posts, date+time otherwise.
function fmtClock(date, now) {
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (isSameDay(date, now)) return time;
  const ds = date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
  return `${ds}, ${time}`;
}

// Full, locale-aware string for the title attribute / accessibility.
function fmtFull(date) {
  return date.toLocaleString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtTimestamps(d) {
  if (!d) return { relative: "", clock: "", full: "" };
  const date = new Date(d);
  const now = new Date();
  return {
    relative: fmtRelative(date, now),
    clock: fmtClock(date, now),
    full: fmtFull(date),
    iso: date.toISOString(),
  };
}

export default function ActivityFeed({ goalId, loading }) {
  const me = useAuthStore((s) => s.user);
  const updates = useGoalsStore((s) => s.updatesByGoalId[goalId] || []);
  const postUpdate = useGoalsStore((s) => s.postUpdate);

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await postUpdate(goalId, trimmed);
      setBody("");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't post update.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit(e);
    }
  }

  return (
    <section aria-labelledby="feed-h" className="animate-fade-up">
      <div className="flex items-end justify-between pb-3 border-b border-ink/15">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-1">
            <span className="text-ember">§</span>&nbsp;Section · 03
          </p>
          <h2
            id="feed-h"
            className="font-display text-2xl tracking-tight text-ink"
          >
            <span className="italic font-normal">Activity</span>
            <span className="font-light text-ink/45 ml-2 text-base tabular-nums">
              {updates.length} entr{updates.length === 1 ? "y" : "ies"}
            </span>
          </h2>
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 grid grid-cols-[auto_1fr] gap-4"
        aria-label="Post a progress update"
      >
        <div className="pt-1">
          <Avatar user={me} size="sm" />
        </div>
        <div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            maxLength={5000}
            placeholder="Post a progress update — what landed today, what's blocked, what's next…"
            className="w-full bg-paper text-ink placeholder:text-ink/30 border border-ink/15 hover:border-ink/35 focus:border-ink focus:ring-0 px-4 py-3 text-[15px] leading-relaxed resize-y outline-none transition-colors"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
              {body.trim().length === 0
                ? "Markdown not yet supported · ⌘+Enter to post"
                : `${body.trim().length} character${body.trim().length === 1 ? "" : "s"} · ⌘+Enter to post`}
            </p>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 hover:bg-ink-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono text-[10px] uppercase tracking-widest2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            >
              <Send size={12} strokeWidth={1.75} />
              {submitting ? "Posting…" : "Post update"}
            </button>
          </div>
        </div>
      </form>

      {/* Feed */}
      <div className="mt-10">
        {loading ? (
          <FeedSkeleton />
        ) : updates.length === 0 ? (
          <div className="px-6 py-12 border border-dashed border-ink/15 bg-paper-50 text-center">
            <MessageSquare
              size={20}
              strokeWidth={1.5}
              className="mx-auto text-ink/35"
            />
            <p className="mt-3 font-mono text-[11px] uppercase tracking-widest2 text-ink/55">
              No activity yet
            </p>
            <p className="mt-2 max-w-md mx-auto text-sm text-ink/55 leading-relaxed">
              Post the first update to start the goal's activity log. Owners,
              admins, and watchers see new entries in real time.
            </p>
          </div>
        ) : (
          <ol className="relative">
            {/* vertical rule */}
            <span
              aria-hidden="true"
              className="absolute left-[19px] top-2 bottom-2 w-px bg-ink/10"
            />
            {updates.map((u, i) => {
              const ts = fmtTimestamps(u.createdAt);
              return (
                <li key={u.id} className="relative pl-14 pr-2 py-5">
                  {/* timeline dot */}
                  <span
                    aria-hidden="true"
                    className="absolute left-[15px] top-7 h-2 w-2 ring-2 ring-paper"
                    style={{ background: i === 0 ? "#D34F1F" : "#1A1814" }}
                  />
                  <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
                    <Avatar user={u.author} size="xs" />
                    <p className="font-display italic text-base leading-none text-ink">
                      {u.author?.name || "Unknown"}
                    </p>
                    <span aria-hidden="true" className="text-ink/25">
                      ·
                    </span>
                    <time
                      dateTime={ts.iso}
                      title={ts.full}
                      className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 inline-flex items-baseline gap-1.5"
                    >
                      <span>{ts.relative}</span>
                      <span aria-hidden="true" className="text-ink/25">·</span>
                      <span className="text-ink/40 normal-case tracking-normal text-[11px] tabular-nums">
                        {ts.clock}
                      </span>
                    </time>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink/85 whitespace-pre-wrap break-words">
                    {u.body}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function FeedSkeleton() {
  return (
    <ul aria-hidden="true" className="space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="grid grid-cols-[auto_1fr] gap-4">
          <div className="h-8 w-8 bg-ink/10 rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-1/3 bg-ink/10 animate-pulse" />
            <div className="h-3 w-3/4 bg-ink/5 animate-pulse" />
            <div className="h-3 w-2/3 bg-ink/5 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

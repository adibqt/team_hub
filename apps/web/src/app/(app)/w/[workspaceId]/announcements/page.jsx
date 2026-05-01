"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Megaphone,
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "@/components/ui/Avatar";
import AnnouncementModal from "@/components/announcements/AnnouncementModal";
import MentionInput, {
  resolveMentions,
  stripMentionMarkers,
} from "@/components/MentionInput";
import OnlineMembers from "@/components/OnlineMembers";
import { useWorkspaceLive } from "@/lib/useWorkspaceLive";
import { useAnnouncementsStore } from "@/stores/announcementsStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";
import { getSocket } from "@/lib/socket";

/* ────────────────────────────────────────────────────────────────
   Time helpers — keep the editorial feel (short, lowercase, tabular)
   ──────────────────────────────────────────────────────────────── */
function fmtAbsolute(d) {
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelative(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d2 = Math.floor(hr / 24);
  if (d2 < 7) return `${d2}d ago`;
  return fmtAbsolute(d);
}

const QUICK_REACTIONS = ["👍", "🎉", "🔥", "❤️", "👏"];

export default function AnnouncementsPage() {
  const { workspaceId } = useParams();
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const loadOne = useWorkspaceStore((s) => s.loadOne);
  const me = useAuthStore((s) => s.user);

  const announcements = useAnnouncementsStore((s) => s.announcements);
  const load = useAnnouncementsStore((s) => s.load);
  const reset = useAnnouncementsStore((s) => s.reset);
  const togglePin = useAnnouncementsStore((s) => s.togglePin);
  const deleteAnnouncement = useAnnouncementsStore((s) => s.deleteAnnouncement);
  const pushAnnouncement = useAnnouncementsStore((s) => s.pushAnnouncement);
  const applyAnnouncementUpdate = useAnnouncementsStore(
    (s) => s.applyAnnouncementUpdate
  );
  const removeAnnouncement = useAnnouncementsStore((s) => s.removeAnnouncement);
  const toggleReaction = useAnnouncementsStore((s) => s.toggleReaction);
  const addComment = useAnnouncementsStore((s) => s.addComment);

  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const isAdmin = ws?.viewerRole === "ADMIN";
  useWorkspaceLive(workspaceId);

  /* ─── Initial load + socket subscription ─────────────────────── */
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([loadOne(workspaceId), load(workspaceId)])
      .catch(() => toast.error("Couldn't load announcements."))
      .finally(() => mounted && setLoading(false));

    const s = getSocket();
    const onCreated = (a) => pushAnnouncement(a);
    const onUpdated = (a) => applyAnnouncementUpdate(a);
    const onDeleted = ({ id }) => removeAnnouncement(id);
    s.on("announcement:created", onCreated);
    s.on("announcement:updated", onUpdated);
    s.on("announcement:deleted", onDeleted);

    return () => {
      mounted = false;
      s.off("announcement:created", onCreated);
      s.off("announcement:updated", onUpdated);
      s.off("announcement:deleted", onDeleted);
      reset();
    };
  }, [
    workspaceId,
    load,
    loadOne,
    reset,
    pushAnnouncement,
    applyAnnouncementUpdate,
    removeAnnouncement,
  ]);

  const accent = ws?.accentColor || "#D34F1F";

  const { pinned, rest } = useMemo(() => {
    const pinned = [];
    const rest = [];
    for (const a of announcements) (a.pinned ? pinned : rest).push(a);
    return { pinned, rest };
  }, [announcements]);

  async function handleTogglePin(a) {
    try {
      await togglePin(a.id, !a.pinned);
      toast.success(a.pinned ? "Unpinned" : "Pinned to the top");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't update pin.");
    }
  }

  async function handleDelete(a) {
    if (
      !window.confirm(
        `Delete "${a.title}"? This wipes the post for everyone in the workspace.`
      )
    )
      return;
    try {
      await deleteAnnouncement(a.id);
      toast.success("Announcement deleted");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't delete.");
    }
  }

  function openEditor(announcement) {
    setEditing(announcement);
    setComposeOpen(true);
  }

  function openCompose() {
    setEditing(null);
    setComposeOpen(true);
  }

  function closeCompose() {
    setComposeOpen(false);
    setEditing(null);
  }

  async function handleReact(announcementId, emoji) {
    try {
      await toggleReaction(announcementId, emoji);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't update reaction.");
    }
  }

  async function handleComment(announcementId, body, mentions = []) {
    try {
      await addComment(announcementId, body, mentions);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't add comment.");
      throw err;
    }
  }

  return (
    <div className="relative max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* ============================================================ HEADER */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8" style={{ background: accent }} />
          <span>Workspace · {ws?.name || "—"}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline">Dispatches</span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-ink">
              <span className="italic font-normal">Announcements</span>
              <span className="text-ember">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/65">
              Workspace-wide dispatches from the admins. Pinned posts stay at the top until they’re cleared.
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className="flex items-center gap-4 flex-wrap lg:justify-end">
              <OnlineMembers workspaceId={workspaceId} />
              <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 tabular-nums">
                {loading
                  ? "loading…"
                  : `${announcements.length} on file${
                      pinned.length ? ` · ${pinned.length} pinned` : ""
                    }`}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={openCompose}
                className="inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest2">
                  New announcement
                </span>
              </button>
            )}
          </div>
        </div>

        {!isAdmin && !loading && (
          <p
            className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/55 border border-ink/15 bg-paper-50 px-3 py-2"
          >
            <ShieldCheck size={12} strokeWidth={1.75} className="text-ember" />
            Admins post here · members can read &amp; react
          </p>
        )}
      </header>

      {/* ============================================================ BODY */}
      <div className="mt-12 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        {loading ? (
          <AnnouncementSkeleton />
        ) : announcements.length === 0 ? (
          <EmptyState isAdmin={isAdmin} onCompose={openCompose} />
        ) : (
          <>
            {pinned.length > 0 && (
              <Section
                eyebrow="Pinned"
                stamp="01"
                accent={accent}
                count={pinned.length}
              >
                <ul className="space-y-px bg-ink/15">
                  {pinned.map((a) => (
                    <AnnouncementCard
                      key={a.id}
                      announcement={a}
                      isAdmin={isAdmin}
                      accent={accent}
                      onPinToggle={() => handleTogglePin(a)}
                      onEdit={() => openEditor(a)}
                      onDelete={() => handleDelete(a)}
                      onReact={(emoji) => handleReact(a.id, emoji)}
                      onComment={(body, mentions) => handleComment(a.id, body, mentions)}
                      currentUserId={me?.id}
                      members={ws?.members || []}
                    />
                  ))}
                </ul>
              </Section>
            )}

            {rest.length > 0 && (
              <div className={pinned.length > 0 ? "mt-14" : ""}>
                <Section
                  eyebrow={pinned.length > 0 ? "Recent" : "Dispatches"}
                  stamp={pinned.length > 0 ? "02" : "01"}
                  accent={accent}
                  count={rest.length}
                >
                  <ul className="space-y-px bg-ink/15">
                    {rest.map((a) => (
                      <AnnouncementCard
                        key={a.id}
                        announcement={a}
                        isAdmin={isAdmin}
                        accent={accent}
                        onPinToggle={() => handleTogglePin(a)}
                        onEdit={() => openEditor(a)}
                        onDelete={() => handleDelete(a)}
                        onReact={(emoji) => handleReact(a.id, emoji)}
                        onComment={(body, mentions) => handleComment(a.id, body, mentions)}
                        currentUserId={me?.id}
                        members={ws?.members || []}
                      />
                    ))}
                  </ul>
                </Section>
              </div>
            )}
          </>
        )}
      </div>

      <AnnouncementModal
        open={composeOpen}
        onClose={closeCompose}
        workspaceId={workspaceId}
        announcement={editing}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   SECTION HEADER — shared between pinned + recent
   ──────────────────────────────────────────────────────────────── */
function Section({ eyebrow, stamp, count, children }) {
  return (
    <section>
      <div className="flex items-end justify-between pb-3 border-b border-ink/15">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span className="text-ember">§</span>&nbsp;{eyebrow} · {stamp}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 tabular-nums">
          {count} {count === 1 ? "post" : "posts"}
        </p>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   ANNOUNCEMENT CARD
   ──────────────────────────────────────────────────────────────── */
function AnnouncementCard({
  announcement: a,
  isAdmin,
  accent,
  onPinToggle,
  onEdit,
  onDelete,
  onReact,
  onComment,
  currentUserId,
  members = [],
}) {
  const memberNames = useMemo(
    () => (members || []).map((m) => m.user.name).sort((x, y) => y.length - x.length),
    [members]
  );
  const [commentBody, setCommentBody] = useState("");
  const [commentMentions, setCommentMentions] = useState([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const reactionCounts = useMemo(() => {
    const counts = new Map();
    for (const r of a.reactions || []) counts.set(r.emoji, (counts.get(r.emoji) || 0) + 1);
    return counts;
  }, [a.reactions]);
  const myReactions = useMemo(
    () =>
      new Set(
        (a.reactions || [])
          .filter((r) => r.userId === currentUserId)
          .map((r) => r.emoji)
      ),
    [a.reactions, currentUserId]
  );

  async function submitComment(e) {
    e?.preventDefault?.();
    const trimmed = commentBody.trim();
    if (!trimmed || submittingComment) return;
    setSubmittingComment(true);
    try {
      const mentions = resolveMentions(trimmed);
      await onComment(stripMentionMarkers(trimmed), mentions.length ? mentions : commentMentions);
      setCommentBody("");
      setCommentMentions([]);
    } finally {
      setSubmittingComment(false);
    }
  }

  return (
    <li id={`a-${a.id}`} className="bg-paper relative scroll-mt-24">
      {a.pinned && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: accent }}
        />
      )}

      <article className="px-7 py-7 sm:px-9">
        {/* ── meta row ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink/65">
          {a.author ? (
            <span className="inline-flex items-center gap-2.5">
              <Avatar user={a.author} size="xs" />
              <span className="text-ink">{a.author.name}</span>
            </span>
          ) : (
            <span className="text-ink/45 italic">Unknown author</span>
          )}
          <span aria-hidden="true" className="h-3 w-px bg-ink/15" />
          <time
            dateTime={a.createdAt}
            title={fmtAbsolute(a.createdAt)}
            className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 tabular-nums"
          >
            {fmtRelative(a.createdAt)}
          </time>
          {a.pinned && (
            <>
              <span aria-hidden="true" className="h-3 w-px bg-ink/15" />
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 text-ember">
                <Pin size={11} strokeWidth={1.75} />
                Pinned
              </span>
            </>
          )}

          {isAdmin && (
            <div className="ml-auto flex items-center gap-1">
              <IconAction
                icon={a.pinned ? PinOff : Pin}
                label={a.pinned ? "Unpin" : "Pin to top"}
                onClick={onPinToggle}
              />
              <IconAction icon={Pencil} label="Edit" onClick={onEdit} />
              <IconAction
                icon={Trash2}
                label="Delete"
                onClick={onDelete}
                destructive
              />
            </div>
          )}
        </div>

        {/* ── title ────────────────────────────────────────────── */}
        <h2 className="mt-4 font-display text-2xl sm:text-3xl leading-tight tracking-tight text-ink">
          <span className="italic font-normal">{a.title}</span>
        </h2>

        {/* ── body ─────────────────────────────────────────────── */}
        <div
          className="announcement-prose mt-5 max-w-[68ch]"
          dangerouslySetInnerHTML={{ __html: a.bodyHtml }}
        />

        <div className="mt-6 space-y-4 border-t border-ink/10 pt-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_REACTIONS.map((emoji) => {
              const active = myReactions.has(emoji);
              const count = reactionCounts.get(emoji) || 0;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(emoji)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[12px] tabular-nums transition-colors ${
                    active
                      ? "border-ember bg-ember-50 text-ink"
                      : "border-ink/15 bg-paper-50 text-ink/75 hover:border-ink/30"
                  }`}
                >
                  <span aria-hidden="true">{emoji}</span>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>

          <div>
            <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/50">
              <MessageCircle size={12} strokeWidth={1.75} />
              Comments · {(a.comments || []).length}
            </p>

            {(a.comments || []).length > 0 && (
              <ul className="mt-3 space-y-3">
                {a.comments.map((c) => (
                  <li key={c.id} className="border border-ink/10 bg-paper-50 px-3 py-2.5">
                    <p className="text-[12px] text-ink/60">
                      <span className="font-medium text-ink">{c.author?.name || "Member"}</span>
                      <span className="mx-1.5 text-ink/25">•</span>
                      {fmtRelative(c.createdAt)}
                    </p>
                    <p className="mt-1 text-[14px] text-ink/85 whitespace-pre-wrap">
                      <CommentBody body={c.body} memberNames={memberNames} />
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={submitComment} className="mt-3 flex gap-2 items-start">
              <MentionInput
                className="flex-1"
                value={commentBody}
                onChange={setCommentBody}
                onMentionsChange={setCommentMentions}
                onSubmit={submitComment}
                members={members}
                disabled={submittingComment}
                placeholder="Write a comment… type @ to mention"
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={submittingComment || !commentBody.trim()}
                className="px-3 py-2 text-[11px] uppercase tracking-widest2 font-mono bg-ink text-paper disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </article>
    </li>
  );
}

/**
 * Render a comment body, highlighting any `@<member name>` token. We
 * scan against the live roster (longest names first to avoid partial
 * matches eating prefixes — e.g. "@Adib R" before "@Adib"). Anything
 * else falls through as plain text.
 */
function CommentBody({ body, memberNames }) {
  if (!body) return null;
  if (!memberNames?.length) return <>{body}</>;
  const escaped = memberNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(^|\\s)@(${escaped.join("|")})\\b`, "g");
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(body)) !== null) {
    const start = m.index + m[1].length;
    if (start > last) parts.push(body.slice(last, start));
    parts.push(
      <span
        key={`m-${start}`}
        className="text-ember bg-ember/10 px-1 -mx-0.5 font-medium"
      >
        @{m[2]}
      </span>
    );
    last = start + 1 + m[2].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return <>{parts}</>;
}

/* Small helper for the inline icon buttons in the meta row. */
function IconAction({ icon: Icon, label, onClick, destructive = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember ${
        destructive
          ? "text-ink/45 hover:text-ember hover:bg-ember-50"
          : "text-ink/45 hover:text-ink hover:bg-paper-50"
      }`}
    >
      <Icon size={13} strokeWidth={1.75} />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   EMPTY + LOADING STATES
   ──────────────────────────────────────────────────────────────── */
function EmptyState({ isAdmin, onCompose }) {
  return (
    <div className="px-6 py-14 border border-dashed border-ink/15 bg-paper-50 text-center">
      <Megaphone size={22} strokeWidth={1.5} className="mx-auto text-ink/35" />
      <p className="mt-4 font-mono text-[11px] uppercase tracking-widest2 text-ink/55">
        Nothing on the board
      </p>
      <p className="mt-2 max-w-md mx-auto text-sm text-ink/55 leading-relaxed">
        {isAdmin
          ? "Be the first voice on this board. Drop a note, pin it if it can't wait, and the team will see it the moment it ships."
          : "When admins publish news, briefs, or rallying calls — they'll appear here for everyone in the workspace."}
      </p>
      {isAdmin && (
        <button
          type="button"
          onClick={onCompose}
          className="mt-6 inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-widest2">
            New announcement
          </span>
        </button>
      )}
    </div>
  );
}

function AnnouncementSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="pb-3 border-b border-ink/15">
        <div className="h-3 w-24 bg-ink/10 animate-pulse" />
      </div>
      <ul className="mt-2 space-y-px bg-ink/15">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="bg-paper px-7 py-7">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 bg-ink/10 animate-pulse" />
              <div className="h-3 w-20 bg-ink/10 animate-pulse" />
              <div className="h-3 w-12 bg-ink/5 animate-pulse" />
            </div>
            <div className="mt-4 h-6 w-2/3 bg-ink/10 animate-pulse" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full bg-ink/5 animate-pulse" />
              <div className="h-3 w-11/12 bg-ink/5 animate-pulse" />
              <div className="h-3 w-3/4 bg-ink/5 animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

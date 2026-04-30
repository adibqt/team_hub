"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  UserPlus,
  Trash2,
  ShieldCheck,
  Mail,
  Clock4,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";
import Avatar from "@/components/ui/Avatar";
import InviteMemberModal from "@/components/workspaces/InviteMemberModal";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelative(d) {
  if (!d) return "—";
  const diffMs = Date.now() - new Date(d).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return "Today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function MembersPage() {
  const { workspaceId } = useParams();
  const me = useAuthStore((s) => s.user);
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const invites = useWorkspaceStore((s) => s.invitesById[workspaceId] || []);
  const loadOne = useWorkspaceStore((s) => s.loadOne);
  const loadInvites = useWorkspaceStore((s) => s.loadInvites);
  const changeMemberRole = useWorkspaceStore((s) => s.changeMemberRole);
  const removeMember = useWorkspaceStore((s) => s.removeMember);
  const revokeInvite = useWorkspaceStore((s) => s.revokeInvite);

  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const isAdmin = ws?.viewerRole === "ADMIN";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([loadOne(workspaceId), isAdmin ? null : null])
      .then(async () => {
        // Re-check admin status with the freshly-loaded workspace before pulling invites.
        const fresh = useWorkspaceStore.getState().workspaceById[workspaceId];
        if (fresh?.viewerRole === "ADMIN") await loadInvites(workspaceId);
      })
      .catch(() => toast.error("Couldn't load workspace members."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [workspaceId, loadOne, loadInvites]); // eslint-disable-line react-hooks/exhaustive-deps

  const members = ws?.members || [];
  const adminCount = members.filter((m) => m.role === "ADMIN").length;

  async function handleRoleChange(userId, role) {
    try {
      await changeMemberRole(workspaceId, userId, role);
      toast.success(`Role updated to ${role}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't update role.");
    }
  }

  async function handleRemove(userId, name) {
    const isSelf = userId === me?.id;
    const ok = window.confirm(
      isSelf
        ? "Leave this workspace? You'll lose access immediately."
        : `Remove ${name} from this workspace? They'll lose access immediately.`
    );
    if (!ok) return;
    try {
      await removeMember(workspaceId, userId);
      toast.success(isSelf ? "You left the workspace" : `${name} removed`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't remove member.");
    }
  }

  async function handleRevoke(inviteId) {
    if (!window.confirm("Revoke this invite? The link will stop working immediately.")) return;
    try {
      await revokeInvite(workspaceId, inviteId);
      toast.success("Invite revoked");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't revoke invite.");
    }
  }

  async function copyInviteLink(invite) {
    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 1800);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy — please copy manually.");
    }
  }

  return (
    <div className="relative max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* ============================================================ HEADER */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8 bg-ember" />
          <span>Workspace · {ws?.name || "—"}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline">Roster</span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-ink">
            <span className="italic font-normal">Members</span>
            <span className="text-ember">.</span>
          </h1>
          <div className="flex items-center gap-4">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 tabular-nums">
              {loading ? "loading…" : `${members.length} on roster`}
              {invites.length > 0 && (
                <>
                  <span className="text-ink/25"> · </span>
                  {invites.length} pending
                </>
              )}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <UserPlus size={14} strokeWidth={1.75} aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest2">
                  Invite
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ MEMBERS LEDGER */}
      <section className="mt-12 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-end justify-between pb-3 border-b border-ink/15">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="text-ember">§</span>&nbsp;Roster · 01
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 tabular-nums">
            {adminCount} admin · {members.length - adminCount} member
          </p>
        </div>

        {loading ? (
          <MemberSkeleton />
        ) : members.length === 0 ? (
          <p className="mt-8 text-sm text-ink/55 italic">No members loaded.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ink/10">
            {members.map((m, i) => {
              const isSelf = m.userId === me?.id;
              const lastAdmin = m.role === "ADMIN" && adminCount === 1;
              return (
                <li
                  key={m.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6 py-5"
                >
                  <div className="flex items-center gap-4">
                    <span className="hidden sm:block font-mono text-[10px] tabular-nums text-ink/40 tracking-widest2 w-8">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Avatar user={m.user} size="md" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-display italic text-lg leading-tight tracking-tight text-ink truncate">
                      {m.user.name}
                      {isSelf && (
                        <span className="ml-2 font-mono not-italic text-[10px] uppercase tracking-widest2 text-ember">
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-ink/55 truncate">{m.user.email}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-ink/35">
                      Joined {fmtDate(m.joinedAt)}
                      <span className="text-ink/25"> · </span>
                      {fmtRelative(m.joinedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {isAdmin && !lastAdmin ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                        aria-label={`Role for ${m.user.name}`}
                        className="font-mono text-[10px] uppercase tracking-widest2 text-ink bg-paper border border-ink/15 px-2.5 py-1.5 cursor-pointer hover:border-ink/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 px-2.5 py-1.5 border ${
                          m.role === "ADMIN"
                            ? "text-ember border-ember/40 bg-ember-50"
                            : "text-ink/65 border-ink/15"
                        }`}
                      >
                        {m.role === "ADMIN" && <ShieldCheck size={11} strokeWidth={1.75} />}
                        {m.role}
                      </span>
                    )}

                    {(isAdmin || isSelf) && !lastAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemove(m.userId, m.user.name)}
                        aria-label={isSelf ? "Leave workspace" : `Remove ${m.user.name}`}
                        title={isSelf ? "Leave workspace" : "Remove"}
                        className="p-2 text-ink/45 hover:text-ember hover:bg-ember-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ============================================================ PENDING INVITES (ADMIN ONLY) */}
      {isAdmin && (
        <section className="mt-14 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-end justify-between pb-3 border-b border-ink/15">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
              <span className="text-ember">§</span>&nbsp;Pending invites · 02
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 tabular-nums">
              {invites.length} unredeemed
            </p>
          </div>

          {invites.length === 0 ? (
            <div className="mt-8 px-6 py-10 border border-dashed border-ink/15 bg-paper-50 text-center">
              <Mail size={20} strokeWidth={1.5} className="mx-auto text-ink/35" />
              <p className="mt-3 font-mono text-[11px] uppercase tracking-widest2 text-ink/55">
                No invitations outstanding
              </p>
              <p className="mt-2 text-sm text-ink/55">
                Issue one above and the link will park here until it's accepted or revoked.
              </p>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-ink/10">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6 py-4"
                >
                  <span className="hidden sm:grid place-items-center h-9 w-9 bg-ember-50 text-ember">
                    <Clock4 size={15} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] text-ink truncate">{inv.email}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
                      {inv.role}
                      <span className="text-ink/25"> · </span>
                      Issued {fmtRelative(inv.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyInviteLink(inv)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink/15 hover:border-ink/45 hover:bg-paper-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember font-mono text-[10px] uppercase tracking-widest2 text-ink/70"
                    >
                      {copiedId === inv.id ? (
                        <Check size={11} strokeWidth={2.25} className="text-ember" />
                      ) : (
                        <Copy size={11} strokeWidth={1.75} />
                      )}
                      {copiedId === inv.id ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevoke(inv.id)}
                      aria-label="Revoke invite"
                      className="p-2 text-ink/45 hover:text-ember hover:bg-ember-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
}

function MemberSkeleton() {
  return (
    <ul aria-hidden="true" className="mt-2 divide-y divide-ink/10">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5">
          <div className="h-10 w-10 bg-ink/10 rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-1/3 bg-ink/10 animate-pulse" />
            <div className="h-3 w-1/2 bg-ink/5 animate-pulse" />
          </div>
          <div className="h-6 w-20 bg-ink/10 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

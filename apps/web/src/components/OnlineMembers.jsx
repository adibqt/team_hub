"use client";
import { useMemo } from "react";
import Avatar from "@/components/ui/Avatar";
import { useAuthStore } from "@/stores/authStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

/**
 * Compact "who's around right now" strip. Pulls the workspace roster
 * and intersects it with the live presence set for that workspace.
 */
export default function OnlineMembers({ workspaceId, max = 6 }) {
  const me = useAuthStore((s) => s.user);
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const onlineIds = usePresenceStore((s) => s.byWorkspace[workspaceId] || []);

  const online = useMemo(() => {
    const set = new Set(onlineIds);
    return (ws?.members || [])
      .filter((m) => set.has(m.userId))
      .map((m) => m.user)
      .sort((a, b) => {
        if (a.id === me?.id) return -1;
        if (b.id === me?.id) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [onlineIds, ws?.members, me?.id]);

  if (!ws?.members) return null;

  const visible = online.slice(0, max);
  const overflow = Math.max(0, online.length - visible.length);

  return (
    <div className="inline-flex items-center gap-3">
      <span
        className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 inline-flex items-center gap-2"
        aria-label={`${online.length} online`}
      >
        <span className="relative inline-flex h-1.5 w-1.5" aria-hidden="true">
          <span
            className={`absolute inset-0 rounded-full ${online.length ? "bg-emerald-500 animate-ping opacity-50" : "bg-ink/25"}`}
          />
          <span
            className={`relative h-1.5 w-1.5 rounded-full ${online.length ? "bg-emerald-500" : "bg-ink/25"}`}
          />
        </span>
        <span className="tabular-nums">
          {online.length} online
        </span>
      </span>
      {visible.length > 0 && (
        <div className="flex -space-x-1.5">
          {visible.map((u) => (
            <span
              key={u.id}
              className="relative ring-2 ring-paper rounded-full"
              title={`${u.name}${u.id === me?.id ? " (you)" : ""}`}
            >
              <Avatar user={u} size="xs" />
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-paper"
              />
            </span>
          ))}
          {overflow > 0 && (
            <span className="relative ring-2 ring-paper rounded-full h-6 w-6 grid place-items-center bg-paper-200 text-[9px] font-mono tabular-nums text-ink/65">
              +{overflow}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { usePresenceStore } from "@/stores/presenceStore";

/**
 * Joins the workspace room and keeps the presence store synced for it.
 * Designed to coexist with each page's own event listeners — only takes
 * responsibility for `presence:update` and the join/leave handshake.
 */
export function useWorkspaceLive(workspaceId) {
  const setOnline = usePresenceStore((s) => s.setOnline);
  const clear = usePresenceStore((s) => s.clear);

  useEffect(() => {
    if (!workspaceId) return;
    const s = getSocket();
    s.emit("workspace:join", workspaceId);

    const onPresence = (p) => {
      if (p?.workspaceId === workspaceId) setOnline(workspaceId, p.userIds || []);
    };
    s.on("presence:update", onPresence);

    // Some servers won't emit a presence frame to a freshly-joined socket
    // until the next change, so seed with whatever we already have.
    return () => {
      s.off("presence:update", onPresence);
      s.emit("workspace:leave", workspaceId);
      clear(workspaceId);
    };
  }, [workspaceId, setOnline, clear]);
}

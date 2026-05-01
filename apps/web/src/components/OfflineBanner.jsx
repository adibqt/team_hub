"use client";
import { useEffect, useRef, useState } from "react";
import { CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { subscribe } from "@/lib/offline";

export default function OfflineBanner() {
  const [status, setStatus] = useState({ online: true, queued: 0, replaying: false });
  const [justSynced, setJustSynced] = useState(false);
  const prevReplayingRef = useRef(false);

  useEffect(() => {
    return subscribe((s) => {
      setStatus(s);
      // Flash a "synced" badge briefly when a replay finishes cleanly.
      if (prevReplayingRef.current && !s.replaying && s.online && s.queued === 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2200);
      }
      prevReplayingRef.current = s.replaying;
    });
  }, []);

  useEffect(() => {
    const onFailed = (e) => {
      const path = e.detail?.entry?.url || "request";
      toast.error(`Offline change rejected on sync: ${path}`);
    };
    window.addEventListener("offline:replay-failed", onFailed);
    return () => window.removeEventListener("offline:replay-failed", onFailed);
  }, []);

  if (status.online && status.queued === 0 && !status.replaying && !justSynced) {
    return null;
  }

  const tone = !status.online
    ? "bg-ink text-paper border-ink"
    : status.replaying
    ? "bg-ember/15 text-ink border-ember/40"
    : status.queued > 0
    ? "bg-paper-200 text-ink border-ink/25"
    : "bg-emerald-500/10 text-ink border-emerald-500/30";

  const Icon = !status.online
    ? CloudOff
    : status.replaying
    ? RefreshCw
    : status.queued > 0
    ? CloudOff
    : CheckCircle2;

  const label = !status.online
    ? status.queued > 0
      ? `Offline · ${status.queued} change${status.queued === 1 ? "" : "s"} queued`
      : "Offline · changes will sync when you're back"
    : status.replaying
    ? `Syncing ${status.queued} change${status.queued === 1 ? "" : "s"}…`
    : status.queued > 0
    ? `${status.queued} pending`
    : "All changes synced";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed lg:top-3 top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 border ${tone} font-mono text-[11px] uppercase tracking-widest2 shadow-sm`}
    >
      <Icon
        size={13}
        strokeWidth={1.75}
        className={status.replaying ? "animate-spin" : ""}
      />
      <span>{label}</span>
    </div>
  );
}

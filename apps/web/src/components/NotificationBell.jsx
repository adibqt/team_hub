"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, AtSign, Check, CheckCheck } from "lucide-react";
import clsx from "clsx";
import { useNotificationsStore } from "@/stores/notificationsStore";

function fmtRelative(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(d).toLocaleDateString();
}

export default function NotificationBell({ align = "right" }) {
  const items = useNotificationsStore((s) => s.items);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        className={clsx(
          "relative p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember",
          open ? "text-ink" : "text-ink/55 hover:text-ink"
        )}
      >
        <Bell size={16} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-ember text-paper text-[9px] font-mono tabular-nums grid place-items-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={clsx(
            "absolute mt-2 w-[360px] z-50 bg-paper border border-ink/15 shadow-2xl animate-fade-up",
            align === "left" ? "left-0" : "right-0"
          )}
        >
          <div className="px-4 py-3 border-b border-ink/15 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
              <span className="text-ember">§</span>&nbsp;Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 text-ink/55 hover:text-ember transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <CheckCheck size={11} strokeWidth={1.75} />
                Mark all
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell size={18} strokeWidth={1.5} className="mx-auto text-ink/30" />
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
                Nothing yet
              </p>
              <p className="mt-1 text-[12px] text-ink/55">
                Mentions and updates land here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[480px] overflow-y-auto divide-y divide-ink/10">
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n, onClick }) {
  const unread = !n.readAt;
  const p = n.payload || {};

  // Mention is the only type for now, but keep this open-ended.
  const content =
    n.type === "mention" ? (
      <>
        <span className="font-medium text-ink">{p.actorName || "Someone"}</span>
        <span className="text-ink/65"> mentioned you in </span>
        <span className="italic text-ink/85">{p.announcementTitle || "an announcement"}</span>
        {p.preview && (
          <p className="mt-1 text-[12px] text-ink/55 line-clamp-2">"{p.preview}"</p>
        )}
      </>
    ) : (
      <span className="text-ink/65">{n.type}</span>
    );

  const href =
    n.type === "mention" && p.workspaceId && p.announcementId
      ? `/w/${p.workspaceId}/announcements#a-${p.announcementId}`
      : null;

  const Body = (
    <div
      className={clsx(
        "relative px-4 py-3 group transition-colors hover:bg-paper-50",
        unread && "bg-ember/[0.04]"
      )}
    >
      {unread && (
        <span aria-hidden="true" className="absolute left-1 top-4 h-1.5 w-1.5 rounded-full bg-ember" />
      )}
      <div className="flex items-start gap-3 pl-3">
        <span className="mt-0.5 shrink-0 h-7 w-7 grid place-items-center bg-paper-100 border border-ink/10 text-ink/55">
          <AtSign size={12} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug">{content}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-ink/40 tabular-nums">
            {fmtRelative(n.createdAt)}
          </p>
        </div>
        {unread && (
          <span aria-hidden="true" className="shrink-0 mt-1 text-ink/30 group-hover:text-ember">
            <Check size={11} strokeWidth={1.75} />
          </span>
        )}
      </div>
    </div>
  );

  return (
    <li>
      {href ? (
        <Link href={href} onClick={onClick} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ember">
          {Body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
        >
          {Body}
        </button>
      )}
    </li>
  );
}

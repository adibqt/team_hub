"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  UserCircle2,
  Menu,
  X,
  Plus,
  Target,
  ListChecks,
  Megaphone,
  Users,
  Settings,
  ScrollText,
  Compass,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useNotificationsStore } from "@/stores/notificationsStore";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import CreateWorkspaceModal from "@/components/workspaces/CreateWorkspaceModal";
import { getSocket } from "@/lib/socket";
import { useWorkspaceLive } from "@/lib/useWorkspaceLive";

const TOP_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, n: "01" },
  { href: "/profile",   label: "Profile",   icon: UserCircle2,     n: "02" },
];

const WS_NAV = [
  { sub: "",              label: "Overview",      icon: Compass,     n: "01" },
  { sub: "/goals",        label: "Goals",         icon: Target,      n: "02" },
  { sub: "/items",        label: "Action items",  icon: ListChecks,  n: "03" },
  { sub: "/announcements",label: "Announcements", icon: Megaphone,   n: "04" },
  { sub: "/members",      label: "Members",       icon: Users,       n: "05" },
  { sub: "/audit",        label: "Audit",         icon: ScrollText,  n: "06" },
  { sub: "/settings",     label: "Settings",      icon: Settings,    n: "07" },
];

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const load = useWorkspaceStore((s) => s.load);
  const loadNotifications = useNotificationsStore((s) => s.load);
  const pushNotification = useNotificationsStore((s) => s.pushNotification);
  const [bootChecked, setBootChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    api
      .get("/api/users/me")
      .then(({ data }) => {
        setUser(data);
        load().catch(() => {});
        loadNotifications().catch(() => {});
      })
      .catch(() => router.replace("/login"))
      .finally(() => setBootChecked(true));
  }, [router, setUser, load, loadNotifications]);

  // Global socket subscription for notifications, scoped to the user's
  // personal room (the API joins us into it on connect). One handler for
  // the whole app — workspace pages bind their own listeners separately.
  useEffect(() => {
    if (!user?.id) return;
    const s = getSocket();
    const onNew = (note) => {
      pushNotification(note);
      if (note?.type === "mention" && note?.payload?.actorName) {
        toast(`${note.payload.actorName} mentioned you`, { icon: "@" });
      }
    };
    s.on("notification:new", onNew);
    return () => {
      s.off("notification:new", onNew);
    };
  }, [user?.id, pushNotification]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Hooks must run unconditionally — keep this above the auth-loading
  // early return so React's hook order stays stable across renders.
  useWorkspaceLive(params?.workspaceId);

  if (!bootChecked || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-paper text-ink">
        <div className="grain" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 flex items-center gap-3">
            <span aria-hidden="true" className="inline-block h-px w-6 bg-ember" />
            <span>Auth · Handshake</span>
          </div>
          <p className="font-display italic text-2xl text-ink">
            Checking your session<span className="animate-blink text-ember">_</span>
          </p>
          <div className="w-44 h-px bg-ink/10 overflow-hidden">
            <span className="block h-full w-full bg-ember animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const wsCount = workspaces?.length ?? 0;
  const activeWorkspaceId = params?.workspaceId;
  const activeWorkspace = activeWorkspaceId
    ? workspaces.find((w) => w.id === activeWorkspaceId)
    : null;

  return (
    <div className="relative min-h-screen flex bg-paper text-ink">
      <div className="grain" aria-hidden="true" />

      {/* ============================================================ MOBILE TOPBAR */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-paper/90 backdrop-blur border-b border-ink/15 flex items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-baseline gap-3">
          <span aria-hidden="true" className="font-display italic text-xl leading-none text-ink">
            T<span className="text-ember">·</span>H
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            Workbench
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 border border-ink/15 hover:border-ink/45 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          >
            {mobileOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </header>

      {/* ============================================================ SIDEBAR */}
      <aside
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-20 w-72 shrink-0",
          "bg-paper-200/80 backdrop-blur-sm border-r border-ink/15",
          "flex flex-col",
          "transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Masthead */}
        <div className="px-6 pt-7 pb-5 border-b border-ink/15 hidden lg:block">
          <div className="flex items-baseline justify-between gap-3">
            <Link href="/dashboard" className="flex items-baseline gap-2.5 group/logo">
              <span
                aria-hidden="true"
                className="font-display italic text-2xl leading-none text-ink group-hover/logo:text-ember transition-colors"
              >
                T<span className="text-ember">·</span>H
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
                The Team Hub
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/35 tabular-nums">
                v.{String(new Date().getFullYear()).slice(-2)}
              </span>
            </div>
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex items-center gap-2">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-ember animate-ping opacity-50" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-ember" />
            </span>
            Connected · Live
          </p>
        </div>

        {/* mobile spacer for the fixed topbar */}
        <div className="h-14 lg:hidden" />

        <div className="flex-1 overflow-y-auto">
          {/* Section: NAV */}
          <div className="px-6 pt-6 pb-2">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
              <span className="text-ember">§</span>&nbsp;Nav&nbsp;<span className="text-ink/25">·</span>&nbsp;01
            </p>
          </div>
          <nav className="px-3 pb-2 space-y-px">
            {TOP_NAV.map(({ href, label, icon: Icon, n }) => {
              const active =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === href || pathname?.startsWith(href + "/");
              return (
                <SideLink key={href} href={href} active={active} icon={Icon} n={n} label={label} />
              );
            })}
          </nav>

          {/* Section: ACTIVE WORKSPACE NAV — appears only on /w/:id/* */}
          {activeWorkspaceId && (
            <>
              <div className="px-6 pt-6 pb-2 mt-2 border-t border-ink/10">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
                    <span className="text-ember">§</span>&nbsp;Inside&nbsp;<span className="text-ink/25">·</span>&nbsp;02
                  </p>
                  {activeWorkspace?.role && (
                    <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
                      {activeWorkspace.role}
                    </span>
                  )}
                </div>
                {activeWorkspace && (
                  <div className="mt-2 flex items-center gap-2 truncate">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 ring-1 ring-ink/15"
                      style={{ background: activeWorkspace.accentColor || "#D34F1F" }}
                    />
                    <span className="font-display italic text-[15px] leading-tight tracking-tight text-ink truncate">
                      {activeWorkspace.name}
                    </span>
                  </div>
                )}
              </div>
              <nav className="px-3 pb-2 space-y-px">
                {WS_NAV.map(({ sub, label, icon: Icon, n }) => {
                  const href = `/w/${activeWorkspaceId}${sub}`;
                  const active = sub === ""
                    ? pathname === `/w/${activeWorkspaceId}`
                    : pathname === href || pathname?.startsWith(href + "/");
                  return (
                    <SideLink key={sub} href={href} active={active} icon={Icon} n={n} label={label} />
                  );
                })}
              </nav>
            </>
          )}

          {/* Section: WORKSPACES — full list */}
          <div className="px-6 pt-6 pb-2 mt-2 border-t border-ink/10">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
                <span className="text-ember">§</span>&nbsp;Workspaces&nbsp;
                <span className="text-ink/25">·</span>&nbsp;{activeWorkspaceId ? "03" : "02"}
              </p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                title="Create new workspace"
                aria-label="Create new workspace"
                className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 hover:text-ember inline-flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember px-1"
              >
                <Plus size={11} strokeWidth={2} />
                <span>New</span>
              </button>
            </div>
          </div>
          <div className="px-3 pb-4 space-y-px">
            {wsCount === 0 ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="w-full flex items-center gap-3 px-5 py-2.5 text-[12px] leading-relaxed text-ink/55 italic hover:bg-paper/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <Plus size={13} strokeWidth={1.75} className="text-ink/35" />
                Open a workspace…
              </button>
            ) : (
              workspaces.map((ws, i) => {
                const active = pathname?.startsWith(`/w/${ws.id}`);
                return (
                  <Link
                    key={ws.id}
                    href={`/w/${ws.id}`}
                    className={clsx(
                      "group/ws relative flex items-center gap-3 px-5 py-2 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ember",
                      active ? "bg-paper text-ink" : "text-ink/65 hover:text-ink hover:bg-paper/60"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "absolute left-0 top-1.5 bottom-1.5 w-[3px] transition-colors",
                        active ? "bg-ember" : "bg-transparent"
                      )}
                    />
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 ring-1 ring-ink/15"
                      style={{ background: ws.accentColor || "#D34F1F" }}
                    />
                    <span className="text-[13px] font-medium truncate">{ws.name}</span>
                    <span className="ml-auto font-mono text-[10px] tabular-nums text-ink/30">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Footer / user card */}
        <div className="px-3 py-4 border-t border-ink/15">
          <UserMenu />
          <p className="mt-3 px-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/35 flex items-center justify-between gap-2">
            <span>&copy; {new Date().getFullYear()} TH</span>
            <span className="text-ember">·</span>
            <span>Print&nbsp;ready</span>
          </p>
        </div>
      </aside>

      {/* mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-10 bg-ink/30 backdrop-blur-sm"
        />
      )}

      <main className="relative z-10 flex-1 overflow-auto pt-14 lg:pt-0">{children}</main>

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function SideLink({ href, active, icon: Icon, n, label }) {
  return (
    <Link
      href={href}
      className={clsx(
        "group/nav relative flex items-center gap-3 pl-5 pr-3 py-2.5 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-1 focus-visible:ring-offset-paper-200",
        active ? "bg-paper text-ink" : "text-ink/65 hover:text-ink hover:bg-paper/60"
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "absolute left-0 top-2 bottom-2 w-[3px] transition-colors",
          active ? "bg-ember" : "bg-transparent group-hover/nav:bg-ink/20"
        )}
      />
      <Icon
        size={15}
        strokeWidth={1.75}
        className={active ? "text-ember" : "text-ink/45 group-hover/nav:text-ink/70"}
      />
      <span className="text-[13px] font-medium tracking-tight">{label}</span>
      <span
        className={clsx(
          "ml-auto font-mono text-[10px] tabular-nums tracking-widest2",
          active ? "text-ink/55" : "text-ink/30"
        )}
        aria-hidden="true"
      >
        {n}
      </span>
    </Link>
  );
}

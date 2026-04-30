"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, UserCircle2, Menu, X } from "lucide-react";
import clsx from "clsx";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import UserMenu from "@/components/UserMenu";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, n: "01" },
  { href: "/profile",   label: "Profile",   icon: UserCircle2,     n: "02" },
];

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const [bootChecked, setBootChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api
      .get("/api/users/me")
      .then(({ data }) => setUser(data))
      .catch(() => router.replace("/login"))
      .finally(() => setBootChecked(true));
  }, [router, setUser]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!bootChecked || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-paper text-ink">
        <div className="grain" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 flex items-center gap-3">
            <span aria-hidden="true" className="inline-block h-px w-6 bg-ember" />
            <span>Auth · Handshake</span>
          </div>
          <p className="font-display italic text-2xl text-ink">Checking your session<span className="animate-blink text-ember">_</span></p>
          <div className="w-44 h-px bg-ink/10 overflow-hidden">
            <span className="block h-full w-full bg-ember animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const wsCount = workspaces?.length ?? 0;

  return (
    <div className="relative min-h-screen flex bg-paper text-ink">
      <div className="grain" aria-hidden="true" />

      {/* ============================================================
          MOBILE TOPBAR
         ============================================================ */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-paper/90 backdrop-blur border-b border-ink/15 flex items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-baseline gap-3">
          <span aria-hidden="true" className="font-display italic text-xl leading-none text-ink">
            T<span className="text-ember">·</span>H
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            Workbench
          </span>
        </Link>
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 border border-ink/15 hover:border-ink/45 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
        >
          {mobileOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
        </button>
      </header>

      {/* ============================================================
          SIDEBAR — paper-2 binder spine
         ============================================================ */}
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
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/35 tabular-nums">
              v.{String(new Date().getFullYear()).slice(-2)}
            </span>
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

        {/* Section: NAV */}
        <div className="px-6 pt-6 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
            <span className="text-ember">§</span>&nbsp;Nav&nbsp;<span className="text-ink/25">·</span>&nbsp;01
          </p>
        </div>
        <nav className="px-3 pb-2 space-y-px">
          {NAV.map(({ href, label, icon: Icon, n }) => {
            const active = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "group/nav relative flex items-center gap-3 pl-5 pr-3 py-2.5 transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-1 focus-visible:ring-offset-paper-200",
                  active
                    ? "bg-paper text-ink"
                    : "text-ink/65 hover:text-ink hover:bg-paper/60"
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    "absolute left-0 top-2 bottom-2 w-[3px] transition-colors",
                    active ? "bg-ember" : "bg-transparent group-hover/nav:bg-ink/20"
                  )}
                />
                <Icon size={15} strokeWidth={1.75} className={active ? "text-ember" : "text-ink/45 group-hover/nav:text-ink/70"} />
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
          })}
        </nav>

        {/* Section: WORKSPACES */}
        <div className="px-6 pt-6 pb-2 mt-2 border-t border-ink/10">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
              <span className="text-ember">§</span>&nbsp;Workspaces&nbsp;<span className="text-ink/25">·</span>&nbsp;02
            </p>
            <span className="font-mono text-[10px] tabular-nums text-ink/40">
              {String(wsCount).padStart(2, "0")}
            </span>
          </div>
        </div>
        <div className="px-3 pb-2 space-y-px max-h-[28vh] overflow-y-auto">
          {workspaces?.length === 0 ? (
            <p className="px-5 py-2 text-[12px] leading-relaxed text-ink/45 italic">
              No workspaces yet.
            </p>
          ) : (
            workspaces?.slice(0, 8).map((ws, i) => {
              const active = pathname?.startsWith(`/w/${ws.id}`);
              return (
                <Link
                  key={ws.id}
                  href={`/w/${ws.id}`}
                  className={clsx(
                    "group/ws flex items-center gap-3 px-5 py-2 transition-colors",
                    active
                      ? "bg-paper text-ink"
                      : "text-ink/65 hover:text-ink hover:bg-paper/60"
                  )}
                >
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

        {/* Footer / user card */}
        <div className="mt-auto px-3 py-4 border-t border-ink/15">
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
    </div>
  );
}

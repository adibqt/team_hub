"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Layers, LayoutDashboard, Loader2, Menu, X } from "lucide-react";
import clsx from "clsx";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import UserMenu from "@/components/UserMenu";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
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
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm">Checking your session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-fuchsia-500">
            <Layers size={16} className="text-white" />
          </span>
          <span className="font-semibold tracking-tight">Team Hub</span>
        </Link>
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-20 w-64 shrink-0",
          "bg-slate-950 text-white flex flex-col",
          "transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-5 hidden lg:flex items-center gap-2.5">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 shadow-lg shadow-brand-500/30">
            <Layers size={18} className="text-white" />
          </span>
          <span className="font-semibold tracking-tight">Team Hub</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 lg:py-2 space-y-1 mt-14 lg:mt-0">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-white/5">
          <UserMenu />
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-10 bg-slate-900/40 backdrop-blur-sm"
        />
      )}

      <main className="flex-1 overflow-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}

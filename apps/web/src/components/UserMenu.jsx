"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, LogOut, UserCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import Avatar from "@/components/ui/Avatar";
import { useAuthStore } from "@/stores/authStore";

export default function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  async function handleLogout() {
    setOpen(false);
    await logout();
    toast.success("Signed out");
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400/50"
      >
        <Avatar user={user} size="md" />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-slate-400 truncate">{user.email}</p>
        </div>
        <ChevronUp
          size={16}
          className={clsx("text-slate-400 transition-transform", open ? "rotate-0" : "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-slate-800 border border-white/10 shadow-2xl overflow-hidden animate-fade-up"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors"
          >
            <UserCircle2 size={16} className="text-slate-400" />
            Your profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

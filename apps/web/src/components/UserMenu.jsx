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
        className={clsx(
          "w-full flex items-center gap-3 px-2.5 py-2.5 transition-colors",
          "border border-ink/10 hover:border-ink/30 bg-paper-50 hover:bg-paper-200/60",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        )}
      >
        <Avatar user={user} size="sm" />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13px] leading-tight font-medium text-ink truncate">
            {user.name}
          </p>
          <p className="font-mono text-[10px] tracking-wider text-ink/50 truncate mt-0.5">
            {user.email}
          </p>
        </div>
        <ChevronUp
          size={14}
          strokeWidth={1.75}
          className={clsx(
            "text-ink/45 transition-transform shrink-0",
            open ? "rotate-0" : "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-2 bg-ink text-paper border border-ink overflow-hidden animate-fade-up shadow-[0_-8px_24px_-12px_rgba(15,15,18,0.45)]"
        >
          <div className="px-3 pt-3 pb-2 border-b border-paper/10">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-paper/45">
              Signed in as
            </p>
            <p className="mt-0.5 text-sm font-medium text-paper truncate">{user.name}</p>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-paper/85 hover:bg-paper/10 hover:text-paper transition-colors"
          >
            <UserCircle2 size={15} strokeWidth={1.75} className="text-paper/60" />
            <span>Your profile</span>
            <span className="ml-auto font-mono text-[10px] tracking-widest2 text-paper/35">
              ↗
            </span>
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-ember-200 hover:bg-ember/15 hover:text-ember-100 transition-colors border-t border-paper/10"
          >
            <LogOut size={15} strokeWidth={1.75} />
            <span>Sign out</span>
            <span className="ml-auto font-mono text-[10px] tracking-widest2 text-paper/35">
              ⌘⇧Q
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

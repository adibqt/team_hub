"use client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { LogOut, Mail, Calendar, BadgeCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import AvatarUpload from "@/components/AvatarUpload";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await logout();
    toast.success("Signed out");
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <header className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
          Your profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Personalize how you appear across your workspaces.
        </p>
      </header>

      {/* Avatar card */}
      <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 lg:p-8">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-900">Profile photo</h2>
          <span className="text-xs text-slate-400">Visible to your teammates</span>
        </div>
        <AvatarUpload />
      </section>

      {/* Account details */}
      <section className="mt-6 rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Account details</h2>
          <p className="mt-1 text-xs text-slate-500">
            These details are tied to your sign-in and currently can't be changed from here.
          </p>
        </div>
        <dl className="divide-y divide-slate-100">
          <Row icon={BadgeCheck} label="Full name" value={user.name} />
          <Row icon={Mail} label="Email" value={user.email} mono />
          <Row icon={Calendar} label="Member since" value={formatDate(user.createdAt)} />
        </dl>
      </section>

      {/* Danger zone */}
      <section className="mt-6 rounded-2xl bg-white shadow-sm border border-slate-200 p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Sign out</h2>
            <p className="mt-1 text-sm text-slate-500">
              You'll be returned to the sign-in page. We'll keep your data safe and waiting.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-200"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ icon: Icon, label, value, mono }) {
  return (
    <div className="px-6 lg:px-8 py-4 flex items-center gap-4">
      <span className="grid place-items-center h-9 w-9 rounded-lg bg-slate-50 text-slate-500 shrink-0">
        <Icon size={16} />
      </span>
      <dt className="w-32 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className={`text-sm text-slate-900 truncate ${mono ? "font-mono text-xs sm:text-sm" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

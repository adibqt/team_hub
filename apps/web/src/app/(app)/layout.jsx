"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";

export default function AppLayout({ children }) {
  const { user, setUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    api.get("/api/users/me")
      .then(({ data }) => setUser(data))
      .catch(() => router.replace("/login"));
  }, []);

  if (!user) return <div className="p-8 animate-pulse">Loading…</div>;

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-gray-900 text-white flex flex-col p-4 gap-2">
        <span className="font-bold text-lg mb-4">Team Hub</span>
        <a href="/dashboard" className="hover:bg-gray-700 rounded px-2 py-1">Dashboard</a>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}

"use client";
import { useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { workspaces, load } = useWorkspaceStore();

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Welcome, {user?.name}</h1>
      <h2 className="text-lg font-semibold mb-4">Your Workspaces</h2>
      {workspaces.length === 0 ? (
        <p className="text-gray-400">No workspaces yet. Create one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/w/${ws.id}`}
              className="bg-white rounded-xl shadow p-6 hover:shadow-md transition border-l-4"
              style={{ borderColor: ws.accentColor }}>
              <h3 className="font-semibold text-lg">{ws.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{ws.description || "No description"}</p>
              <span className="text-xs text-gray-400 mt-2 block">{ws.role}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useGoalsStore } from "@/stores/goalsStore";
import { getSocket } from "@/lib/socket";
import { usePresenceStore } from "@/stores/presenceStore";

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const { goals, load } = useGoalsStore();
  const setOnline = usePresenceStore((s) => s.setOnline);

  useEffect(() => {
    load(workspaceId);
    const s = getSocket();
    s.emit("workspace:join", workspaceId);
    s.on("goal:created", (g) => useGoalsStore.getState().pushGoal(g));
    s.on("presence:update", (ids) => setOnline(ids));
    return () => { s.off("goal:created"); s.off("presence:update"); };
  }, [workspaceId]);

  return (
    <div className="p-8">
      <div className="flex gap-4 mb-8">
        {["goals", "announcements", "items", "audit"].map((section) => (
          <Link key={section} href={`/w/${workspaceId}/${section}`}
            className="px-4 py-2 bg-white rounded-lg shadow text-sm font-medium capitalize hover:bg-blue-50">
            {section}
          </Link>
        ))}
      </div>
      <h2 className="text-lg font-semibold mb-4">Recent Goals</h2>
      {goals.length === 0 ? (
        <p className="text-gray-400">No goals yet.</p>
      ) : (
        <ul className="space-y-2">
          {goals.slice(0, 5).map((g) => (
            <li key={g.id} className="bg-white rounded-lg shadow px-4 py-3 flex items-center justify-between">
              <span className="font-medium">{g.title}</span>
              <span className="text-xs text-gray-500">{g.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useGoalsStore } from "@/stores/goalsStore";

export default function GoalsPage() {
  const { workspaceId } = useParams();
  const { goals, load } = useGoalsStore();

  useEffect(() => { load(workspaceId); }, [workspaceId]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Goals</h1>
      {goals.length === 0 ? (
        <p className="text-gray-400">No goals yet. Create your first goal.</p>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{goal.title}</h2>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{goal.status}</span>
              </div>
              {goal.description && <p className="text-sm text-gray-500 mt-1">{goal.description}</p>}
              {goal.milestones?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {goal.milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${m.progress}%` }} />
                      </div>
                      <span className="w-20 text-gray-600 truncate">{m.title}</span>
                      <span className="text-gray-400">{m.progress}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

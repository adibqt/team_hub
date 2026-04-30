"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

export default function AnnouncementsPage() {
  const { workspaceId } = useParams();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    api.get(`/api/workspaces/${workspaceId}/announcements`)
      .then(({ data }) => setAnnouncements(data));
  }, [workspaceId]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Announcements</h1>
      {announcements.length === 0 ? (
        <p className="text-gray-400">No announcements yet.</p>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">{a.title}</h2>
                {a.pinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Pinned</span>}
              </div>
              <div className="prose text-sm" dangerouslySetInnerHTML={{ __html: a.bodyHtml }} />
              <div className="flex gap-2 mt-3 text-lg">
                {a.reactions?.map((r) => <span key={r.id}>{r.emoji}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

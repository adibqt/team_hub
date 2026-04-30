"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

export default function AuditPage() {
  const { workspaceId } = useParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ actorId: "", action: "", from: "", to: "" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page, take: 50, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
    api.get(`/api/workspaces/${workspaceId}/audit?${params}`)
      .then(({ data }) => { setRows(data.rows); setTotal(data.total); });
  }, [workspaceId, page, filters]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <a href={`${process.env.NEXT_PUBLIC_API_URL}/api/workspaces/${workspaceId}/audit.csv`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
          Download CSV
        </a>
      </div>
      <div className="flex gap-3 mb-6">
        <input className="border rounded px-3 py-2 text-sm" placeholder="Filter action…"
          value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
        <input className="border rounded px-3 py-2 text-sm" type="date" placeholder="From"
          value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input className="border rounded px-3 py-2 text-sm" type="date" placeholder="To"
          value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
      </div>
      <div className="bg-white rounded-xl shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {["When", "Actor", "Action", "Entity", "ID"].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{r.actor?.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-3">{r.entityType}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.entityId.slice(0, 8)}…</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No audit entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-400 mt-3">{total} total entries</p>
    </div>
  );
}

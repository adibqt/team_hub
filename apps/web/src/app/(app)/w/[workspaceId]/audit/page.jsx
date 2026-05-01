"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

const PAGE_SIZE = 50;

export default function AuditPage() {
  const { workspaceId } = useParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ actor: "", action: "", from: "", to: "" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page, take: PAGE_SIZE, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
    api.get(`/api/workspaces/${workspaceId}/audit?${params}`)
      .then(({ data }) => { setRows(data.rows); setTotal(data.total); });
  }, [workspaceId, page, filters]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <a href={`${process.env.NEXT_PUBLIC_API_URL}/api/workspaces/${workspaceId}/audit.csv`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
          Download CSV
        </a>
      </div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <input className="border rounded px-3 py-2 text-sm" placeholder="Filter by actor name or email…"
          value={filters.actor} onChange={(e) => { setPage(1); setFilters({ ...filters, actor: e.target.value }); }} />
        <input className="border rounded px-3 py-2 text-sm" placeholder="Filter action…"
          value={filters.action} onChange={(e) => { setPage(1); setFilters({ ...filters, action: e.target.value }); }} />
        <input className="border rounded px-3 py-2 text-sm" type="date" placeholder="From"
          value={filters.from} onChange={(e) => { setPage(1); setFilters({ ...filters, from: e.target.value }); }} />
        <input className="border rounded px-3 py-2 text-sm" type="date" placeholder="To"
          value={filters.to} onChange={(e) => { setPage(1); setFilters({ ...filters, to: e.target.value }); }} />
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
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-400">
          {total === 0 ? "No entries" : `Showing ${startIdx}–${endIdx} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            Prev
          </button>
          <span className="text-sm text-gray-500 tabular-nums px-2">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

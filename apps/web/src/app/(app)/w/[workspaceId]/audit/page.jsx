"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, ScrollText, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaceStore";

const PAGE_SIZE = 50;
const FILTER_DEBOUNCE_MS = 300;

export default function AuditPage() {
  const { workspaceId } = useParams();
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const loadOne = useWorkspaceStore((s) => s.loadOne);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ actor: "", action: "", from: "", to: "" });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!workspaceId) return;
    loadOne(workspaceId).catch(() => {});
  }, [workspaceId, loadOne]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedFilters(filters), FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [filters]);

  useEffect(() => {
    if (!workspaceId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      take: String(PAGE_SIZE),
      ...Object.fromEntries(Object.entries(debouncedFilters).filter(([, v]) => v)),
    });

    setLoading(true);
    setError("");

    api
      .get(`/api/workspaces/${workspaceId}/audit?${params}`, { signal: controller.signal })
      .then(({ data }) => {
        setRows(data.rows || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        if (err?.code === "ERR_CANCELED") return;
        setError(err?.response?.data?.error || "Couldn't load audit log.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [workspaceId, page, debouncedFilters]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);
  const accent = ws?.accentColor || "#D34F1F";
  const isAdmin = ws?.viewerRole === "ADMIN";
  const csvHref = `${process.env.NEXT_PUBLIC_API_URL}/api/workspaces/${workspaceId}/audit.csv`;

  const filteredRows = useMemo(() => rows, [rows]);

  return (
    <div className="relative max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8" style={{ background: accent }} />
          <span>Workspace · {ws?.name || "—"}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline">Audit log</span>
        </div>
        <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-ink">
              <span className="italic font-normal">Audit log</span>
              <span className="text-ember">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/65">
              Immutable timeline of workspace activity, filterable by actor, action, and date range.
            </p>
          </div>
          {isAdmin ? (
            <a
              href={csvHref}
              className="inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <Download size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2">Download CSV</span>
            </a>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Only admins can download the audit CSV."
                className="inline-flex items-center gap-2.5 bg-ink/30 text-paper px-4 py-2.5 cursor-not-allowed"
              >
                <Download size={14} strokeWidth={1.75} aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest2">Download CSV</span>
              </button>
              <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
                Admins only
              </p>
            </div>
          )}
        </div>
      </header>

      <section className="mt-10 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-ink/10 border border-ink/10 p-3 sm:p-4">
          <input
            className="border border-ink/15 bg-paper px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            placeholder="Actor name or email…"
            value={filters.actor}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, actor: e.target.value }));
            }}
          />
          <input
            className="border border-ink/15 bg-paper px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            placeholder="Action…"
            value={filters.action}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, action: e.target.value }));
            }}
          />
          <input
            className="border border-ink/15 bg-paper px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            type="date"
            placeholder="From"
            value={filters.from}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, from: e.target.value }));
            }}
          />
          <input
            className="border border-ink/15 bg-paper px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            type="date"
            placeholder="To"
            value={filters.to}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, to: e.target.value }));
            }}
          />
        </div>
      </section>

      <section className="mt-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="pb-3 border-b border-ink/15 flex items-end justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="text-ember">§</span>&nbsp;Entries · 01
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
            {loading ? "loading…" : total === 0 ? "No entries" : `Showing ${startIdx}–${endIdx} of ${total}`}
          </p>
        </div>

        {error ? (
          <div className="mt-4 border border-ember/40 bg-ember-50/40 px-4 py-3 text-sm text-ember inline-flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={1.75} />
            {error}
          </div>
        ) : (
          <div className="mt-4 border border-ink/10 overflow-x-auto bg-paper">
            <table className="w-full min-w-[920px] text-sm border-collapse">
              <thead className="bg-paper-50 border-b border-ink/10 font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
                <tr>
                  {["When", "Actor", "Action", "Entity", "ID"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-ink/45 font-mono text-[10px] uppercase tracking-widest2">
                      loading…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-ink/45 font-mono text-[10px] uppercase tracking-widest2">
                      No audit entries
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.id} className="border-b border-ink/10 last:border-b-0 hover:bg-paper-50">
                      <td className="px-4 py-3 text-ink/55">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-ink">{r.actor?.name || "Unknown"}</td>
                      <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest2 text-ink/70">{r.action}</td>
                      <td className="px-4 py-3 text-ink/75">{r.entityType}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink/45">{r.entityId?.slice(0, 12)}…</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
          Page {page} / {totalPages}
        </p>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-2 border border-ink/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-50"
          >
            <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-2 border border-ink/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-50"
          >
            Next
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      <footer className="mt-14 pt-6 border-t border-ink/15">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex items-center gap-2">
          <ScrollText size={12} strokeWidth={1.75} />
          Immutable events ledger
        </p>
      </footer>
    </div>
  );
}

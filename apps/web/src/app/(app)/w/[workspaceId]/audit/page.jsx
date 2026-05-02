"use client";
import { useEffect, useState } from "react";
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
  const isAdmin = ws?.viewerRole === "ADMIN";
  const csvHref = `${process.env.NEXT_PUBLIC_API_URL}/api/workspaces/${workspaceId}/audit.csv`;

  const hasActiveFilters = Object.values(debouncedFilters).some((v) => v);

  return (
    <div className="relative max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* ============================================================ HEADER */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8 bg-ember" />
          <span>Workspace · {ws?.name || "—"}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline">Ledger</span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-ink">
              <span className="italic font-normal">Audit log</span>
              <span className="text-ember">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/65">
              Immutable timeline of workspace activity — filterable by actor, action, and date.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 tabular-nums">
              {loading ? "loading…" : total === 0 ? "no entries" : `${total} entr${total === 1 ? "y" : "ies"}`}
            </p>
            {isAdmin && (
              <a
                href={csvHref}
                className="inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <Download size={14} strokeWidth={1.75} aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest2">
                  Download CSV
                </span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ FILTERS */}
      <section className="mt-12 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-end justify-between pb-3 border-b border-ink/15">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="text-ember">§</span>&nbsp;Filters · 01
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setFilters({ actor: "", action: "", from: "", to: "" });
              }}
              className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 hover:text-ember transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterField
            label="Actor"
            value={filters.actor}
            onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, actor: v })); }}
            placeholder="Name or email…"
          />
          <FilterField
            label="Action"
            value={filters.action}
            onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, action: v })); }}
            placeholder="e.g. goal.create"
          />
          <FilterField
            label="From"
            type="date"
            value={filters.from}
            onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, from: v })); }}
          />
          <FilterField
            label="To"
            type="date"
            value={filters.to}
            onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, to: v })); }}
          />
        </div>
      </section>

      {/* ============================================================ LEDGER */}
      <section className="mt-14 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-end justify-between pb-3 border-b border-ink/15">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="text-ember">§</span>&nbsp;Entries · 02
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 tabular-nums">
            {loading
              ? "loading…"
              : total === 0
              ? "—"
              : `${startIdx}–${endIdx} of ${total}`}
          </p>
        </div>

        {error ? (
          <div className="mt-6 inline-flex items-center gap-2 border border-ember/40 bg-ember-50 px-4 py-3 text-sm text-ember">
            <AlertTriangle size={14} strokeWidth={1.75} />
            {error}
          </div>
        ) : loading ? (
          <LedgerSkeleton />
        ) : rows.length === 0 ? (
          <div className="mt-8 px-6 py-12 border border-dashed border-ink/15 bg-paper-50 text-center">
            <ScrollText size={20} strokeWidth={1.5} className="mx-auto text-ink/35" />
            <p className="mt-3 font-mono text-[11px] uppercase tracking-widest2 text-ink/55">
              {hasActiveFilters ? "No entries match your filters" : "No audit entries yet"}
            </p>
            <p className="mt-2 text-sm text-ink/55">
              {hasActiveFilters
                ? "Try widening the date range or clearing the actor/action filters."
                : "Activity in this workspace will appear here as soon as it happens."}
            </p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-ink/10">
            {rows.map((r, i) => {
              const idx = (page - 1) * PAGE_SIZE + i + 1;
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6 py-4"
                >
                  <span className="hidden sm:block font-mono text-[10px] tabular-nums text-ink/40 tracking-widest2 w-10">
                    {String(idx).padStart(3, "0")}
                  </span>

                  <div className="min-w-0">
                    <p className="text-[15px] text-ink truncate">
                      <span className="font-display italic">{r.actor?.name || "Unknown"}</span>
                      <span className="text-ink/45"> · </span>
                      <span className="font-mono text-[11px] uppercase tracking-widest2 text-ink/70">
                        {r.action}
                      </span>
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
                      {r.entityType}
                      <span className="text-ink/25"> · </span>
                      <span className="text-ink/40">{r.entityId?.slice(0, 12)}…</span>
                    </p>
                  </div>

                  <p className="text-right font-mono text-[10px] uppercase tracking-widest2 text-ink/55 tabular-nums whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString(undefined, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {!error && total > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 tabular-nums">
              Page {page} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-ink/15 font-mono text-[10px] uppercase tracking-widest2 text-ink/70 hover:border-ink/45 hover:bg-paper-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-ink/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <ChevronLeft size={12} strokeWidth={1.75} aria-hidden="true" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-ink/15 font-mono text-[10px] uppercase tracking-widest2 text-ink/70 hover:border-ink/45 hover:bg-paper-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-ink/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                Next
                <ChevronRight size={12} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>

      <footer className="mt-20 pt-6 border-t border-ink/15">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
          <span className="inline-flex items-center gap-2">
            <ScrollText size={12} strokeWidth={1.75} />
            Immutable events ledger
          </span>
          {!isAdmin && (
            <span className="text-ink/40">CSV export restricted to admins</span>
          )}
        </p>
      </footer>
    </div>
  );
}

function FilterField({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-paper border border-ink/15 px-3 py-2 text-sm text-ink placeholder:text-ink/35 hover:border-ink/45 focus:border-ink/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember transition-colors"
      />
    </label>
  );
}

function LedgerSkeleton() {
  return (
    <ul aria-hidden="true" className="mt-2 divide-y divide-ink/10">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6 py-4"
        >
          <div className="hidden sm:block h-3 w-8 bg-ink/10 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-1/2 bg-ink/10 animate-pulse" />
            <div className="h-3 w-1/3 bg-ink/5 animate-pulse" />
          </div>
          <div className="h-3 w-24 bg-ink/10 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

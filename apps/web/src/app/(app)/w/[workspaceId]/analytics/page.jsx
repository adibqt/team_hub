"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Download, BarChart3, Target, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "@/lib/api";
import { readList } from "@/lib/http";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import OnlineMembers from "@/components/OnlineMembers";

export default function AnalyticsPage() {
  const { workspaceId } = useParams();
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const loadOne = useWorkspaceStore((s) => s.loadOne);

  const [summary, setSummary] = useState(null);
  const [completion, setCompletion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!workspaceId) return;
    loadOne(workspaceId).catch(() => {});
  }, [workspaceId, loadOne]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      api.get(`/api/workspaces/${workspaceId}/analytics/summary`),
      api.get(`/api/workspaces/${workspaceId}/analytics/completion`),
    ])
      .then(([s, c]) => {
        if (cancelled) return;
        setSummary(s.data);
        setCompletion(readList(c.data));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.error || "Couldn't load analytics.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const accent = ws?.accentColor || "#D34F1F";

  const chartData = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    return (completion || []).map((row, i, arr) => {
      const isLast = i === arr.length - 1;
      const date = row.weekStart ? new Date(row.weekStart) : null;
      const label = isLast
        ? "This week"
        : date
        ? fmt.format(date)
        : row.week.replace(/^\d+-/, "");
      return { ...row, label };
    });
  }, [completion]);

  const csvHref = `${process.env.NEXT_PUBLIC_API_URL}/api/workspaces/${workspaceId}/export.csv`;

  return (
    <div className="relative max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* HEADER */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8" style={{ background: accent }} />
          <span>Workspace · {ws?.name || "—"}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline">Analytics</span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-ink">
              <span className="italic font-normal">Analytics</span>
              <span className="text-ember">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/65">
              A bird&rsquo;s-eye view of the workspace — momentum, output, and what&rsquo;s slipping.
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className="flex items-center gap-4 flex-wrap lg:justify-end">
              <OnlineMembers workspaceId={workspaceId} />
            </div>
            <a
              href={csvHref}
              className="inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <Download size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2">
                Export CSV
              </span>
            </a>
          </div>
        </div>
      </header>

      {/* STATS */}
      <section
        aria-label="Key metrics"
        className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-px bg-ink/15 border-y border-ink/15 animate-fade-up"
        style={{ animationDelay: "0.05s" }}
      >
        <Stat
          n="01"
          icon={Target}
          label="Total goals"
          value={loading ? "—" : summary?.totalGoals ?? 0}
        />
        <Stat
          n="02"
          icon={CheckCircle2}
          label="Items completed · this week"
          value={loading ? "—" : summary?.itemsCompletedThisWeek ?? 0}
        />
        <Stat
          n="03"
          icon={AlertTriangle}
          label="Overdue"
          value={loading ? "—" : summary?.overdueCount ?? 0}
          emphasize={!loading && (summary?.overdueCount ?? 0) > 0}
        />
      </section>

      {/* CHART */}
      <section className="mt-14 lg:mt-20 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-end justify-between gap-6 pb-4 border-b border-ink/15">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-1">
              <span className="text-ember">§</span>&nbsp;Trend · 02
            </p>
            <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-ink">
              <span className="italic font-normal">Goal completion</span>{" "}
              <span className="font-light">— last 8 weeks</span>
            </h2>
          </div>
          
        </div>

        <div className="mt-6 bg-paper-50 border border-ink/10 px-2 sm:px-4 py-6">
          {error ? (
            <p className="py-16 text-center font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
              {error}
            </p>
          ) : loading ? (
            <div className="h-[280px] flex items-center justify-center font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
              loading…
            </div>
          ) : chartData.every((d) => d.completed === 0) ? (
            <div className="h-[280px] flex items-center justify-center font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
              No completed goals yet — back soon.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="rgb(var(--color-ink) / 0.1)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono, monospace)",
                    fill: "rgb(var(--color-ink) / 0.55)",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "rgb(var(--color-ink) / 0.2)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono, monospace)",
                    fill: "rgb(var(--color-ink) / 0.55)",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "rgb(var(--color-ink) / 0.2)" }}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: "rgb(var(--color-ink) / 0.06)" }}
                  contentStyle={{
                    background: "var(--paper-2)",
                    border: "1px solid rgb(var(--color-ink) / 0.2)",
                    borderRadius: 0,
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--ink)",
                  }}
                  labelFormatter={(l) => (l === "This week" ? l : `Week of ${l}`)}
                  formatter={(value) => [value, "Completed"]}
                />
                <Bar dataKey="completed" fill={accent} radius={0} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <footer className="mt-20 pt-6 border-t border-ink/15">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
          <span>{ws?.name ? `${ws.name} ·` : ""} Analytics · 01</span>
          <span className="hidden sm:inline">Snapshot · {new Date().toLocaleDateString()}</span>
        </p>
      </footer>
    </div>
  );
}

function Stat({ n, icon: Icon, label, value, emphasize = false }) {
  return (
    <div className="bg-paper px-5 lg:px-7 py-6">
      <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 flex items-center gap-2">
        <span className="text-ember tabular-nums">{n}</span>
        {Icon && <Icon size={12} strokeWidth={1.75} className="text-ink/55" />}
        <span>{label}</span>
      </p>
      <p
        className={`mt-3 font-display text-4xl lg:text-5xl leading-none tabular-nums ${
          emphasize ? "text-ember" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

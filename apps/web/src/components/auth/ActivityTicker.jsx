"use client";
import { useEffect, useState } from "react";

const ITEMS = [
  { who: "ada.l",     what: "shipped",   ref: "OKR-241",  delta: "+12%" },
  { who: "linus.t",   what: "merged",    ref: "PR-1287",  delta: "main" },
  { who: "grace.h",   what: "closed",    ref: "ITEM-093", delta: "done" },
  { who: "katherine", what: "announced", ref: "Q3 Plan",  delta: "all-hands" },
  { who: "marie.c",   what: "reviewed",  ref: "DOC-58",   delta: "approved" },
];

const INTERVAL_MS = 3200;

/**
 * Live activity ticker for the auth showcase panel.
 * Cycles a single visible row on an interval — no CSS keyframe math required.
 * Each tick changes the React `key`, which remounts the row and replays the
 * existing `animate-fade-up` enter animation.
 */
export default function ActivityTicker() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const id = window.setInterval(() => {
      setI((v) => (v + 1) % ITEMS.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const t = ITEMS[i];

  return (
    <div className="mt-auto pt-12 hidden lg:block">
      <div className="hairline text-ink/20" aria-hidden="true" />
      <div className="mt-4 flex items-center gap-4 font-mono text-[11px] tracking-wider text-ink/65 overflow-hidden">
        <span className="text-ink/35 uppercase tracking-widest2 shrink-0">
          ↳ Now
        </span>
        <div
          className="flex-1 relative h-5 overflow-hidden"
          aria-live="polite"
          aria-atomic="true"
        >
          <p
            key={t.ref}
            className="absolute inset-0 flex items-center gap-2 whitespace-nowrap animate-fade-up"
          >
            <span className="text-ink">@{t.who}</span>
            <span className="text-ink/45">{t.what}</span>
            <span className="text-ember-600">{t.ref}</span>
            <span className="text-ink/35">·</span>
            <span className="text-ink/55 italic">{t.delta}</span>
          </p>
        </div>
        <span className="text-ink/30 shrink-0 tabular-nums">UTC</span>
      </div>
    </div>
  );
}

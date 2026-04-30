"use client";
import { Check } from "lucide-react";
import clsx from "clsx";

// Eight accents tuned for the cream paper background. Each one carries a
// short uppercase moniker so the picker reads like a Pantone strip.
export const ACCENTS = [
  { name: "Ember",   hex: "#D34F1F" },
  { name: "Ochre",   hex: "#C28A2C" },
  { name: "Sage",    hex: "#5A6B52" },
  { name: "Slate",   hex: "#3C5A6E" },
  { name: "Plum",    hex: "#7C3F58" },
  { name: "Indigo",  hex: "#3B3A6B" },
  { name: "Moss",    hex: "#3F5440" },
  { name: "Rust",    hex: "#8C2F0E" },
];

export default function AccentSwatchPicker({ value, onChange, label = "Accent", n }) {
  return (
    <div>
      <p className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-3">
        {n && <span className="text-ember tabular-nums">{n}</span>}
        <span>{label}</span>
        <span className="text-ink/25">·</span>
        <span className="tabular-nums">{value?.toUpperCase()}</span>
      </p>
      <div role="radiogroup" aria-label="Accent colour" className="grid grid-cols-4 sm:grid-cols-8 gap-px bg-ink/15 border border-ink/15">
        {ACCENTS.map(({ name, hex }) => {
          const active = value?.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(hex)}
              className={clsx(
                "group relative bg-paper p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-1 focus-visible:ring-offset-paper",
                active ? "bg-paper-50" : "hover:bg-paper-50"
              )}
            >
              <span className="block w-full h-9 ring-1 ring-ink/15 relative" style={{ background: hex }}>
                {active && (
                  <span className="absolute inset-0 grid place-items-center text-paper">
                    <Check size={16} strokeWidth={2.5} />
                  </span>
                )}
              </span>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest2 text-ink/65 truncate">
                {name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

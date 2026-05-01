"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { useThemeStore } from "@/stores/themeStore";

const OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light",  label: "Light",  Icon: Sun },
  { value: "dark",   label: "Dark",   Icon: Moon },
];

// Compact single-button variant — cycles system → light → dark on click.
// The shown icon reflects the *current preference* (Monitor for system),
// so users can read their setting at a glance from the masthead.
export function ThemeToggleIcon({ className }) {
  const preference = useThemeStore((s) => s.preference);
  const hydrated   = useThemeStore((s) => s.hydrated);
  const cycle      = useThemeStore((s) => s.cyclePreference);

  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[0];
  const Icon = current.Icon;

  const order = ["system", "light", "dark"];
  const nextLabel = OPTIONS[(order.indexOf(preference) + 1) % order.length].label;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${current.label}. Switch to ${nextLabel}.`}
      title={`Theme · ${current.label}`}
      className={clsx(
        "inline-flex items-center justify-center h-7 w-7",
        "border border-ink/15 hover:border-ink/45 bg-paper-50/60 hover:bg-paper-100",
        "text-ink/60 hover:text-ink transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-1 focus-visible:ring-offset-paper",
        !hydrated && "opacity-0",
        className,
      )}
    >
      <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

// Three-segment selector that mirrors the editorial chrome — boxed,
// monospaced caption, ember accent on the active cell. Reads/writes the
// theme store; the store handles persistence and the <html> class.
export default function ThemeToggle({ className }) {
  const preference = useThemeStore((s) => s.preference);
  const hydrated   = useThemeStore((s) => s.hydrated);
  const setPref    = useThemeStore((s) => s.setPreference);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={clsx(
        "inline-grid grid-cols-3 gap-px p-px",
        "border border-ink/15 bg-ink/5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = hydrated && preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${label} theme`}
            onClick={() => setPref(value)}
            className={clsx(
              "flex items-center justify-center gap-1.5 px-2 py-1.5",
              "font-mono text-[10px] uppercase tracking-widest2 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-1 focus-visible:ring-offset-paper-200",
              active
                ? "bg-ink text-paper"
                : "bg-paper-50 text-ink/60 hover:text-ink hover:bg-paper-100",
            )}
          >
            <Icon size={12} strokeWidth={1.75} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

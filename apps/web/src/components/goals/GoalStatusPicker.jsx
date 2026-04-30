"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  ShieldCheck,
  Loader2,
  Circle,
  CircleDot,
  Archive,
} from "lucide-react";

export const STATUS_OPTIONS = [
  {
    value: "NOT_STARTED",
    label: "Not started",
    hint: "Idea on the page",
    Icon: Circle,
  },
  {
    value: "IN_PROGRESS",
    label: "In progress",
    hint: "Work in flight",
    Icon: CircleDot,
  },
  {
    value: "COMPLETED",
    label: "Completed",
    hint: "Landed and shipped",
    Icon: ShieldCheck,
  },
  {
    value: "ARCHIVED",
    label: "Archived",
    hint: "No longer active",
    Icon: Archive,
  },
];

export const STATUS_LABEL = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
);

export const STATUS_TONE = {
  NOT_STARTED: "text-ink/65 border-ink/20 bg-paper",
  IN_PROGRESS: "text-ember border-ember/40 bg-ember-50",
  COMPLETED: "text-sage-700 border-sage-500/40 bg-sage-50",
  ARCHIVED: "text-ink/45 border-ink/15 bg-paper-50",
};

const SIZE_CLASSES = {
  sm: "px-2.5 py-1.5",
  md: "px-3 py-2",
};

/**
 * Click-to-open status pill. Renders the same editorial chip as the static
 * pills used elsewhere, but expands into a small listbox of statuses with
 * descriptions. `onChange(next)` may be sync or async; the picker shows a
 * spinner while the promise is in flight.
 */
export default function GoalStatusPicker({
  value,
  onChange,
  disabled = false,
  disabledReason,
  size = "md",
}) {
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const listboxId = useId();

  const current =
    STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0];
  const tone = STATUS_TONE[value] || STATUS_TONE.NOT_STARTED;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function pick(next) {
    setOpen(false);
    if (next === value) return;
    setSaving(true);
    try {
      await onChange(next);
    } finally {
      setSaving(false);
    }
  }

  const Trailing = saving ? Loader2 : ChevronDown;

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && !saving) setOpen((o) => !o);
        }}
        disabled={disabled || saving}
        title={disabled && disabledReason ? disabledReason : undefined}
        aria-label={
          disabled && disabledReason
            ? `${current.label} (${disabledReason})`
            : undefined
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 border transition-colors ${
          SIZE_CLASSES[size]
        } ${tone} ${
          disabled && !saving ? "cursor-not-allowed" : ""
        } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ember`}
      >
        {value === "COMPLETED" && (
          <ShieldCheck size={11} strokeWidth={1.75} aria-hidden="true" />
        )}
        <span>{current.label}</span>
        {!disabled && (
          <Trailing
            size={11}
            strokeWidth={1.75}
            aria-hidden="true"
            className={`opacity-70 ${saving ? "animate-spin" : ""}`}
          />
        )}
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Change goal status"
          className="absolute right-0 mt-2 w-[280px] z-30 bg-paper border border-ink/15 shadow-2xl animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            aria-hidden="true"
            className="absolute -top-px left-0 h-px w-12 bg-ember"
          />
          <p className="px-4 pt-3 pb-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
            <span className="text-ember">§</span>&nbsp;Change status
          </p>
          <ul className="pb-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const selected = opt.value === value;
              const { Icon } = opt;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(opt.value)}
                    className={`w-full grid grid-cols-[16px_auto_1fr] items-baseline gap-x-3 px-4 py-2.5 text-left transition-colors hover:bg-paper-50 focus:outline-none focus:bg-paper-50 ${
                      selected ? "bg-paper-50" : ""
                    }`}
                  >
                    <span className="self-center">
                      {selected ? (
                        <Check
                          size={12}
                          strokeWidth={2}
                          className="text-ember"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                    <Icon
                      size={12}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className={`self-center ${
                        opt.value === "IN_PROGRESS"
                          ? "text-ember"
                          : opt.value === "COMPLETED"
                          ? "text-sage-700"
                          : "text-ink/55"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="font-mono text-[11px] uppercase tracking-widest2 text-ink block">
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-ink/55 block mt-0.5">
                        {opt.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

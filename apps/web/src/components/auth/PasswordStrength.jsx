"use client";
import { Check, X } from "lucide-react";
import clsx from "clsx";

const RULES = [
  { id: "len",   label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "case",  label: "Mix of upper & lower case", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "num",   label: "Contains a number",        test: (p) => /\d/.test(p) },
];

export function getStrength(password) {
  if (!password) return 0;
  return RULES.reduce((n, r) => n + (r.test(password) ? 1 : 0), 0);
}

const LEVEL = [
  { label: "",        bar: "",                   text: "" },
  { label: "Weak",    bar: "bg-rose-400 w-1/3",  text: "text-rose-600" },
  { label: "Decent",  bar: "bg-amber-400 w-2/3", text: "text-amber-600" },
  { label: "Strong",  bar: "bg-emerald-500 w-full", text: "text-emerald-600" },
];

export default function PasswordStrength({ password }) {
  const score = getStrength(password);
  const level = LEVEL[score];
  const showRules = password.length > 0;

  return (
    <div aria-live="polite" className="mt-2 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all duration-300", level.bar)}
            style={{ minWidth: score > 0 ? "8px" : "0" }}
          />
        </div>
        {showRules && (
          <span className={clsx("text-xs font-semibold tabular-nums", level.text)}>
            {level.label}
          </span>
        )}
      </div>
      {showRules && (
        <ul className="space-y-1">
          {RULES.map((rule) => {
            const pass = rule.test(password);
            return (
              <li key={rule.id} className="flex items-center gap-2 text-xs">
                <span
                  className={clsx(
                    "flex h-4 w-4 items-center justify-center rounded-full transition-colors",
                    pass ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  )}
                  aria-hidden="true"
                >
                  {pass ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                </span>
                <span className={pass ? "text-slate-600" : "text-slate-400"}>{rule.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

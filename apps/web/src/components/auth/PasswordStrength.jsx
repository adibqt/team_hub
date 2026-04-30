"use client";
import clsx from "clsx";

const RULES = [
  { id: "len",  label: "8+ characters",     test: (p) => p.length >= 8 },
  { id: "case", label: "Aa mixed case",     test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "num",  label: "0-9 number",        test: (p) => /\d/.test(p) },
];

export function getStrength(password) {
  if (!password) return 0;
  return RULES.reduce((n, r) => n + (r.test(password) ? 1 : 0), 0);
}

const LEVEL = [
  { label: "—",      bar: "w-0",     text: "text-ink/35",     dash: "bg-ink/15" },
  { label: "WEAK",   bar: "w-1/3",   text: "text-ember-700",  dash: "bg-ember-500" },
  { label: "DECENT", bar: "w-2/3",   text: "text-ember-500",  dash: "bg-ember-400" },
  { label: "STRONG", bar: "w-full",  text: "text-sage-600",   dash: "bg-sage" },
];

export default function PasswordStrength({ password }) {
  const score = getStrength(password);
  const level = LEVEL[score];
  const showRules = password.length > 0;

  return (
    <div aria-live="polite" className="mt-3 space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-ink/10 relative overflow-hidden">
          <div
            className={clsx(
              "absolute inset-y-0 left-0 transition-all duration-500 ease-out",
              level.bar,
              level.dash
            )}
            style={{ height: "1px" }}
          />
        </div>
        <span
          className={clsx(
            "font-mono text-[10px] tracking-widest2 tabular-nums",
            showRules ? level.text : "text-ink/30"
          )}
        >
          {showRules ? `STRENGTH · ${level.label}` : "STRENGTH · —"}
        </span>
      </div>

      {showRules && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-widest2">
          {RULES.map((rule) => {
            const pass = rule.test(password);
            return (
              <li
                key={rule.id}
                className={clsx(
                  "flex items-center gap-1.5 transition-colors",
                  pass ? "text-sage-600" : "text-ink/35"
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    "inline-block h-px w-3 transition-colors",
                    pass ? "bg-sage" : "bg-ink/20"
                  )}
                />
                <span>{rule.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

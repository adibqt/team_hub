"use client";
import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

const FormField = forwardRef(function FormField(
  { label, icon: Icon, type = "text", error, hint, className, ...props },
  ref
) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (reveal ? "text" : "password") : type;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-err` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <Icon
            aria-hidden="true"
            className={clsx(
              "absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 transition-colors",
              error ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500"
            )}
            size={18}
          />
        )}
        <input
          ref={ref}
          id={id}
          type={inputType}
          aria-invalid={!!error}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={clsx(
            "w-full rounded-xl border bg-white/80 py-2.5 text-sm text-slate-900 placeholder:text-slate-400",
            "transition-all duration-150 outline-none",
            "focus:ring-4",
            Icon ? "pl-10" : "pl-3.5",
            isPassword ? "pr-11" : "pr-3.5",
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
              : "border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-brand-100"
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-rose-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
});

export default FormField;

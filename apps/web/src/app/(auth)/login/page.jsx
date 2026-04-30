"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, AlertOctagon } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import FormField from "@/components/auth/FormField";

// Only allow same-origin paths (prevents open redirects).
function safeNext(raw) {
  if (!raw || typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", form);
      setUser(data);
      router.replace(next || "/dashboard");
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 401
          ? "Incorrect email or password."
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-up">
      {/* step chip */}
      <div className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 flex items-center gap-3">
        <span aria-hidden="true" className="inline-block h-px w-6 bg-ember" />
        <span>Step 01 / Sign In</span>
      </div>

      <header className="mt-5">
        <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] tracking-[-0.02em] text-ink">
          <span className="font-light">Welcome</span>{" "}
          <span className="italic font-normal">back<span className="text-ember">.</span></span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/65 max-w-sm">
          New to the workbench?{" "}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="group/link inline-flex items-baseline gap-1 text-ink font-medium border-b border-ink/30 hover:border-ember pb-px transition-colors"
          >
            Open an account
            <ArrowRight
              size={12}
              strokeWidth={2}
              className="translate-y-px transition-transform group-hover/link:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </p>
      </header>

      <div className="mt-9 mb-7 hairline text-ink/20" aria-hidden="true" />

      <form onSubmit={handleSubmit} className="space-y-7" noValidate>
        {error && (
          <div
            role="alert"
            className="relative flex items-start gap-3 border-l-2 border-ember-700 bg-ember-50/60 py-3 pl-3.5 pr-4"
          >
            <AlertOctagon
              size={15}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-ember-700"
              aria-hidden="true"
            />
            <div className="text-sm leading-relaxed text-ember-800">
              <span className="block font-mono text-[10px] uppercase tracking-widest2 text-ember-700/80 mb-0.5">
                Halt
              </span>
              {error}
            </div>
          </div>
        )}

        <FormField
          index="01"
          label="Email"
          icon={Mail}
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <FormField
          index="02"
          label="Password"
          icon={Lock}
          type="password"
          placeholder="••••••••••"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          className="group/btn relative w-full inline-flex items-center justify-between gap-3 bg-ink text-paper px-5 py-4 text-sm font-medium tracking-wide
                     transition-all duration-200
                     hover:bg-ember
                     active:translate-y-px
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:active:translate-y-0
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper/70 group-hover/btn:text-paper/90">
            {loading ? "Authenticating" : "Continue"}
          </span>
          <span className="flex items-center gap-2">
            {loading ? (
              <>
                <span
                  className="h-3.5 w-3.5 rounded-full border border-paper/40 border-t-paper animate-spin"
                  aria-hidden="true"
                />
                <span>Signing in</span>
                <span aria-hidden="true" className="animate-blink">_</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight
                  size={16}
                  strokeWidth={1.75}
                  className="transition-transform group-hover/btn:translate-x-1"
                  aria-hidden="true"
                />
              </>
            )}
          </span>
        </button>

        <p className="text-center font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
          Encrypted in transit <span className="text-ember">·</span> never resold
        </p>
      </form>
    </div>
  );
}

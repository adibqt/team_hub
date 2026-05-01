"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, ArrowRight, AlertOctagon } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import FormField from "@/components/auth/FormField";
import PasswordStrength, {
  firstFailedRule,
  isPasswordValid,
} from "@/components/auth/PasswordStrength";

function safeNext(raw) {
  if (!raw || typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function useNowHHMM() {
  const [stamp, setStamp] = useState(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setStamp(`${hh}:${mm}`);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return stamp;
}

function getEditionLabel() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Morning edition";
  if (hour >= 12 && hour < 18) return "Day shift";
  if (hour >= 18 && hour < 22) return "Evening desk";
  return "After hours";
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const now = useNowHHMM();
  const [edition, setEdition] = useState("Morning edition");

  const trimmedName = form.name.trim();
  const trimmedEmail = form.email.trim();
  const passwordOk = isPasswordValid(form.password);
  const formInvalid =
    !trimmedName || !trimmedEmail || !passwordOk;

  useEffect(() => {
    const tickEdition = () => setEdition(getEditionLabel());
    tickEdition();
    const id = window.setInterval(tickEdition, 30_000);
    return () => window.clearInterval(id);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }
    if (!trimmedEmail) {
      setError("Please enter your work email.");
      return;
    }
    const failed = firstFailedRule(form.password);
    if (failed) {
      const reason =
        failed.id === "len"
          ? "Password must be at least 8 characters."
          : failed.id === "case"
          ? "Password must include both upper and lower case letters."
          : "Password must include at least one number.";
      setError(reason);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/register", {
        ...form,
        name: trimmedName,
        email: trimmedEmail,
      });
      setUser(data);
      router.replace(next || "/dashboard");
    } catch (err) {
      const apiMsg = err?.response?.data?.error;
      setError(
        apiMsg?.includes("Unique") || err?.response?.status === 409
          ? "An account with that email already exists."
          : apiMsg || "Couldn't create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div
        className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 flex items-center gap-3 animate-stagger-up"
        style={{ animationDelay: "0.05s" }}
      >
        <span aria-hidden="true" className="inline-block h-px w-6 bg-ember" />
        <span>Step 01 / Open an Account</span>
        <span aria-hidden="true" className="hidden sm:inline-block h-3 w-px bg-ink/15" />
        <span className="hidden sm:inline-flex items-center gap-2">
          <span aria-hidden="true" className="signal-dot" />
          <span className="text-ink/45">
            <span className="text-ink/70">{edition}</span>
          </span>
          {now && (
            <>
              <span className="text-ink/25">·</span>
              <span className="tabular-nums text-ink/55">{now}</span>
            </>
          )}
        </span>
      </div>

      <header
        className="mt-5 animate-stagger-up"
        style={{ animationDelay: "0.15s" }}
      >
        <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] tracking-[-0.02em] text-ink">
          <span className="font-light">Open the</span>{" "}
          <span className="italic font-normal">workbench<span className="text-ember ember-glow">.</span></span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/65 max-w-sm">
          Already with us?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="group/link inline-flex items-baseline gap-1 text-ink font-medium border-b border-ink/30 hover:border-ember pb-px transition-colors"
          >
            Sign in instead
            <ArrowRight
              size={12}
              strokeWidth={2}
              className="translate-y-px transition-transform group-hover/link:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </p>
      </header>

      <div
        className="mt-9 mb-7 hairline shimmer-rule text-ink/20 animate-stagger-up"
        style={{ animationDelay: "0.25s" }}
        aria-hidden="true"
      />

      <form onSubmit={handleSubmit} className="space-y-7" noValidate>
        {error && (
          <div
            role="alert"
            className="relative flex items-start gap-3 border-l-2 border-ember-700 bg-ember-50/60 dark:bg-ember-50/40 py-3 pl-3.5 pr-4 animate-fade-up"
          >
            <AlertOctagon
              size={15}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-ember-700 dark:text-ember"
              aria-hidden="true"
            />
            <div className="text-sm leading-relaxed text-ember-800 dark:text-ember-700">
              <span className="block font-mono text-[10px] uppercase tracking-widest2 text-ember-700/80 dark:text-ember/80 mb-0.5">
                Halt
              </span>
              {error}
            </div>
          </div>
        )}

        <div className="animate-stagger-up" style={{ animationDelay: "0.35s" }}>
          <FormField
            index="01"
            label="Full name"
            icon={User}
            placeholder="Ada Lovelace"
            autoComplete="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="animate-stagger-up" style={{ animationDelay: "0.45s" }}>
          <FormField
            index="02"
            label="Work email"
            icon={Mail}
            type="email"
            placeholder="ada@company.com"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="animate-stagger-up" style={{ animationDelay: "0.55s" }}>
          <FormField
            index="03"
            label="Password"
            icon={Lock}
            type="password"
            placeholder="••••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="8+ chars, mixed case & a number"
          />
          <PasswordStrength password={form.password} />
        </div>

        <div className="animate-stagger-up" style={{ animationDelay: "0.65s" }}>
          <button
            type="submit"
            disabled={loading || formInvalid}
            className="heat-btn group/btn relative w-full inline-flex items-center justify-between gap-3 bg-ink text-paper px-5 py-4 text-sm font-medium tracking-wide
                     transition-all duration-200
                     hover:bg-ember
                     active:translate-y-px
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:active:translate-y-0
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper/70 group-hover/btn:text-paper/90">
              {loading ? "Provisioning" : "Continue"}
            </span>
            <span className="flex items-center gap-2">
              {loading ? (
                <>
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-paper/40 border-t-paper animate-spin"
                    aria-hidden="true"
                  />
                  <span>Creating</span>
                  <span aria-hidden="true" className="animate-blink">_</span>
                </>
              ) : (
                <>
                  <span>Open account</span>
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
        </div>

        <p
          className="text-center font-mono text-[10px] uppercase tracking-widest2 text-ink/40 animate-stagger-up"
          style={{ animationDelay: "0.78s" }}
        >
          By continuing, you agree to our terms <span className="text-ember ember-glow">·</span> privacy policy
        </p>
      </form>
    </div>
  );
}

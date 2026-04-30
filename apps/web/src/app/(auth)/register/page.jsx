"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import FormField from "@/components/auth/FormField";
import PasswordStrength, { getStrength } from "@/components/auth/PasswordStrength";

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tooWeak = form.password.length > 0 && getStrength(form.password) < 1;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/register", form);
      setUser(data);
      router.replace("/dashboard");
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
    <>
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create your account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Already with us?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
            Sign in
          </Link>
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <FormField
          label="Full name"
          icon={User}
          placeholder="Ada Lovelace"
          autoComplete="name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <FormField
          label="Work email"
          icon={Mail}
          type="email"
          placeholder="ada@company.com"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <div>
          <FormField
            label="Password"
            icon={Lock}
            type="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="Use 8+ characters, mixed case, and a number for the best score."
          />
          <PasswordStrength password={form.password} />
        </div>

        <button
          type="submit"
          disabled={loading || tooWeak}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all duration-200 hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-brand-200"
        >
          <span className="flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </span>
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-slate-400">
        By continuing, you agree to our terms of service and privacy policy.
      </p>
    </>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", form);
      setUser(data);
      router.replace("/dashboard");
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Sign in to Team Hub</h1>
        <input className="w-full border rounded px-3 py-2" type="email" placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button className="w-full bg-blue-600 text-white rounded px-3 py-2 font-semibold disabled:opacity-50"
          type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm text-center text-gray-500">
          No account? <a href="/register" className="text-blue-600 underline">Register</a>
        </p>
      </form>
    </div>
  );
}

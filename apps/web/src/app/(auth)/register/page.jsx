"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/register", form);
      setUser(data);
      router.replace("/dashboard");
    } catch {
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <input className="w-full border rounded px-3 py-2" placeholder="Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="w-full border rounded px-3 py-2" type="email" placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button className="w-full bg-blue-600 text-white rounded px-3 py-2 font-semibold disabled:opacity-50"
          type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Register"}
        </button>
        <p className="text-sm text-center text-gray-500">
          Have an account? <a href="/login" className="text-blue-600 underline">Sign in</a>
        </p>
      </form>
    </div>
  );
}

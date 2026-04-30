import { create } from "zustand";
import api from "@/lib/api";

export const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),

  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // network failure is fine — server will eventually evict the token; we still clear locally
    } finally {
      if (typeof window !== "undefined") {
        try { localStorage.removeItem("activeWsId"); } catch {}
      }
      set({ user: null });
    }
  },
}));

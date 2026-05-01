import { create } from "zustand";
import api from "@/lib/api";

export const useNotificationsStore = create((set, get) => ({
  items: [],
  unreadCount: 0,
  loaded: false,

  load: async () => {
    const { data } = await api.get("/api/notifications");
    set({ items: data.items, unreadCount: data.unreadCount, loaded: true });
    return data;
  },

  pushNotification: (note) => {
    if (!note?.id) return;
    set((state) => {
      if (state.items.some((n) => n.id === note.id)) return {};
      return {
        items: [note, ...state.items].slice(0, 50),
        unreadCount: state.unreadCount + (note.readAt ? 0 : 1),
      };
    });
  },

  markRead: async (id) => {
    const before = get().items.find((n) => n.id === id);
    if (!before || before.readAt) return;
    set((state) => ({
      items: state.items.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    try {
      await api.patch(`/api/notifications/${id}/read`);
    } catch {
      // Swallow — the user has already moved on; reload will reconcile.
    }
  },

  markAllRead: async () => {
    if (get().unreadCount === 0) return;
    const stamp = new Date().toISOString();
    set((state) => ({
      items: state.items.map((n) => (n.readAt ? n : { ...n, readAt: stamp })),
      unreadCount: 0,
    }));
    try {
      await api.post("/api/notifications/read-all");
    } catch {
      // Same — best-effort; the next load will re-sync if it failed.
    }
  },
}));

import { create } from "zustand";
import api from "@/lib/api";
import toast from "react-hot-toast";

export const useItemsStore = create((set, get) => ({
  items: [],

  load: async (wsId) => {
    const { data } = await api.get(`/api/workspaces/${wsId}/items`);
    set({ items: data });
    return data;
  },

  createItem: async (wsId, draft) => {
    const tempId = `tmp_${crypto.randomUUID()}`;
    const optimistic = {
      id: tempId,
      workspaceId: wsId,
      _pending: true,
      createdAt: new Date().toISOString(),
      priority: "MEDIUM",
      status: "TODO",
      ...draft,
    };
    set({ items: [optimistic, ...get().items] });
    try {
      const { data } = await api.post(`/api/workspaces/${wsId}/items`, draft);
      set((state) => {
        const cleaned = state.items.filter((i) => i.id !== tempId && i.id !== data.id);
        return { items: [data, ...cleaned] };
      });
      return data;
    } catch (err) {
      set({ items: get().items.filter((i) => i.id !== tempId) });
      throw err;
    }
  },

  updateItem: async (id, patch) => {
    const prev = get().items;
    const before = prev.find((i) => i.id === id);
    set({ items: prev.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
    try {
      const { data } = await api.patch(`/api/items/${id}`, patch);
      set({ items: get().items.map((i) => (i.id === id ? data : i)) });
      return data;
    } catch (err) {
      if (before) set({ items: get().items.map((i) => (i.id === id ? before : i)) });
      throw err;
    }
  },

  moveItem: async (id, newStatus) => {
    const prev = get().items;
    set({ items: prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)) });
    try {
      await api.patch(`/api/items/${id}`, { status: newStatus });
    } catch {
      set({ items: prev });
      toast.error("Couldn't move item — reverted.");
    }
  },

  deleteItem: async (id) => {
    const prev = get().items;
    set({ items: prev.filter((i) => i.id !== id) });
    try {
      await api.delete(`/api/items/${id}`);
    } catch (err) {
      set({ items: prev });
      throw err;
    }
  },

  /* ─────  socket handlers — idempotent  ───── */
  pushItem: (item) => {
    if (!item?.id) return;
    if (get().items.some((i) => i.id === item.id)) return;
    set({ items: [item, ...get().items] });
  },
  applyItemUpdate: (item) => {
    if (!item?.id) return;
    set({ items: get().items.map((i) => (i.id === item.id ? { ...i, ...item } : i)) });
  },
  removeItemFromSocket: ({ id }) => {
    if (!id) return;
    set({ items: get().items.filter((i) => i.id !== id) });
  },
}));

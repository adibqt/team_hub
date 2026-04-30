import { create } from "zustand";
import api from "@/lib/api";
import toast from "react-hot-toast";

export const useItemsStore = create((set, get) => ({
  items: [],

  load: async (wsId) => {
    const { data } = await api.get(`/api/workspaces/${wsId}/items`);
    set({ items: data });
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

  createItem: async (draft) => {
    const tempId = `tmp_${crypto.randomUUID()}`;
    const optimistic = { ...draft, id: tempId, _pending: true };
    set({ items: [optimistic, ...get().items] });
    try {
      const { data } = await api.post(`/api/workspaces/${draft.workspaceId}/items`, draft);
      set({ items: get().items.map((i) => (i.id === tempId ? data : i)) });
    } catch {
      set({ items: get().items.filter((i) => i.id !== tempId) });
      toast.error("Create failed — please retry.");
    }
  },
}));

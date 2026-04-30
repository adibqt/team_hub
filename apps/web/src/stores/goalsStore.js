import { create } from "zustand";
import api from "@/lib/api";

export const useGoalsStore = create((set, get) => ({
  goals: [],

  load: async (wsId) => {
    const { data } = await api.get(`/api/workspaces/${wsId}/goals`);
    set({ goals: data });
    return data;
  },

  // Used by socket listeners. Idempotent: if a goal with the same id is
  // already present (e.g. we just created it optimistically and the realtime
  // event arrived after the REST round-trip), this is a no-op.
  pushGoal: (goal) => {
    if (!goal?.id) return;
    if (get().goals.some((g) => g.id === goal.id)) return;
    set({ goals: [goal, ...get().goals] });
  },

  createGoal: async (wsId, draft) => {
    const tempId = `tmp_${crypto.randomUUID()}`;
    const optimistic = {
      ...draft,
      id: tempId,
      _pending: true,
      milestones: [],
      createdAt: new Date().toISOString(),
    };
    set({ goals: [optimistic, ...get().goals] });
    try {
      const { data } = await api.post(`/api/workspaces/${wsId}/goals`, draft);
      set({
        goals: get().goals.map((g) => (g.id === tempId ? data : g)),
      });
      return data;
    } catch (err) {
      set({ goals: get().goals.filter((g) => g.id !== tempId) });
      throw err;
    }
  },
}));

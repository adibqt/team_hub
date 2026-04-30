import { create } from "zustand";
import api from "@/lib/api";
import toast from "react-hot-toast";

export const useGoalsStore = create((set, get) => ({
  goals: [],

  load: async (wsId) => {
    const { data } = await api.get(`/api/workspaces/${wsId}/goals`);
    set({ goals: data });
  },

  pushGoal: (goal) => set({ goals: [goal, ...get().goals] }),

  createGoal: async (wsId, draft) => {
    const tempId = `tmp_${crypto.randomUUID()}`;
    const optimistic = { ...draft, id: tempId, _pending: true, milestones: [] };
    set({ goals: [optimistic, ...get().goals] });
    try {
      const { data } = await api.post(`/api/workspaces/${wsId}/goals`, draft);
      set({ goals: get().goals.map((g) => (g.id === tempId ? data : g)) });
    } catch {
      set({ goals: get().goals.filter((g) => g.id !== tempId) });
      toast.error("Create failed — please retry.");
    }
  },
}));

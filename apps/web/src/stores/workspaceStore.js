import { create } from "zustand";
import api from "@/lib/api";

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspaceId: typeof window !== "undefined" ? localStorage.getItem("activeWsId") : null,

  load: async () => {
    const { data } = await api.get("/api/workspaces");
    set({ workspaces: data });
  },

  setActive: (id) => {
    if (typeof window !== "undefined") localStorage.setItem("activeWsId", id);
    set({ activeWorkspaceId: id });
  },
}));

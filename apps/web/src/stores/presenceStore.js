import { create } from "zustand";

export const usePresenceStore = create((set) => ({
  online: [],
  setOnline: (online) => set({ online }),
}));

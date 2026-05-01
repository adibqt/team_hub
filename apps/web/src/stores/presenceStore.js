import { create } from "zustand";

/**
 * Workspace presence — keyed by workspaceId so a user with multiple
 * workspaces in tabs sees the right roster on each page.
 */
export const usePresenceStore = create((set) => ({
  byWorkspace: {}, // { [workspaceId]: string[] of userIds }

  setOnline: (workspaceId, userIds) => {
    if (!workspaceId) return;
    set((state) => ({
      byWorkspace: { ...state.byWorkspace, [workspaceId]: userIds || [] },
    }));
  },

  clear: (workspaceId) => {
    if (!workspaceId) return;
    set((state) => {
      const next = { ...state.byWorkspace };
      delete next[workspaceId];
      return { byWorkspace: next };
    });
  },
}));

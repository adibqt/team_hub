import { create } from "zustand";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspaceId:
    typeof window !== "undefined" ? localStorage.getItem("activeWsId") : null,

  // Per-workspace state, keyed by id so we don't trash one workspace's state
  // when someone switches to another.
  workspaceById: {},   // { [id]: { ...workspace, members, viewerRole } }
  invitesById: {},     // { [id]: Invite[] }

  load: async () => {
    const { data } = await api.get("/api/workspaces");
    set({ workspaces: data });
    return data;
  },

  setActive: (id) => {
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem("activeWsId", id);
      else localStorage.removeItem("activeWsId");
    }
    set({ activeWorkspaceId: id });
  },

  loadOne: async (id) => {
    const { data } = await api.get(`/api/workspaces/${id}`);
    set((state) => ({ workspaceById: { ...state.workspaceById, [id]: data } }));
    return data;
  },

  createWorkspace: async ({ name, description, accentColor }) => {
    const { data } = await api.post("/api/workspaces", { name, description, accentColor });
    const role = "ADMIN";
    set((state) => ({
      workspaces: [...state.workspaces, { ...data, role }],
    }));
    return data;
  },

  updateWorkspace: async (id, patch) => {
    const prev = get().workspaceById[id];
    // Optimistic local update
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      workspaceById: prev
        ? { ...state.workspaceById, [id]: { ...prev, ...patch } }
        : state.workspaceById,
    }));
    try {
      const { data } = await api.patch(`/api/workspaces/${id}`, patch);
      set((state) => ({
        workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, ...data } : w)),
        workspaceById: prev
          ? { ...state.workspaceById, [id]: { ...prev, ...data } }
          : state.workspaceById,
      }));
      return data;
    } catch (err) {
      // Rollback
      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          w.id === id && prev ? { ...w, name: prev.name, description: prev.description, accentColor: prev.accentColor } : w
        ),
        workspaceById: prev ? { ...state.workspaceById, [id]: prev } : state.workspaceById,
      }));
      throw err;
    }
  },

  loadInvites: async (id) => {
    const { data } = await api.get(`/api/workspaces/${id}/invites`);
    set((state) => ({ invitesById: { ...state.invitesById, [id]: data } }));
    return data;
  },

  inviteMember: async (id, { email, role }) => {
    const { data } = await api.post(`/api/workspaces/${id}/invites`, { email, role });
    set((state) => ({
      invitesById: {
        ...state.invitesById,
        [id]: [data, ...(state.invitesById[id] || [])],
      },
    }));
    return data;
  },

  revokeInvite: async (id, inviteId) => {
    await api.delete(`/api/workspaces/${id}/invites/${inviteId}`);
    set((state) => ({
      invitesById: {
        ...state.invitesById,
        [id]: (state.invitesById[id] || []).filter((i) => i.id !== inviteId),
      },
    }));
  },

  changeMemberRole: async (id, userId, role) => {
    const { data } = await api.patch(`/api/workspaces/${id}/members/${userId}`, { role });
    set((state) => {
      const ws = state.workspaceById[id];
      if (!ws) return {};
      return {
        workspaceById: {
          ...state.workspaceById,
          [id]: {
            ...ws,
            members: ws.members.map((m) =>
              m.userId === userId ? { ...m, ...data } : m
            ),
          },
        },
      };
    });
    return data;
  },

  removeMember: async (id, userId) => {
    await api.delete(`/api/workspaces/${id}/members/${userId}`);
    const me = useAuthStore.getState().user;
    const removingSelf = me?.id === userId;
    set((state) => {
      const ws = state.workspaceById[id];
      return {
        workspaceById: ws
          ? {
              ...state.workspaceById,
              [id]: { ...ws, members: ws.members.filter((m) => m.userId !== userId) },
            }
          : state.workspaceById,
        // Self-leave -> drop the workspace from the user's list entirely.
        workspaces: removingSelf
          ? state.workspaces.filter((w) => w.id !== id)
          : state.workspaces,
      };
    });
  },

  removeWorkspace: async (id) => {
    await api.delete(`/api/workspaces/${id}`);
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      workspaceById: Object.fromEntries(
        Object.entries(state.workspaceById).filter(([k]) => k !== id)
      ),
    }));
  },
}));

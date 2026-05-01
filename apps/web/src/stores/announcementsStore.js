import { create } from "zustand";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

/* ────────────────────────────────────────────────────────────────
   Pinned-first ordering matches the API; keep it consistent in the
   client so optimistic creates and pin/unpin transitions don't make
   the list jitter on socket echoes.
   ──────────────────────────────────────────────────────────────── */
function sortAnnouncements(list) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export const useAnnouncementsStore = create((set, get) => ({
  announcements: [],
  loadedFor: null, // workspaceId we last loaded — guards against stale renders

  load: async (wsId) => {
    set({ loadedFor: wsId });
    const { data } = await api.get(`/api/workspaces/${wsId}/announcements`);
    set({ announcements: sortAnnouncements(data) });
    return data;
  },

  reset: () => set({ announcements: [], loadedFor: null }),

  /* ────────────────────────  CREATE  ──────────────────────── */

  createAnnouncement: async (wsId, draft) => {
    const { data } = await api.post(
      `/api/workspaces/${wsId}/announcements`,
      draft
    );
    set((state) => {
      // Idempotent — a socket echo may have inserted this already.
      if (state.announcements.some((a) => a.id === data.id)) return {};
      return { announcements: sortAnnouncements([data, ...state.announcements]) };
    });
    return data;
  },

  /* ────────────────────────  UPDATE  ──────────────────────── */

  updateAnnouncement: async (id, patch) => {
    const snapshot = get().announcements.find((a) => a.id === id);

    set((state) => ({
      announcements: sortAnnouncements(
        state.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a))
      ),
    }));

    try {
      const { data } = await api.patch(`/api/announcements/${id}`, patch);
      set((state) => ({
        announcements: sortAnnouncements(
          state.announcements.map((a) => (a.id === id ? { ...a, ...data } : a))
        ),
      }));
      return data;
    } catch (err) {
      if (snapshot) {
        set((state) => ({
          announcements: sortAnnouncements(
            state.announcements.map((a) => (a.id === id ? snapshot : a))
          ),
        }));
      }
      throw err;
    }
  },

  /* ────────────────────────  PIN  ──────────────────────── */

  togglePin: async (id, pinned) => {
    const snapshot = get().announcements.find((a) => a.id === id);

    set((state) => ({
      announcements: sortAnnouncements(
        state.announcements.map((a) => (a.id === id ? { ...a, pinned } : a))
      ),
    }));

    try {
      const { data } = await api.patch(`/api/announcements/${id}/pin`, { pinned });
      set((state) => ({
        announcements: sortAnnouncements(
          state.announcements.map((a) => (a.id === id ? { ...a, ...data } : a))
        ),
      }));
      return data;
    } catch (err) {
      if (snapshot) {
        set((state) => ({
          announcements: sortAnnouncements(
            state.announcements.map((a) => (a.id === id ? snapshot : a))
          ),
        }));
      }
      throw err;
    }
  },

  /* ────────────────────────  DELETE  ──────────────────────── */

  deleteAnnouncement: async (id) => {
    const snapshot = get().announcements.find((a) => a.id === id);

    set((state) => ({
      announcements: state.announcements.filter((a) => a.id !== id),
    }));

    try {
      await api.delete(`/api/announcements/${id}`);
    } catch (err) {
      if (snapshot) {
        set((state) => ({
          announcements: sortAnnouncements([snapshot, ...state.announcements]),
        }));
      }
      throw err;
    }
  },

  toggleReaction: async (announcementId, emoji) => {
    const me = useAuthStore.getState().user;
    if (!me?.id) {
      // No identity to attribute the reaction to — fall back to non-optimistic.
      const { data } = await api.post(`/api/announcements/${announcementId}/reactions`, { emoji });
      set((state) => ({
        announcements: sortAnnouncements(
          state.announcements.map((a) => (a.id === announcementId ? { ...a, ...data } : a))
        ),
      }));
      return data;
    }

    const snapshot = get().announcements.find((a) => a.id === announcementId);

    set((state) => ({
      announcements: sortAnnouncements(
        state.announcements.map((a) => {
          if (a.id !== announcementId) return a;
          const reactions = Array.isArray(a.reactions) ? a.reactions : [];
          const idx = reactions.findIndex((r) => r.userId === me.id && r.emoji === emoji);
          if (idx >= 0) {
            return { ...a, reactions: reactions.filter((_, i) => i !== idx) };
          }
          return {
            ...a,
            reactions: [
              ...reactions,
              { id: `optimistic-${me.id}-${emoji}-${Date.now()}`, announcementId, userId: me.id, emoji },
            ],
          };
        })
      ),
    }));

    try {
      const { data } = await api.post(`/api/announcements/${announcementId}/reactions`, { emoji });
      set((state) => ({
        announcements: sortAnnouncements(
          state.announcements.map((a) => (a.id === announcementId ? { ...a, ...data } : a))
        ),
      }));
      return data;
    } catch (err) {
      if (snapshot) {
        set((state) => ({
          announcements: sortAnnouncements(
            state.announcements.map((a) => (a.id === announcementId ? snapshot : a))
          ),
        }));
      }
      throw err;
    }
  },

  addComment: async (announcementId, body, mentions = []) => {
    const me = useAuthStore.getState().user;
    const snapshot = get().announcements.find((a) => a.id === announcementId);
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (me?.id) {
      const optimisticComment = {
        id: tempId,
        announcementId,
        authorId: me.id,
        body,
        mentions,
        createdAt: new Date().toISOString(),
        author: {
          id: me.id,
          name: me.name || null,
          email: me.email || null,
          avatarUrl: me.avatarUrl || null,
        },
        _optimistic: true,
      };
      set((state) => ({
        announcements: sortAnnouncements(
          state.announcements.map((a) =>
            a.id === announcementId
              ? { ...a, comments: [...(a.comments || []), optimisticComment] }
              : a
          )
        ),
      }));
    }

    try {
      const { data } = await api.post(`/api/announcements/${announcementId}/comments`, {
        body,
        mentions,
      });
      set((state) => ({
        announcements: sortAnnouncements(
          state.announcements.map((a) => (a.id === announcementId ? { ...a, ...data } : a))
        ),
      }));
      return data;
    } catch (err) {
      if (snapshot) {
        set((state) => ({
          announcements: sortAnnouncements(
            state.announcements.map((a) => (a.id === announcementId ? snapshot : a))
          ),
        }));
      }
      throw err;
    }
  },

  /* ────────────────────────  SOCKET REDUCERS  ──────────────────────── */

  // Insert idempotently — guards against double-insert when our own POST
  // resolves before the broadcast (or vice versa).
  pushAnnouncement: (a) => {
    if (!a?.id) return;
    set((state) => {
      if (state.announcements.some((x) => x.id === a.id)) return {};
      return { announcements: sortAnnouncements([a, ...state.announcements]) };
    });
  },

  applyAnnouncementUpdate: (a) => {
    if (!a?.id) return;
    set((state) => ({
      announcements: sortAnnouncements(
        state.announcements.map((x) => (x.id === a.id ? { ...x, ...a } : x))
      ),
    }));
  },

  removeAnnouncement: (id) => {
    if (!id) return;
    set((state) => ({
      announcements: state.announcements.filter((x) => x.id !== id),
    }));
  },
}));

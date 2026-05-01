import { create } from "zustand";
import api from "@/lib/api";

/* ────────────────────────────────────────────────────────────────
   Helpers — keep the list and detail caches consistent. Every
   milestone mutation maps over `goals` AND `goalById` so whichever
   view the user is looking at sees the same data.
   ──────────────────────────────────────────────────────────────── */

function patchGoalMilestones(state, goalId, mutator) {
  const apply = (g) => {
    if (!g || g.id !== goalId) return g;
    return { ...g, milestones: mutator(g.milestones || []) };
  };
  return {
    goals: state.goals.map(apply),
    goalById: state.goalById[goalId]
      ? { ...state.goalById, [goalId]: apply(state.goalById[goalId]) }
      : state.goalById,
  };
}

export const useGoalsStore = create((set, get) => ({
  goals: [],
  goalById: {},          // detailed goal cache, keyed by id
  updatesByGoalId: {},   // activity feed, keyed by goalId

  /* ────────────────────────  GOAL LIST  ──────────────────────── */

  load: async (wsId) => {
    const { data } = await api.get(`/api/workspaces/${wsId}/goals`);
    set({ goals: data });
    return data;
  },

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
      // Idempotent merge: drop the optimistic placeholder AND any prior
      // copy of the real id that may have been inserted by an early
      // `goal:created` socket echo, then prepend the canonical one.
      set((state) => {
        const cleaned = state.goals.filter(
          (g) => g.id !== tempId && g.id !== data.id
        );
        return { goals: [data, ...cleaned] };
      });
      return data;
    } catch (err) {
      set({ goals: get().goals.filter((g) => g.id !== tempId) });
      throw err;
    }
  },

  /* ────────────────────────  GOAL DETAIL  ──────────────────────── */

  loadGoal: async (id) => {
    const { data } = await api.get(`/api/goals/${id}`);
    set((state) => ({ goalById: { ...state.goalById, [id]: data } }));
    return data;
  },

  // Patch a goal (title / description / owner / dueDate / status). Optimistic
  // local merge first so the UI flips instantly; rolls back on failure. We
  // intentionally preserve the local `milestones` array — milestones have
  // their own socket events and the PATCH response can be slightly stale.
  updateGoal: async (id, patch) => {
    const snapshot =
      get().goalById[id] || get().goals.find((g) => g.id === id) || null;

    const mergeLocal = (state, source) => {
      const merge = (g) => {
        if (!g || g.id !== id) return g;
        return { ...g, ...source, milestones: g.milestones ?? source.milestones };
      };
      return {
        goals: state.goals.map(merge),
        goalById: state.goalById[id]
          ? { ...state.goalById, [id]: merge(state.goalById[id]) }
          : state.goalById,
      };
    };

    set((state) => mergeLocal(state, patch));

    try {
      const { data } = await api.patch(`/api/goals/${id}`, patch);
      set((state) => mergeLocal(state, data));
      return data;
    } catch (err) {
      if (snapshot) {
        set((state) => {
          const restore = (g) => (g?.id === id ? snapshot : g);
          return {
            goals: state.goals.map(restore),
            goalById: state.goalById[id]
              ? { ...state.goalById, [id]: snapshot }
              : state.goalById,
          };
        });
      }
      throw err;
    }
  },

  // Socket handler for `goal:updated`. Idempotent — applying our own echo
  // is harmless because the merged result is identical to what we already
  // wrote optimistically.
  applyGoalUpdate: (goal) => {
    if (!goal?.id) return;
    set((state) => {
      const merge = (g) => {
        if (!g || g.id !== goal.id) return g;
        return { ...g, ...goal, milestones: g.milestones ?? goal.milestones };
      };
      return {
        goals: state.goals.map(merge),
        goalById: state.goalById[goal.id]
          ? { ...state.goalById, [goal.id]: merge(state.goalById[goal.id]) }
          : state.goalById,
      };
    });
  },

  /* ────────────────────────  MILESTONES  ──────────────────────── */

  createMilestone: async (goalId, draft) => {
    const { data } = await api.post(`/api/goals/${goalId}/milestones`, draft);
    set((state) =>
      patchGoalMilestones(state, goalId, (ms) => {
        if (ms.some((m) => m.id === data.id)) return ms;
        return [...ms, data];
      })
    );
    return data;
  },

  updateMilestone: async (milestoneId, goalId, patch) => {
    // Optimistic — flip progress/title locally first so the slider feels alive.
    const previous = get()
      .goals.flatMap((g) => g.milestones || [])
      .concat(
        Object.values(get().goalById).flatMap((g) => g?.milestones || [])
      )
      .find((m) => m?.id === milestoneId);

    set((state) =>
      patchGoalMilestones(state, goalId, (ms) =>
        ms.map((m) => (m.id === milestoneId ? { ...m, ...patch } : m))
      )
    );

    try {
      const { data } = await api.patch(`/api/milestones/${milestoneId}`, patch);
      set((state) =>
        patchGoalMilestones(state, goalId, (ms) =>
          ms.map((m) => (m.id === milestoneId ? data : m))
        )
      );
      return data;
    } catch (err) {
      // Roll back to the previous snapshot on failure.
      if (previous) {
        set((state) =>
          patchGoalMilestones(state, goalId, (ms) =>
            ms.map((m) => (m.id === milestoneId ? previous : m))
          )
        );
      }
      throw err;
    }
  },

  deleteMilestone: async (milestoneId, goalId) => {
    const snapshot = get()
      .goals.find((g) => g.id === goalId)
      ?.milestones?.find((m) => m.id === milestoneId);

    set((state) =>
      patchGoalMilestones(state, goalId, (ms) =>
        ms.filter((m) => m.id !== milestoneId)
      )
    );

    try {
      await api.delete(`/api/milestones/${milestoneId}`);
    } catch (err) {
      // Restore on failure.
      if (snapshot) {
        set((state) =>
          patchGoalMilestones(state, goalId, (ms) =>
            ms.some((m) => m.id === snapshot.id) ? ms : [...ms, snapshot]
          )
        );
      }
      throw err;
    }
  },

  // Socket handlers — idempotent so a server echo of our own mutation
  // doesn't double-insert or clobber an in-flight optimistic edit.
  pushMilestone: (m) => {
    if (!m?.id || !m.goalId) return;
    set((state) =>
      patchGoalMilestones(state, m.goalId, (ms) =>
        ms.some((x) => x.id === m.id) ? ms : [...ms, m]
      )
    );
  },
  patchMilestoneFromSocket: (m) => {
    if (!m?.id || !m.goalId) return;
    set((state) =>
      patchGoalMilestones(state, m.goalId, (ms) =>
        ms.map((x) => (x.id === m.id ? { ...x, ...m } : x))
      )
    );
  },
  removeMilestoneFromSocket: ({ id, goalId }) => {
    if (!id || !goalId) return;
    set((state) =>
      patchGoalMilestones(state, goalId, (ms) => ms.filter((m) => m.id !== id))
    );
  },

  /* ────────────────────────  ACTIVITY FEED  ──────────────────────── */

  loadUpdates: async (goalId) => {
    const { data } = await api.get(`/api/goals/${goalId}/updates`);
    set((state) => ({
      updatesByGoalId: { ...state.updatesByGoalId, [goalId]: data },
    }));
    return data;
  },

  postUpdate: async (goalId, body) => {
    const { data } = await api.post(`/api/goals/${goalId}/updates`, { body });
    // Idempotent by id — the realtime socket can echo the same update
    // back to us before this response resolves, in which case `pushUpdate`
    // has already inserted it. Don't double-add.
    set((state) => {
      const existing = state.updatesByGoalId[goalId] || [];
      if (existing.some((u) => u.id === data.id)) return {};
      return {
        updatesByGoalId: {
          ...state.updatesByGoalId,
          [goalId]: [data, ...existing],
        },
      };
    });
    return data;
  },

  // Offline replay finished a queued POST — swap optimistic placeholders.
  reconcileTempId: (tempId, real, url) => {
    if (!tempId || !real?.id) return;
    if (typeof url === "string" && url.includes("/milestones")) {
      // milestone create
      const goalId = real.goalId;
      if (!goalId) return;
      set((state) =>
        patchGoalMilestones(state, goalId, (ms) => {
          const cleaned = ms.filter((m) => m.id !== tempId && m.id !== real.id);
          return [...cleaned, real];
        })
      );
      return;
    }
    // goal create
    set((state) => {
      const cleaned = state.goals.filter((g) => g.id !== tempId && g.id !== real.id);
      const hadTemp = state.goals.some((g) => g.id === tempId);
      return { goals: hadTemp ? [real, ...cleaned] : state.goals };
    });
  },

  pushUpdate: (update) => {
    if (!update?.id || !update.goalId) return;
    set((state) => {
      const existing = state.updatesByGoalId[update.goalId] || [];
      if (existing.some((u) => u.id === update.id)) return {};
      return {
        updatesByGoalId: {
          ...state.updatesByGoalId,
          [update.goalId]: [update, ...existing],
        },
      };
    });
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("offline:idmap", (e) => {
    const { tempId, real, url } = e.detail || {};
    if (typeof url !== "string") return;
    if (url.includes("/goals") || url.includes("/milestones")) {
      useGoalsStore.getState().reconcileTempId(tempId, real, url);
    }
  });
}

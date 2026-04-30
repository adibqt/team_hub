"use client";
import { useState } from "react";
import { Plus, Trash2, Check, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
import { useGoalsStore } from "@/stores/goalsStore";

export default function MilestoneList({ goal, accent }) {
  const milestones = goal?.milestones || [];
  const createMilestone = useGoalsStore((s) => s.createMilestone);
  const updateMilestone = useGoalsStore((s) => s.updateMilestone);
  const deleteMilestone = useGoalsStore((s) => s.deleteMilestone);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftProgress, setDraftProgress] = useState(0);
  const [creating, setCreating] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!draftTitle.trim()) return;
    setCreating(true);
    try {
      await createMilestone(goal.id, {
        title: draftTitle.trim(),
        progress: draftProgress,
      });
      setDraftTitle("");
      setDraftProgress(0);
      setShowAdd(false);
      toast.success("Milestone added");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't add milestone.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section aria-labelledby="ms-h" className="animate-fade-up">
      <div className="flex items-end justify-between pb-3 border-b border-ink/15">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-1">
            <span className="text-ember">§</span>&nbsp;Section · 02
          </p>
          <h2
            id="ms-h"
            className="font-display text-2xl tracking-tight text-ink"
          >
            <span className="italic font-normal">Milestones</span>
            <span className="font-light text-ink/45 ml-2 text-base tabular-nums">
              {milestones.length} on file
            </span>
          </h2>
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-ink/15 hover:border-ink/45 hover:bg-paper-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember font-mono text-[10px] uppercase tracking-widest2 text-ink/70"
          >
            <Plus size={12} strokeWidth={1.75} />
            Add milestone
          </button>
        )}
      </div>

      {/* Inline create form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mt-5 border-l-2 border-ember pl-5 pr-2 py-4 bg-paper-50 grid gap-4"
          aria-label="Add a milestone"
        >
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="e.g. Wireframe approved"
            autoFocus
            maxLength={200}
            className="w-full bg-transparent text-ink placeholder:text-ink/30 border-0 border-b border-ink/20 hover:border-ink/45 focus:border-ink focus:ring-0 px-0 py-2 text-[15px] outline-none"
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 flex items-center gap-3">
              <span>Progress</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={draftProgress}
                onChange={(e) => setDraftProgress(Number(e.target.value))}
                className="w-32 accent-ember cursor-pointer"
                aria-label="Milestone progress"
              />
              <span className="tabular-nums text-ink/75 w-9 text-right">
                {draftProgress}%
              </span>
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setDraftTitle("");
                  setDraftProgress(0);
                }}
                className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest2 text-ink/55 hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !draftTitle.trim()}
                className="inline-flex items-center gap-1.5 bg-ink text-paper px-3 py-1.5 hover:bg-ink-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-[10px] uppercase tracking-widest2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <Check size={12} strokeWidth={2} />
                {creating ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List */}
      {milestones.length === 0 && !showAdd ? (
        <div className="mt-8 px-6 py-10 border border-dashed border-ink/15 bg-paper-50 text-center">
          <p className="font-mono text-[11px] uppercase tracking-widest2 text-ink/55">
            No milestones yet
          </p>
          <p className="mt-2 max-w-md mx-auto text-sm text-ink/55 leading-relaxed">
            Break this goal into checkpoints. Each one carries a 0–100 percent
            slider so the team can see momentum at a glance.
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10">
          {milestones.map((m, i) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              index={i}
              accent={accent}
              onUpdate={(patch) => updateMilestone(m.id, goal.id, patch)}
              onDelete={() => deleteMilestone(m.id, goal.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function MilestoneRow({ milestone, index, accent, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(milestone.title);
  const [working, setWorking] = useState(false);

  async function handleProgress(e) {
    const next = Number(e.target.value);
    try {
      await onUpdate({ progress: next });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't save progress.");
    }
  }

  async function handleSaveTitle() {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === milestone.title) {
      setEditing(false);
      setDraftTitle(milestone.title);
      return;
    }
    setWorking(true);
    try {
      await onUpdate({ title: trimmed });
      setEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't rename milestone.");
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${milestone.title}"?`)) return;
    try {
      await onDelete();
      toast.success("Milestone removed");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't delete milestone.");
    }
  }

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-start gap-4 py-5">
      <span className="hidden sm:block font-mono text-[10px] tabular-nums text-ink/40 tracking-widest2 w-8 mt-1">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") {
                  setEditing(false);
                  setDraftTitle(milestone.title);
                }
              }}
              maxLength={200}
              className="flex-1 bg-transparent text-ink border-0 border-b border-ink/35 focus:border-ink focus:ring-0 px-0 py-1 text-[15px] outline-none"
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              disabled={working}
              aria-label="Save title"
              className="p-1.5 text-ink/55 hover:text-ember hover:bg-ember-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            >
              <Check size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraftTitle(milestone.title);
              }}
              aria-label="Cancel rename"
              className="p-1.5 text-ink/45 hover:text-ink hover:bg-paper-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-left font-display italic text-lg leading-tight text-ink hover:text-ember/90 transition-colors focus:outline-none focus-visible:underline"
            aria-label={`Edit milestone "${milestone.title}"`}
          >
            {milestone.title}
          </button>
        )}

        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-[3px] flex-1 max-w-md bg-ink/10">
            <div
              className="absolute inset-y-0 left-0 transition-[width]"
              style={{ width: `${milestone.progress}%`, background: accent }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={milestone.progress}
            onChange={handleProgress}
            className="w-32 accent-ember cursor-pointer"
            aria-label={`Progress for ${milestone.title}`}
          />
          <span className="font-mono text-[11px] tabular-nums text-ink/65 w-10 text-right">
            {milestone.progress}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 pt-1">
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Rename "${milestone.title}"`}
            title="Rename"
            className="p-2 text-ink/45 hover:text-ink hover:bg-paper-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          >
            <Pencil size={13} strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          aria-label={`Delete "${milestone.title}"`}
          title="Delete"
          className="p-2 text-ink/45 hover:text-ember hover:bg-ember-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>
    </li>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import { useItemsStore } from "@/stores/itemsStore";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useGoalsStore } from "@/stores/goalsStore";

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "LOW · take it when there's slack" },
  { value: "MEDIUM", label: "MEDIUM · standard cadence" },
  { value: "HIGH", label: "HIGH · pull it forward" },
  { value: "URGENT", label: "URGENT · drop other work" },
];

const STATUS_OPTIONS = [
  { value: "TODO", label: "TODO · not started" },
  { value: "IN_PROGRESS", label: "IN PROGRESS · in flight" },
  { value: "REVIEW", label: "REVIEW · awaiting eyes" },
  { value: "DONE", label: "DONE · landed" },
];

export default function CreateActionItemModal({ open, onClose, workspaceId, defaultGoalId }) {
  const me = useAuthStore((s) => s.user);
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const loadOne = useWorkspaceStore((s) => s.loadOne);
  const goals = useGoalsStore((s) => s.goals);
  const loadGoals = useGoalsStore((s) => s.load);
  const createItem = useItemsStore((s) => s.createItem);

  const members = useMemo(
    () => (ws?.members || []).slice().sort((a, b) => a.user.name.localeCompare(b.user.name)),
    [ws?.members]
  );

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
    goalId: defaultGoalId || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (!ws?.members) loadOne(workspaceId).catch(() => {});
    if (!goals?.length) loadGoals(workspaceId).catch(() => {});
  }, [open, workspaceId, ws?.members, goals?.length, loadOne, loadGoals]);

  useEffect(() => {
    if (open && defaultGoalId) setForm((f) => ({ ...f, goalId: defaultGoalId }));
  }, [open, defaultGoalId]);

  function reset() {
    setForm({
      title: "",
      description: "",
      assigneeId: "",
      priority: "MEDIUM",
      status: "TODO",
      dueDate: "",
      goalId: defaultGoalId || "",
    });
    setError("");
  }

  function handleClose() {
    if (submitting) return;
    onClose?.();
    setTimeout(reset, 200);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const title = form.title.trim();
    if (!title) {
      setError("An action item needs a title.");
      return;
    }

    setSubmitting(true);
    try {
      await createItem(workspaceId, {
        title,
        description: form.description.trim() || undefined,
        assigneeId: form.assigneeId || undefined,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        goalId: form.goalId || undefined,
      });
      toast.success("Item filed");
      onClose?.();
      setTimeout(reset, 250);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't create item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="Action items"
      stamp="New entry"
      size="lg"
      title={
        <>
          <span className="font-light">File a new </span>
          <span className="italic font-normal">action<span className="text-ember">.</span></span>
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button
            type="submit"
            form="create-item-form"
            variant="primary"
            loading={submitting}
            rightIcon={ArrowRight}
          >
            File item
          </Button>
        </>
      }
    >
      <form id="create-item-form" onSubmit={handleSubmit} className="space-y-7" noValidate>
        {error && (
          <p
            role="alert"
            className="font-mono text-[11px] uppercase tracking-widest2 text-ember flex items-baseline gap-2 border-l-2 border-ember pl-3 py-1"
          >
            <span aria-hidden="true">×</span>
            {error}
          </p>
        )}

        <Field
          label="Title"
          n="01"
          placeholder="e.g. Wire up SSO redirect"
          autoFocus
          maxLength={200}
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          hint="A short headline — what concretely needs to happen."
        />

        <Field
          label="Description"
          n="02"
          multiline
          rows={3}
          maxLength={2000}
          placeholder="Optional. Acceptance criteria, links, gotchas."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
          <Select
            label="Assignee"
            n="03"
            value={form.assigneeId}
            onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
            hint="Optional. Leave blank for unassigned."
          >
            <option value="">— Unassigned —</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
                {m.userId === me?.id ? " · you" : ""}
                {m.role === "ADMIN" ? " · admin" : ""}
              </option>
            ))}
          </Select>

          <Field
            label="Due date"
            n="04"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            hint="Optional."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
          <Select
            label="Priority"
            n="05"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>

          <Select
            label="Status"
            n="06"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>

        <Select
          label="Parent goal"
          n="07"
          value={form.goalId}
          onChange={(e) => setForm((f) => ({ ...f, goalId: e.target.value }))}
          hint="Optional. Link this item to a goal so progress rolls up."
        >
          <option value="">— None —</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}

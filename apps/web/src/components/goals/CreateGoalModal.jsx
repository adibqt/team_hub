"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import { useGoalsStore } from "@/stores/goalsStore";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "NOT STARTED · idea on the page" },
  { value: "IN_PROGRESS", label: "IN PROGRESS · work in flight" },
  { value: "COMPLETED",   label: "COMPLETED · landed and shipped" },
];

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateGoalModal({ open, onClose, workspaceId }) {
  const me = useAuthStore((s) => s.user);
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const createGoal = useGoalsStore((s) => s.createGoal);

  const members = useMemo(
    () => (ws?.members || []).slice().sort((a, b) => a.user.name.localeCompare(b.user.name)),
    [ws?.members]
  );

  const [form, setForm] = useState({
    title: "",
    description: "",
    ownerId: me?.id || "",
    dueDate: "",
    status: "NOT_STARTED",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Default the owner to "me" once auth + workspace are available.
  useEffect(() => {
    if (!open) return;
    if (!form.ownerId && me?.id) setForm((f) => ({ ...f, ownerId: me.id }));
  }, [open, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setForm({
      title: "",
      description: "",
      ownerId: me?.id || "",
      dueDate: "",
      status: "NOT_STARTED",
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
      setError("A goal needs a title.");
      return;
    }
    if (!form.ownerId) {
      setError("Pick an owner — every goal needs one accountable name.");
      return;
    }

    setSubmitting(true);
    try {
      await createGoal(workspaceId, {
        title,
        description: form.description.trim() || undefined,
        ownerId: form.ownerId,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        status: form.status,
      });
      toast.success("Goal filed");
      onClose?.();
      setTimeout(reset, 250);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't create goal.");
    } finally {
      setSubmitting(false);
    }
  }

  const minDueDate = todayIsoDate();

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="Goals"
      stamp="New entry"
      size="lg"
      title={
        <>
          <span className="font-light">File a new </span>
          <span className="italic font-normal">goal<span className="text-ember">.</span></span>
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-goal-form"
            variant="primary"
            loading={submitting}
            rightIcon={ArrowRight}
          >
            File goal
          </Button>
        </>
      }
    >
      <form id="create-goal-form" onSubmit={handleSubmit} className="space-y-7" noValidate>
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
          placeholder="e.g. Ship the new onboarding flow"
          autoFocus
          maxLength={200}
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          hint="A short headline. The roster will see this everywhere this goal is referenced."
        />

        <Field
          label="Description"
          n="02"
          multiline
          rows={3}
          maxLength={1000}
          placeholder="Optional. Context, the 'why', acceptance criteria — anything that won't fit in the title."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
          <Select
            label="Owner"
            n="03"
            required
            value={form.ownerId}
            onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
            hint="The single accountable person."
          >
            {members.length === 0 && (
              <option value="" disabled>
                Loading roster…
              </option>
            )}
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
            min={minDueDate}
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            hint="Optional. Leave blank for an open-ended goal."
          />
        </div>

        <Select
          label="Status"
          n="05"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <p className="font-mono text-[11px] tracking-widest2 uppercase text-ink/45 border-t border-ink/15 pt-5">
          <span className="text-ember">§</span>&nbsp;Heads up
          <span className="block mt-1.5 normal-case tracking-normal text-[12px] text-ink/65 font-sans">
            Filing a goal logs an entry in the audit ledger and notifies anyone watching the workspace in real time.
          </span>
        </p>
      </form>
    </Modal>
  );
}

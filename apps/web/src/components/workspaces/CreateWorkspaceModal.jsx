"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, ArrowRight } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import AccentSwatchPicker, { ACCENTS } from "@/components/workspaces/AccentSwatchPicker";
import { useWorkspaceStore } from "@/stores/workspaceStore";

const DEFAULT_ACCENT = ACCENTS[0].hex;

export default function CreateWorkspaceModal({ open, onClose }) {
  const router = useRouter();
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const [form, setForm] = useState({
    name: "",
    description: "",
    accentColor: DEFAULT_ACCENT,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setForm({ name: "", description: "", accentColor: DEFAULT_ACCENT });
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
    if (!form.name.trim()) {
      setError("A workspace needs a name.");
      return;
    }
    setSubmitting(true);
    try {
      const ws = await createWorkspace({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        accentColor: form.accentColor,
      });
      setActive(ws.id);
      toast.success("Workspace created");
      onClose?.();
      router.push(`/w/${ws.id}`);
      setTimeout(reset, 250);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't create workspace.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="New ledger"
      stamp="Folio"
      title={
        <>
          <span className="font-light">Open a fresh </span>
          <span className="italic font-normal">workspace<span className="text-ember">.</span></span>
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-ws-form"
            variant="primary"
            loading={submitting}
            rightIcon={ArrowRight}
          >
            Create workspace
          </Button>
        </>
      }
    >
      <form id="create-ws-form" onSubmit={handleSubmit} className="space-y-7" noValidate>
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
          label="Name"
          n="01"
          placeholder="e.g. Engineering, Marketing, Q3 Launch"
          autoFocus
          maxLength={100}
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />

        <Field
          label="Description"
          n="02"
          multiline
          rows={3}
          maxLength={500}
          placeholder="Optional. A short note on what this workspace is for."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          hint="Up to 500 characters. Visible to every member."
        />

        <AccentSwatchPicker
          n="03"
          value={form.accentColor}
          onChange={(hex) => setForm((f) => ({ ...f, accentColor: hex }))}
        />

        {/* Live preview */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-3 flex items-baseline gap-2">
            <span className="text-ember tabular-nums">04</span>
            <span>Preview</span>
          </p>
          <div className="bg-paper border border-ink/15 relative">
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 bottom-0 w-[5px] transition-colors"
              style={{ background: form.accentColor }}
            />
            <div className="pl-7 pr-6 py-6">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex items-center gap-2">
                <span className="text-ember">№ 01</span>
                <span aria-hidden="true" className="inline-block h-px w-4 bg-ink/25" />
                <span>ADMIN</span>
              </div>
              <h3 className="mt-3 font-display text-2xl leading-tight tracking-tight">
                <span className="italic font-normal">{form.name || "Untitled"}</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65 line-clamp-2">
                {form.description || "Untitled workspace — add a description to set the tone."}
              </p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

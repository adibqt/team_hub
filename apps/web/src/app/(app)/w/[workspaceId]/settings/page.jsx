"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, LogOut, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";
import Field from "@/components/ui/Field";
import AccentSwatchPicker, { ACCENTS } from "@/components/workspaces/AccentSwatchPicker";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);

  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const loadOne = useWorkspaceStore((s) => s.loadOne);
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);
  const removeMember = useWorkspaceStore((s) => s.removeMember);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", accentColor: ACCENTS[0].hex });
  const [error, setError] = useState("");

  const isAdmin = ws?.viewerRole === "ADMIN";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadOne(workspaceId)
      .then((data) => {
        if (!mounted) return;
        setForm({
          name: data.name || "",
          description: data.description || "",
          accentColor: data.accentColor || ACCENTS[0].hex,
        });
      })
      .catch(() => toast.error("Couldn't load workspace settings."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [workspaceId, loadOne]);

  const dirty =
    !!ws &&
    (form.name !== ws.name ||
      (form.description || "") !== (ws.description || "") ||
      form.accentColor.toLowerCase() !== (ws.accentColor || "").toLowerCase());

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Workspace name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateWorkspace(workspaceId, {
        name: form.name.trim(),
        description: form.description,
        accentColor: form.accentColor,
      });
      toast.success("Settings saved");
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLeave() {
    if (!window.confirm(`Leave ${ws.name}? You'll lose access immediately.`)) return;
    try {
      await removeMember(workspaceId, me.id);
      toast.success(`You left ${ws.name}`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't leave workspace.");
    }
  }

  async function handleDelete() {
    const typed = window.prompt(
      `This will permanently delete "${ws.name}" and every goal, item, and message in it.\n\nType the workspace name to confirm:`
    );
    if (typed !== ws.name) {
      if (typed != null) toast.error("Name didn't match — nothing was deleted.");
      return;
    }
    try {
      await removeWorkspace(workspaceId);
      toast.success("Workspace deleted");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't delete workspace.");
    }
  }

  return (
    <div className="relative max-w-[860px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8 bg-ember" />
          <span>Workspace · {ws?.name || "—"}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline">Settings</span>
        </div>
        <h1 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-ink">
          <span className="font-light">House </span>
          <span className="italic font-normal">rules<span className="text-ember">.</span></span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
          {isAdmin
            ? "Adjust how this workspace is named, described, and coloured. Changes are saved on demand."
            : "Only admins can edit settings. You can still review them here."}
        </p>
      </header>

      {/* ============================================================ FORM */}
      <form
        onSubmit={handleSubmit}
        className="mt-12 animate-fade-up"
        style={{ animationDelay: "0.1s" }}
        noValidate
      >
        <div className="pb-3 border-b border-ink/15 flex items-end justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="text-ember">§</span>&nbsp;Identity · 01
          </p>
          {dirty && isAdmin && (
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ember">
              Unsaved
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 font-mono text-[11px] uppercase tracking-widest2 text-ember flex items-baseline gap-2 border-l-2 border-ember pl-3 py-1"
          >
            <span aria-hidden="true">×</span>
            {error}
          </p>
        )}

        <fieldset disabled={!isAdmin || loading || saving} className="mt-7 space-y-9">
          <Field
            label="Workspace name"
            n="01"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Engineering, Q3 Launch"
            maxLength={100}
          />

          <Field
            label="Description"
            n="02"
            multiline
            rows={3}
            maxLength={500}
            placeholder="What this workspace is for. Visible to every member."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          <AccentSwatchPicker
            n="03"
            value={form.accentColor}
            onChange={(hex) => setForm((f) => ({ ...f, accentColor: hex }))}
          />
        </fieldset>

        {isAdmin && (
          <div className="mt-10 pt-6 border-t border-ink/15 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                setForm({
                  name: ws?.name || "",
                  description: ws?.description || "",
                  accentColor: ws?.accentColor || ACCENTS[0].hex,
                })
              }
              disabled={!dirty || saving}
              className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 hover:text-ink px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              className="inline-flex items-center gap-2.5 bg-ink text-paper px-5 py-2.5 hover:bg-ink-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <Save size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2">
                {saving ? "Saving…" : "Save changes"}
              </span>
              {!saving && <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />}
            </button>
          </div>
        )}
      </form>

      {/* ============================================================ DANGER ZONE */}
      <section className="mt-16 animate-fade-up" style={{ animationDelay: "0.2s" }}>
        <div className="pb-3 border-b border-ember/40 flex items-end justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ember">
            <span>§</span>&nbsp;Danger zone · 02
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
            Read carefully
          </p>
        </div>

        <div className="mt-6 grid gap-px bg-ember/30 border border-ember/30">
          <div className="bg-paper-50 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-md">
              <p className="font-display italic text-lg text-ink">Leave this workspace</p>
              <p className="text-sm text-ink/65 mt-1">
                Step out of <span className="font-medium">{ws?.name || "this workspace"}</span>.
                Your data stays, you just lose access. Admins must promote someone else first if you're the last admin.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLeave}
              disabled={loading}
              className="inline-flex items-center gap-2.5 bg-paper text-ink border border-ink/15 hover:border-ember hover:text-ember hover:bg-ember-50 transition-colors px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            >
              <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2">
                Leave workspace
              </span>
            </button>
          </div>

          {isAdmin && (
            <div className="bg-paper-50 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-md">
                <p className="font-display italic text-lg text-ink">Delete workspace</p>
                <p className="text-sm text-ink/65 mt-1">
                  Permanently destroy this workspace and everything in it — goals, action items, announcements,
                  audit history. There's no undo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center gap-2.5 bg-ember text-paper border border-ember hover:bg-ember-600 transition-colors px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest2">
                  Delete workspace
                </span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

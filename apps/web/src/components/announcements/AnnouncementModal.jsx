"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Pin, Save } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import RichTextEditor from "@/components/announcements/RichTextEditor";
import { useAnnouncementsStore } from "@/stores/announcementsStore";

const EMPTY = { title: "", bodyHtml: "", pinned: false };

// TipTap reports "<p></p>" for an empty doc; treat that as empty.
function isEmptyHtml(html) {
  return !html || html.replace(/<[^>]*>/g, "").trim().length === 0;
}

/**
 * Single modal that handles both "publish a new announcement" and
 * "edit an existing one". Pass `announcement` to enter edit mode.
 */
export default function AnnouncementModal({
  open,
  onClose,
  workspaceId,
  announcement = null,
}) {
  const isEdit = !!announcement;
  const createAnnouncement = useAnnouncementsStore((s) => s.createAnnouncement);
  const updateAnnouncement = useAnnouncementsStore((s) => s.updateAnnouncement);

  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Keep the form in sync with whichever record we were handed. Reset
  // on close so the "create" path always opens with a clean slate.
  useEffect(() => {
    if (!open) return;
    if (announcement) {
      setForm({
        title: announcement.title || "",
        bodyHtml: announcement.bodyHtml || "",
        pinned: !!announcement.pinned,
      });
    } else {
      setForm(EMPTY);
    }
    setError("");
  }, [open, announcement]);

  function handleClose() {
    if (submitting) return;
    onClose?.();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const title = form.title.trim();
    if (!title) {
      setError("Give it a title \u2014 something the team will scan in their inbox.");
      return;
    }
    if (isEmptyHtml(form.bodyHtml)) {
      setError("The body can\u2019t be empty.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateAnnouncement(announcement.id, {
          title,
          bodyHtml: form.bodyHtml,
          pinned: form.pinned,
        });
        toast.success("Announcement updated");
      } else {
        await createAnnouncement(workspaceId, {
          title,
          bodyHtml: form.bodyHtml,
          pinned: form.pinned,
        });
        toast.success("Announcement published");
      }
      onClose?.();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          (isEdit ? "Couldn\u2019t save changes." : "Couldn\u2019t publish.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      eyebrow={isEdit ? "Revise dispatch" : "New dispatch"}
      stamp={isEdit ? "Edit" : "Press"}
      title={
        isEdit ? (
          <>
            <span className="font-light">Revise the </span>
            <span className="italic font-normal">
              announcement<span className="text-ember">.</span>
            </span>
          </>
        ) : (
          <>
            <span className="font-light">Tell the team </span>
            <span className="italic font-normal">
              something<span className="text-ember">.</span>
            </span>
          </>
        )
      }
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="announcement-form"
            variant="primary"
            loading={submitting}
            leftIcon={isEdit ? Save : undefined}
            rightIcon={!isEdit ? ArrowRight : undefined}
          >
            {isEdit ? "Save changes" : "Publish"}
          </Button>
        </>
      }
    >
      <form
        id="announcement-form"
        onSubmit={handleSubmit}
        className="space-y-7"
        noValidate
      >
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
          label="Headline"
          n="01"
          required
          autoFocus={!isEdit}
          maxLength={200}
          placeholder="e.g. Q3 launch is on. Read this before Monday."
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          hint="Short and direct. This is what folks see in their feed."
        />

        <div>
          <p className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-2">
            <span className="text-ember tabular-nums">02</span>
            <span>Body</span>
          </p>
          <RichTextEditor
            value={form.bodyHtml}
            onChange={(html) => setForm((f) => ({ ...f, bodyHtml: html }))}
            placeholder="Write something the team should know\u2026"
            minHeight={240}
          />
          <p className="mt-2 text-xs text-ink/55 leading-relaxed">
            Headings, lists, quotes, and emphasis only. Anything else is stripped on save.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <span
            className={`mt-0.5 grid place-items-center h-5 w-5 border transition-colors ${
              form.pinned
                ? "bg-ember border-ember text-paper"
                : "bg-paper border-ink/25 group-hover:border-ink/45 text-transparent"
            }`}
            aria-hidden="true"
          >
            <Pin size={11} strokeWidth={2} />
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={form.pinned}
            onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
          />
          <span className="flex-1">
            <span className="block font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
              <span className="text-ember tabular-nums">03</span>
              <span className="ml-2">Pin to the top</span>
            </span>
            <span className="block mt-1 text-sm text-ink/65 leading-relaxed">
              Keep this stuck above the rest of the board until you unpin it.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}

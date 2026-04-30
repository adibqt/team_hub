"use client";
import { useState } from "react";
import { Copy, Mail, ArrowRight, Check } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export default function InviteMemberModal({ open, onClose, workspaceId }) {
  const inviteMember = useWorkspaceStore((s) => s.inviteMember);
  const [form, setForm] = useState({ email: "", role: "MEMBER" });
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setForm({ email: "", role: "MEMBER" });
    setIssued(null);
    setCopied(false);
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
    setSubmitting(true);
    try {
      const data = await inviteMember(workspaceId, form);
      setIssued(data);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't create invite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!issued?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(issued.inviteUrl);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — please copy manually.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="Roster"
      stamp={issued ? "Issued" : "Invitation"}
      title={
        issued ? (
          <>
            <span className="font-light">Invitation </span>
            <span className="italic font-normal">issued<span className="text-ember">.</span></span>
          </>
        ) : (
          <>
            <span className="font-light">Pull a teammate </span>
            <span className="italic font-normal">in<span className="text-ember">.</span></span>
          </>
        )
      }
      footer={
        issued ? (
          <>
            <Button variant="ghost" onClick={() => { reset(); }}>
              Issue another
            </Button>
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="invite-form"
              variant="primary"
              loading={submitting}
              rightIcon={ArrowRight}
            >
              Issue invitation
            </Button>
          </>
        )
      }
    >
      {!issued ? (
        <form id="invite-form" onSubmit={handleSubmit} className="space-y-7" noValidate>
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
            label="Email address"
            n="01"
            type="email"
            placeholder="teammate@company.com"
            autoComplete="email"
            required
            autoFocus
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            hint="They'll need this exact address when signing in to redeem the invite."
          />
          <Select
            label="Role on arrival"
            n="02"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="MEMBER">MEMBER · everyday access</option>
            <option value="ADMIN">ADMIN · can manage settings &amp; members</option>
          </Select>

          <p className="font-mono text-[11px] tracking-widest2 uppercase text-ink/45 border-t border-ink/15 pt-5">
            <span className="text-ember">§</span>&nbsp;Heads up
            <span className="block mt-1.5 normal-case tracking-normal text-[12px] text-ink/65 font-sans">
              We'll email this address with the invite link. The link is also shown here so you can share it through any channel you prefer.
            </span>
          </p>
        </form>
      ) : (
        <div className="space-y-7">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-2 flex items-center gap-2">
              <Mail size={12} strokeWidth={1.75} className="text-ember" />
              Recipient
            </p>
            <p className="text-[15px] text-ink">{issued.email}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
              Role · <span className="text-ink/70">{issued.role}</span>
            </p>
            <p
              className={`mt-3 font-mono text-[10px] uppercase tracking-widest2 ${
                issued.emailSent ? "text-ember" : "text-ink/55"
              }`}
            >
              <span aria-hidden="true">{issued.emailSent ? "✓" : "·"}</span>&nbsp;
              {issued.emailSent
                ? "Email delivered to inbox"
                : issued.emailSkipped === "smtp-not-configured"
                ? "Email not sent — SMTP isn't configured. Share the link manually."
                : "Email could not be sent. Share the link manually."}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 mb-2">
              <span className="text-ember">§</span>&nbsp;Shareable link
            </p>
            <div className="flex items-stretch border border-ink/15">
              <input
                readOnly
                value={issued.inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 font-mono text-[12px] text-ink bg-paper-50 px-3 py-3 outline-none"
              />
              <button
                type="button"
                onClick={copyLink}
                className="bg-ink text-paper px-4 hover:bg-ink-300 transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink/55 leading-relaxed">
              The recipient must sign in with <span className="text-ink/85">{issued.email}</span> to redeem it.
              They'll be added to your roster the moment they accept.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

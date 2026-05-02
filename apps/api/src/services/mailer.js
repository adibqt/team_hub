import nodemailer from "nodemailer";
import dns from "node:dns";
import { env } from "../config/env.js";

/* ────────────────────────────────────────────────────────────────
   Two backends:
     • Brevo (HTTP) — used when BREVO_API_KEY is set. Required on
       Railway and other PaaS that block outbound SMTP ports.
     • Nodemailer / SMTP — fallback for local dev or self-hosted.
   If neither is configured, every send becomes a no-op + warning.
   ──────────────────────────────────────────────────────────────── */

function useBrevo() {
  return Boolean(env.BREVO_API_KEY);
}

function useSmtp() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function isMailEnabled() {
  return useBrevo() || useSmtp();
}

// ── Brevo ────────────────────────────────────────────────────────
// Parse "Display Name <addr@host>" or plain "addr@host" → { name?, email }
function parseAddress(input) {
  if (!input) return null;
  const m = String(input).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim() };
  return { email: String(input).trim() };
}

let brevoLoggedReady = false;
async function brevoSend({ from, to, subject, text, html, replyTo }) {
  const sender = parseAddress(from);
  if (!sender) throw new Error("MAIL_FROM is required when using Brevo");

  const body = {
    sender,
    to: [parseAddress(to)],
    subject,
    htmlContent: html,
    textContent: text,
  };
  if (replyTo) body.replyTo = parseAddress(replyTo);

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo ${res.status}: ${detail || res.statusText}`);
  }
  if (!brevoLoggedReady) {
    console.log("[mailer] Brevo ready");
    brevoLoggedReady = true;
  }
  const data = await res.json().catch(() => ({}));
  return { messageId: data.messageId };
}

// ── SMTP (fallback) ──────────────────────────────────────────────
function ipv4Lookup(hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  return dns.lookup(hostname, { ...options, family: 4 }, callback);
}

let transporter = null;
let verifyPromise = null;

function getTransporter() {
  if (!useSmtp()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    family: 4,
    tls: { family: 4, lookup: ipv4Lookup },
    lookup: ipv4Lookup,
  });

  verifyPromise = transporter
    .verify()
    .then(() => console.log(`[mailer] SMTP ready · ${env.SMTP_HOST}:${env.SMTP_PORT}`))
    .catch((err) => console.warn(`[mailer] SMTP verify failed: ${err.message}`));

  return transporter;
}

function fromAddress() {
  const addr = env.MAIL_FROM || env.SMTP_USER;
  if (!addr) return undefined;
  return env.MAIL_FROM_NAME ? `"${env.MAIL_FROM_NAME}" <${addr}>` : addr;
}

/**
 * Send through whichever backend is active. Returns nodemailer-shaped
 * `{ messageId }` on success, throws on failure.
 */
async function deliver({ to, subject, text, html, replyTo }) {
  if (useBrevo()) {
    return brevoSend({ from: fromAddress(), to, subject, text, html, replyTo });
  }

  const t = getTransporter();
  if (verifyPromise) await verifyPromise.catch(() => {});
  const info = await t.sendMail({ from: fromAddress(), to, subject, text, html, replyTo });
  return { messageId: info.messageId };
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ────────────────────────────────────────────────────────────────
   Public API
   ──────────────────────────────────────────────────────────────── */

/**
 * Send a workspace invitation email.
 *
 * Resolves to `{ sent: boolean, skipped?: string, messageId?: string }`.
 * Never throws — invite creation should not fail because mail blew up.
 */
export async function sendInviteEmail({
  to,
  inviterName,
  inviterEmail,
  workspaceName,
  workspaceAccent = "#2563EB",
  role = "MEMBER",
  inviteUrl,
}) {
  if (!isMailEnabled()) {
    console.warn(
      `[mailer] SMTP not configured — skipping invite email to ${to}. ` +
        `Set SMTP_HOST/SMTP_USER/SMTP_PASS in apps/api/.env to enable.`
    );
    return { sent: false, skipped: "smtp-not-configured" };
  }

  const safeWorkspace = escapeHtml(workspaceName);
  const safeInviter = escapeHtml(inviterName || "A teammate");
  const safeRole = escapeHtml(role);
  const accent = /^#[0-9A-Fa-f]{6}$/.test(workspaceAccent) ? workspaceAccent : "#2563EB";

  const subject = `${inviterName || "A teammate"} invited you to ${workspaceName} on Team Hub`;

  const text = [
    `${inviterName || "A teammate"} invited you to join "${workspaceName}" on Team Hub.`,
    `Role on arrival: ${role}`,
    "",
    "Accept the invitation:",
    inviteUrl,
    "",
    "If you weren't expecting this email, you can safely ignore it.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeInviter} invited you to ${safeWorkspace}</title>
  </head>
  <body style="margin:0;padding:0;background:#F5F1EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EA;padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFDF8;border:1px solid rgba(26,24,20,0.12);">
            <tr>
              <td style="padding:32px 40px 0;">
                <p style="margin:0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(26,24,20,0.55);">
                  <span style="display:inline-block;width:24px;height:1px;background:${accent};vertical-align:middle;margin-right:10px;"></span>
                  Team Hub · Invitation
                </p>
                <h1 style="margin:24px 0 0;font-size:30px;line-height:1.1;letter-spacing:-0.02em;font-weight:300;color:#1A1814;">
                  You're invited to <em style="font-style:italic;font-weight:400;">${safeWorkspace}</em><span style="color:${accent};">.</span>
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 40px 8px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(26,24,20,0.78);">
                  <strong style="color:#1A1814;font-weight:500;">${safeInviter}</strong>
                  added you to a workspace on Team Hub. You'll join as
                  <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${accent};">${safeRole}</span>
                  the moment you accept.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:32px 40px 8px;" align="left">
                <a href="${inviteUrl}"
                   style="display:inline-block;background:#1A1814;color:#FFFDF8;text-decoration:none;padding:14px 28px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
                  Accept invitation →
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 40px 0;">
                <p style="margin:0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(26,24,20,0.45);">
                  <span style="color:${accent};">§</span>&nbsp;Or paste this link
                </p>
                <p style="margin:8px 0 0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:12px;line-height:1.5;color:rgba(26,24,20,0.7);word-break:break-all;">
                  ${escapeHtml(inviteUrl)}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:32px 40px 36px;">
                <hr style="border:none;border-top:1px solid rgba(26,24,20,0.12);margin:0 0 20px;" />
                <p style="margin:0;font-size:13px;line-height:1.55;color:rgba(26,24,20,0.55);">
                  You'll need to sign in with <strong style="color:rgba(26,24,20,0.8);font-weight:500;">${escapeHtml(to)}</strong> to redeem this invite.
                  If you don't have a Team Hub account yet, create one with that email and the invite will redeem itself on your first sign-in.
                </p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.55;color:rgba(26,24,20,0.4);">
                  Not expecting this? You can safely ignore the email — the invite expires the moment ${safeInviter} revokes it.
                </p>
              </td>
            </tr>
          </table>

          <p style="margin:20px 0 0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(26,24,20,0.35);">
            Team Hub · sent on behalf of ${safeInviter}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const info = await deliver({
      to,
      subject,
      text,
      html,
      replyTo: inviterEmail || undefined,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mailer] Failed to send invite to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send a mention notification email.
 *
 * Resolves to `{ sent: boolean, skipped?: string, messageId?: string }`.
 * Never throws — in-app notifications are the source of truth.
 */
export async function sendMentionEmail({
  to,
  recipientName,
  actorName,
  workspaceName,
  workspaceAccent = "#2563EB",
  announcementTitle,
  commentPreview,
  announcementUrl,
}) {
  if (!isMailEnabled()) {
    console.warn(
      `[mailer] SMTP not configured — skipping mention email to ${to}. ` +
        `Set SMTP_HOST/SMTP_USER/SMTP_PASS in apps/api/.env to enable.`
    );
    return { sent: false, skipped: "smtp-not-configured" };
  }

  const safeRecipient = escapeHtml(recipientName || "there");
  const safeActor = escapeHtml(actorName || "Someone");
  const safeWorkspace = escapeHtml(workspaceName || "your workspace");
  const safeAnnouncement = escapeHtml(announcementTitle || "an announcement");
  const safePreview = escapeHtml(commentPreview || "");
  const accent = /^#[0-9A-Fa-f]{6}$/.test(workspaceAccent) ? workspaceAccent : "#2563EB";

  const subject = `${actorName || "Someone"} mentioned you in ${announcementTitle || "an announcement"}`;

  const text = [
    `Hi ${recipientName || "there"},`,
    "",
    `${actorName || "Someone"} mentioned you in "${announcementTitle || "an announcement"}"`,
    `inside ${workspaceName || "your workspace"} on Team Hub.`,
    "",
    safePreview ? `Comment preview: "${commentPreview}"` : null,
    "",
    "Open the announcement:",
    announcementUrl,
    "",
    "You can manage your notifications inside Team Hub.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>You were mentioned on Team Hub</title>
  </head>
  <body style="margin:0;padding:0;background:#F5F1EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EA;padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFDF8;border:1px solid rgba(26,24,20,0.12);">
            <tr>
              <td style="padding:32px 40px 0;">
                <p style="margin:0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(26,24,20,0.55);">
                  <span style="display:inline-block;width:24px;height:1px;background:${accent};vertical-align:middle;margin-right:10px;"></span>
                  Team Hub · Mention
                </p>
                <h1 style="margin:24px 0 0;font-size:30px;line-height:1.1;letter-spacing:-0.02em;font-weight:300;color:#1A1814;">
                  You were mentioned<span style="color:${accent};">.</span>
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 8px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(26,24,20,0.78);">
                  Hi <strong style="color:#1A1814;font-weight:500;">${safeRecipient}</strong> — 
                  <strong style="color:#1A1814;font-weight:500;">${safeActor}</strong> mentioned you in
                  <em style="font-style:italic;color:#1A1814;"> ${safeAnnouncement}</em>
                  in <span style="color:${accent};">${safeWorkspace}</span>.
                </p>
              </td>
            </tr>
            ${
              safePreview
                ? `<tr>
              <td style="padding:16px 40px 4px;">
                <p style="margin:0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(26,24,20,0.45);">
                  Comment preview
                </p>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.55;color:rgba(26,24,20,0.72);">"${safePreview}"</p>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:28px 40px 8px;" align="left">
                <a href="${announcementUrl}"
                   style="display:inline-block;background:#1A1814;color:#FFFDF8;text-decoration:none;padding:14px 28px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
                  View announcement →
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 36px;">
                <p style="margin:0;font-size:12px;line-height:1.55;color:rgba(26,24,20,0.4);">
                  If this wasn't expected, you can review your mentions and notifications after signing in to Team Hub.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const info = await deliver({ to, subject, text, html });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mailer] Failed to send mention email to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

export const mailer = { isMailEnabled, sendInviteEmail, sendMentionEmail };

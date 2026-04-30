"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, AlertOctagon, MailCheck } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const VOLUME = String(new Date().getFullYear()).slice(-2);

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .get(`/api/workspaces/invites/${token}`)
      .then(({ data }) => mounted && setPreview(data))
      .catch((err) =>
        mounted &&
        setPreviewError(err?.response?.data?.error || "We couldn't find that invitation.")
      )
      .finally(() => mounted && setLoadingPreview(false));

    api
      .get("/api/users/me")
      .then(({ data }) => mounted && setUser(data))
      .catch(() => {})
      .finally(() => mounted && setAuthChecked(true));

    return () => { mounted = false; };
  }, [token, setUser]);

  async function handleAccept() {
    setAcceptError("");
    setAccepting(true);
    try {
      const { data } = await api.post(`/api/workspaces/invites/${token}/accept`);
      router.push(`/w/${data.workspaceId}`);
    } catch (err) {
      setAcceptError(err?.response?.data?.error || "Couldn't accept this invitation.");
    } finally {
      setAccepting(false);
    }
  }

  const accent = preview?.workspace?.accentColor || "#D34F1F";
  const inviteUrl = typeof window !== "undefined" ? `/invite/${token}` : `/invite/${token}`;
  const alreadyAccepted = !!preview?.acceptedAt;

  return (
    <div className="relative min-h-screen flex flex-col bg-paper text-ink">
      <div className="grain" aria-hidden="true" />

      {/* MASTHEAD */}
      <header className="relative z-10 px-6 sm:px-10 lg:px-14 pt-6 sm:pt-8">
        <div className="flex items-end justify-between gap-6 pb-4 border-b border-ink/15">
          <Link href="/" className="group/logo flex items-baseline gap-3">
            <span aria-hidden="true" className="font-display italic text-2xl leading-none text-ink">
              T<span className="text-ember">·</span>H
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 hidden sm:inline">
              The Team Hub
            </span>
          </Link>
          <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="hidden md:inline">VOL.&nbsp;{VOLUME} <span className="text-ink/25">/</span> Invitation</span>
            <span className="hidden md:inline-block h-3 w-px bg-ink/15" aria-hidden="true" />
            <span className="flex items-center gap-2">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-ember animate-ping opacity-50" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-ember" />
              </span>
              LIVE
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 grid place-items-center px-6 sm:px-10 lg:px-14 py-14">
        <div className="w-full max-w-2xl animate-fade-up">
          {loadingPreview ? (
            <PreviewSkeleton />
          ) : previewError ? (
            <ErrorCard message={previewError} />
          ) : (
            <article className="relative bg-paper border border-ink/15">
              {/* Big accent slab */}
              <div
                aria-hidden="true"
                className="absolute -top-px left-0 right-0 h-1"
                style={{ background: accent }}
              />
              <span aria-hidden="true" className="absolute -top-px left-0 h-px w-24 bg-ember" />

              <div className="px-7 sm:px-12 py-10 sm:py-14">
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
                  <span aria-hidden="true" className="inline-block h-px w-8 bg-ember" />
                  <span>Invitation</span>
                  <span className="text-ink/25">/</span>
                  <span>Folio · 01</span>
                </div>

                <p className="mt-7 text-[15px] leading-relaxed text-ink/65">
                  You've been invited to join
                </p>

                <h1 className="mt-2 font-display text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.02] tracking-[-0.02em] text-ink">
                  <span className="italic font-normal">{preview.workspace.name}</span>
                  <span className="text-ember">.</span>
                </h1>

                {preview.workspace.description && (
                  <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink/70">
                    {preview.workspace.description}
                  </p>
                )}

                <div className="mt-9 hairline text-ink/20" aria-hidden="true" />

                <dl className="mt-7 grid grid-cols-2 gap-px bg-ink/15 border-y border-ink/15">
                  <div className="bg-paper px-5 py-4">
                    <dt className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
                      <span className="text-ember">01</span>&nbsp;Invitee
                    </dt>
                    <dd className="mt-2 text-[15px] text-ink truncate">{preview.email}</dd>
                  </div>
                  <div className="bg-paper px-5 py-4">
                    <dt className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
                      <span className="text-ember">02</span>&nbsp;Role on arrival
                    </dt>
                    <dd className="mt-2 flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2 w-2 ring-1 ring-ink/15"
                        style={{ background: accent }}
                      />
                      <span className="font-mono text-[12px] uppercase tracking-widest2 text-ink">
                        {preview.role}
                      </span>
                    </dd>
                  </div>
                </dl>

                {/* States: already accepted / not signed in / signed in / mismatched email */}
                {alreadyAccepted ? (
                  <Notice
                    tone="ok"
                    icon={CheckCircle2}
                    title="Already accepted"
                    body="This invitation has already been redeemed. Head to the workspace to pick up where you left off."
                    action={
                      <Link
                        href={`/w/${preview.workspace.id}`}
                        className="inline-flex items-center gap-2.5 bg-ink text-paper px-5 py-3 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-widest2">
                          Open workspace
                        </span>
                        <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    }
                  />
                ) : !authChecked ? (
                  <div className="mt-8 h-12 bg-ink/5 animate-pulse" aria-hidden="true" />
                ) : !me ? (
                  <UnauthCTA next={inviteUrl} email={preview.email} />
                ) : me.email !== preview.email ? (
                  <Notice
                    tone="warn"
                    icon={AlertOctagon}
                    title="Wrong account"
                    body={
                      <>
                        This invitation was issued to{" "}
                        <span className="text-ink/85">{preview.email}</span>, but you're signed in
                        as <span className="text-ink/85">{me.email}</span>. Sign in with the right
                        address to redeem it.
                      </>
                    }
                    action={
                      <Link
                        href={`/login?next=${encodeURIComponent(inviteUrl)}`}
                        className="inline-flex items-center gap-2.5 bg-ink text-paper px-5 py-3 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-widest2">
                          Switch account
                        </span>
                        <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    }
                  />
                ) : (
                  <div className="mt-9">
                    {acceptError && (
                      <p
                        role="alert"
                        className="mb-5 font-mono text-[11px] uppercase tracking-widest2 text-ember flex items-baseline gap-2 border-l-2 border-ember pl-3 py-1"
                      >
                        <span aria-hidden="true">×</span>
                        {acceptError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={accepting}
                      className="group/btn relative w-full sm:w-auto inline-flex items-center justify-between gap-6 bg-ink text-paper px-6 py-4 hover:bg-ember transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper/70 group-hover/btn:text-paper/90">
                        {accepting ? "Joining" : "Confirm"}
                      </span>
                      <span className="flex items-center gap-2.5">
                        {accepting ? (
                          <>
                            <span className="h-3.5 w-3.5 rounded-full border border-paper/40 border-t-paper animate-spin" aria-hidden="true" />
                            <span>Joining</span>
                            <span aria-hidden="true" className="animate-blink">_</span>
                          </>
                        ) : (
                          <>
                            <MailCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                            <span>Accept &amp; join {preview.workspace.name}</span>
                            <ArrowRight
                              size={16}
                              strokeWidth={1.75}
                              className="transition-transform group-hover/btn:translate-x-1"
                              aria-hidden="true"
                            />
                          </>
                        )}
                      </span>
                    </button>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
                      You can leave the workspace any time from settings.
                    </p>
                  </div>
                )}
              </div>
            </article>
          )}
        </div>
      </main>

      <footer className="relative z-10 px-6 sm:px-10 lg:px-14 py-6">
        <div className="hairline text-ink/20 mb-3" aria-hidden="true" />
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45 flex items-center justify-between gap-4">
          <span>&copy; {new Date().getFullYear()} Team Hub</span>
          <span className="hidden sm:inline">Crafted on paper <span className="text-ember">·</span> shipped to web</span>
        </p>
      </footer>
    </div>
  );
}

/* ──────────────────── helpers ──────────────────── */

function UnauthCTA({ next, email }) {
  return (
    <div className="mt-9 grid sm:grid-cols-2 gap-px bg-ink/15 border border-ink/15">
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="group bg-paper px-6 py-6 hover:bg-paper-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
      >
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span className="text-ember">01</span>&nbsp;Have an account?
        </p>
        <p className="mt-3 font-display italic text-2xl leading-tight text-ink">Sign in</p>
        <p className="mt-2 text-sm text-ink/65 leading-relaxed">
          Use the address <span className="text-ink/85">{email}</span> to redeem.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 text-ink group-hover:text-ember transition-colors">
          Continue <ArrowRight size={12} strokeWidth={2} />
        </span>
      </Link>
      <Link
        href={`/register?next=${encodeURIComponent(next)}`}
        className="group bg-paper px-6 py-6 hover:bg-paper-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
      >
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span className="text-ember">02</span>&nbsp;New here?
        </p>
        <p className="mt-3 font-display italic text-2xl leading-tight text-ink">Open an account</p>
        <p className="mt-2 text-sm text-ink/65 leading-relaxed">
          Takes about a minute. Use <span className="text-ink/85">{email}</span> as your sign-up email.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 text-ink group-hover:text-ember transition-colors">
          Continue <ArrowRight size={12} strokeWidth={2} />
        </span>
      </Link>
    </div>
  );
}

function Notice({ tone = "ok", icon: Icon, title, body, action }) {
  const styles = tone === "warn"
    ? "border-ember/40 bg-ember-50/40 text-ink"
    : "border-sage/40 bg-sage-100/30 text-ink";
  return (
    <div className={`mt-9 border ${styles} px-5 py-5 grid sm:grid-cols-[auto_1fr_auto] gap-5 items-center`}>
      <Icon size={22} strokeWidth={1.6} className={tone === "warn" ? "text-ember" : "text-sage"} />
      <div>
        <p className="font-display italic text-lg text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink/70 leading-relaxed">{body}</p>
      </div>
      {action}
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <article className="bg-paper border border-ember/40 relative">
      <span aria-hidden="true" className="absolute -top-px left-0 h-px w-24 bg-ember" />
      <div className="px-7 sm:px-12 py-12 text-center">
        <AlertOctagon size={28} strokeWidth={1.5} className="mx-auto text-ember" />
        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest2 text-ember">
          Invitation Unavailable
        </p>
        <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight text-ink">
          <span className="italic font-normal">Couldn't open the envelope.</span>
        </h1>
        <p className="mt-4 max-w-md mx-auto text-sm leading-relaxed text-ink/65">
          {message} If you believe this is a mistake, ask the workspace admin to issue a fresh invitation.
        </p>
        <Link
          href="/dashboard"
          className="mt-7 inline-flex items-center gap-2.5 bg-ink text-paper px-5 py-3 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest2">Back to dashboard</span>
          <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function PreviewSkeleton() {
  return (
    <div aria-hidden="true" className="bg-paper border border-ink/15 px-7 sm:px-12 py-10 sm:py-14">
      <div className="h-3 w-32 bg-ink/10 animate-pulse" />
      <div className="mt-6 h-12 w-3/4 bg-ink/10 animate-pulse" />
      <div className="mt-3 h-3 w-2/3 bg-ink/5 animate-pulse" />
      <div className="mt-9 hairline text-ink/15" />
      <div className="mt-7 grid grid-cols-2 gap-px bg-ink/10">
        <div className="bg-paper p-5">
          <div className="h-3 w-1/2 bg-ink/10 animate-pulse" />
          <div className="mt-3 h-4 w-2/3 bg-ink/10 animate-pulse" />
        </div>
        <div className="bg-paper p-5">
          <div className="h-3 w-1/2 bg-ink/10 animate-pulse" />
          <div className="mt-3 h-4 w-1/3 bg-ink/10 animate-pulse" />
        </div>
      </div>
      <div className="mt-9 h-12 bg-ink/10 animate-pulse" />
    </div>
  );
}

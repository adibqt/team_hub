"use client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { LogOut, Mail, Calendar, BadgeCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import AvatarUpload from "@/components/AvatarUpload";

function formatDate(d) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  }).format(new Date(d));
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await logout();
    toast.success("Signed out");
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <div className="relative max-w-3xl mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* ============================================================
          PAGE HEADER
         ============================================================ */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8 bg-ember" />
          <span>Personal Record · 02</span>
        </div>
        <h1 className="mt-5 font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-ink">
          <span className="font-light">Your</span>{" "}
          <span className="italic font-normal">profile<span className="text-ember">.</span></span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
          Personalize how you appear across your workspaces. Your name and
          photo travel with every comment, mention, and audit-log entry.
        </p>
        <div className="mt-8 hairline text-ink/20" aria-hidden="true" />
      </header>

      {/* ============================================================
          SECTION · PROFILE PHOTO
         ============================================================ */}
      <Section
        n="01"
        title="Profile photo"
        right="Visible to your teammates"
      >
        <AvatarUpload />
      </Section>

      {/* ============================================================
          SECTION · ACCOUNT DETAILS
         ============================================================ */}
      <Section
        n="02"
        title="Account details"
        right="Tied to your sign-in"
      >
        <p className="font-mono text-[11px] leading-relaxed text-ink/55 mb-5 max-w-prose">
          These details are tied to your sign-in and currently can't be
          changed from here. Reach out to a workspace admin to update them.
        </p>

        <dl className="border-t border-ink/15">
          <Row icon={BadgeCheck} label="Full name" value={user.name} />
          <Row icon={Mail}       label="Email"     value={user.email} mono />
          <Row icon={Calendar}   label="Member since" value={formatDate(user.createdAt)} />
        </dl>
      </Section>

      {/* ============================================================
          SECTION · SIGN OUT
         ============================================================ */}
      <Section
        n="03"
        title="Sign out"
        right="End of session"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <p className="text-sm leading-relaxed text-ink/65 max-w-md">
            You'll be returned to the sign-in page. We'll keep your data safe
            and waiting — nothing is dropped on the way out.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="group/out shrink-0 inline-flex items-center justify-between gap-3 bg-paper border border-ink/25 hover:border-ember hover:bg-ember-50/40 px-5 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55 group-hover/out:text-ember-700">
              Halt
            </span>
            <span className="text-sm font-medium text-ink group-hover/out:text-ember-700">
              Sign out
            </span>
            <LogOut
              size={15}
              strokeWidth={1.75}
              className="text-ink/55 group-hover/out:text-ember-700 transition-transform group-hover/out:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </div>
      </Section>

      <footer className="mt-16 pt-6 border-t border-ink/15">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
          <span>End of record <span className="text-ember">·</span> Page 02</span>
          <span className="hidden sm:inline tabular-nums">USR-{user.id?.slice(0, 8) || "—"}</span>
        </p>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Subcomponents
   ───────────────────────────────────────────── */

function Section({ n, title, right, children }) {
  return (
    <section className="mt-12 animate-fade-up">
      <div className="flex items-end justify-between gap-4 pb-4 border-b border-ink/15">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
            <span className="text-ember">§</span>&nbsp;Section&nbsp;
            <span className="text-ink/25">·</span>&nbsp;{n}
          </p>
          <h2 className="mt-1.5 font-display text-2xl lg:text-[1.7rem] tracking-tight text-ink">
            <span className="italic font-normal">{title}</span>
          </h2>
        </div>
        {right && (
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
            {right}
          </span>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, value, mono }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,9rem)_1fr] items-center gap-4 py-4 border-b border-ink/10">
      <span
        aria-hidden="true"
        className="grid place-items-center h-8 w-8 bg-ink/5 text-ink/55"
      >
        <Icon size={14} strokeWidth={1.75} />
      </span>
      <dt className="font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "font-mono text-[13px] text-ink truncate"
            : "text-sm font-medium text-ink truncate"
        }
      >
        {value || "—"}
      </dd>
    </div>
  );
}

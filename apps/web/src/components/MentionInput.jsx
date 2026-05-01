"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Avatar from "@/components/ui/Avatar";

const MENTION_MARKER = "\u2063";

/**
 * Plain-text input with `@`-mention autocomplete.
 *
 * We encode selected mentions with invisible ID markers in the textarea
 * value (`@Name⁣<id>⁣`) so mention identity is stable even if multiple
 * members share the same display name.
 */
export default function MentionInput({
  value,
  onChange,
  onMentionsChange,
  onSubmit,
  members = [],
  placeholder = "Write a comment…",
  disabled,
  maxLength = 1000,
  className,
}) {
  const taRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [anchor, setAnchor] = useState(null); // index of the `@` char being completed

  /* Match the partial token immediately after `@` at the caret. The `@`
     must follow a word boundary so emails like name@host don't trigger. */
  function refreshMentionState(text, caret) {
    const upToCaret = text.slice(0, caret);
    const match = upToCaret.match(/(^|\s)@([\w.\- ]{0,30})$/);
    if (!match) {
      setOpen(false);
      setAnchor(null);
      setQuery("");
      return;
    }
    const at = upToCaret.length - match[2].length - 1;
    setAnchor(at);
    setQuery(match[2].toLowerCase());
    setActiveIdx(0);
    setOpen(true);
  }

  function handleChange(e) {
    const next = e.target.value;
    onChange(next);
    onMentionsChange?.(resolveMentions(next));
    refreshMentionState(next, e.target.selectionStart);
  }

  function handleKeyDown(e) {
    if (open && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filtered[activeIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  }

  function insertMention(user) {
    if (!user || anchor == null) return;
    const ta = taRef.current;
    const caret = ta?.selectionEnd ?? value.length;
    const before = value.slice(0, anchor);
    const after = value.slice(caret);
    const inserted = `@${user.name}${mentionMarker(user.id)} `;
    const next = before + inserted + after;
    onChange(next);
    onMentionsChange?.(resolveMentions(next));
    setOpen(false);
    setAnchor(null);
    requestAnimationFrame(() => {
      const pos = (before + inserted).length;
      ta?.setSelectionRange(pos, pos);
      ta?.focus();
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim();
    const list = (members || [])
      .filter((m) => (q ? m.user.name.toLowerCase().includes(q) : true))
      .slice(0, 6);
    return list;
  }, [members, query]);

  // Keep the activeIdx in range when the filter shrinks
  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(0);
  }, [filtered.length, activeIdx]);

  return (
    <div className={clsx("relative", className)}>
      <textarea
        ref={taRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-label="Comment input with mentions"
        className="w-full resize-none border border-ink/20 bg-paper px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ember/40"
      />
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mention a teammate"
          className="absolute left-0 right-0 top-full mt-1 z-30 bg-paper border border-ink/15 shadow-xl max-h-60 overflow-y-auto"
        >
          {filtered.map((m, i) => {
            const active = i === activeIdx;
            return (
              <li key={m.userId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => {
                    // Prevent the textarea blur — otherwise the click loses focus.
                    e.preventDefault();
                    insertMention(m.user);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    active ? "bg-paper-100" : "hover:bg-paper-50"
                  )}
                >
                  <Avatar user={m.user} size="xs" />
                  <span className="text-[13px] text-ink truncate">{m.user.name}</span>
                  {m.role === "ADMIN" && (
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-widest2 text-ink/40">
                      admin
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Resolve mention IDs from invisible mention markers in text.
 */
export function resolveMentions(text) {
  if (!text) return [];
  const ids = new Set();
  const re = new RegExp(`${MENTION_MARKER}([^${MENTION_MARKER}\\s]+)${MENTION_MARKER}`, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) ids.add(m[1]);
  }
  return [...ids];
}

export function stripMentionMarkers(text = "") {
  if (!text) return "";
  const re = new RegExp(`${MENTION_MARKER}([^${MENTION_MARKER}\\s]+)${MENTION_MARKER}`, "g");
  return text.replace(re, "");
}

function mentionMarker(userId) {
  return `${MENTION_MARKER}${String(userId)}${MENTION_MARKER}`;
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Avatar from "@/components/ui/Avatar";

export default function MentionInput({
  value,
  onChange,
  onValueChange,
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
  const [mentionRanges, setMentionRanges] = useState([]);

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
    const nextRanges = remapMentionRanges(value, next, mentionRanges);
    const mentionIds = dedupeMentionIds(nextRanges);
    setMentionRanges(nextRanges);
    onValueChange?.({ text: next, mentions: mentionIds });
    onChange(next);
    onMentionsChange?.(mentionIds);
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
    const insertedLabel = `@${user.name}`;
    const inserted = `${insertedLabel} `;
    const next = before + inserted + after;
    const remapped = remapMentionRanges(value, next, mentionRanges);
    const start = before.length;
    const end = start + insertedLabel.length;
    const nextRanges = [...remapped, { start, end, userId: String(user.id), label: insertedLabel }];
    const mentionIds = dedupeMentionIds(nextRanges);
    setMentionRanges(nextRanges);
    onValueChange?.({ text: next, mentions: mentionIds });
    onChange(next);
    onMentionsChange?.(mentionIds);
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

  useEffect(() => {
    setMentionRanges([]);
  }, [members]);

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

function dedupeMentionIds(ranges) {
  if (!ranges?.length) return [];
  const ids = new Set();
  for (const r of ranges) {
    if (r?.userId) ids.add(r.userId);
  }
  return [...ids];
}

function remapMentionRanges(prevText, nextText, prevRanges) {
  if (!prevRanges?.length) return [];
  const prevLen = prevText.length;
  const nextLen = nextText.length;
  const prefix = commonPrefixLen(prevText, nextText);
  const suffix = commonSuffixLen(prevText, nextText, prefix);
  const prevEditedEnd = prevLen - suffix;
  const delta = nextLen - prevLen;
  const nextRanges = [];

  for (const r of prevRanges) {
    if (!r) continue;

    let start = r.start;
    let end = r.end;

    if (end <= prefix) {
      // unchanged
    } else if (start >= prevEditedEnd) {
      start += delta;
      end += delta;
    } else {
      // Edited across this mention: drop to avoid stale ID association.
      continue;
    }

    if (start < 0 || end > nextText.length || start >= end) continue;
    if (nextText.slice(start, end) !== r.label) continue;
    nextRanges.push({ ...r, start, end });
  }

  return nextRanges;
}

function commonPrefixLen(a, b) {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

function commonSuffixLen(a, b, prefixLen) {
  const max = Math.min(a.length - prefixLen, b.length - prefixLen);
  let i = 0;
  while (i < max && a[a.length - 1 - i] === b[b.length - 1 - i]) i += 1;
  return i;
}

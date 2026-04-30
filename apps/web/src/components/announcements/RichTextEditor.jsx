"use client";
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code as CodeIcon,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react";
import clsx from "clsx";

/**
 * Editorial rich-text editor.
 *
 * Renders a TipTap surface with a paper-styled toolbar that mirrors the
 * sanitisation allow-list on the server. Anything the toolbar can't
 * produce will be stripped on POST, so this is the source of truth for
 * "what an admin is allowed to publish".
 */
export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something the team should know\u2026",
  autoFocus = false,
  minHeight = 220,
  ariaLabel = "Announcement body",
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
    ],
    content: value || "",
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel,
        class: clsx(
          "rte-prose px-5 py-4 text-[15px] leading-relaxed text-ink outline-none",
          "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
          "[&_p.is-editor-empty:first-child]:before:text-ink/35",
          "[&_p.is-editor-empty:first-child]:before:float-left",
          "[&_p.is-editor-empty:first-child]:before:pointer-events-none",
          "[&_p.is-editor-empty:first-child]:before:h-0"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  // Keep external resets (e.g. modal "Cancel" -> reopen) in sync without
  // clobbering user input mid-edit.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next === current) return;
    if (next === "" && editor.isEmpty) return;
    editor.commands.setContent(next, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Set an attribute the empty-state CSS can hook off of for the placeholder.
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom;
    el.setAttribute("data-placeholder", placeholder);
  }, [editor, placeholder]);

  if (!editor) return null;

  return (
    <div className="border border-ink/15 bg-paper focus-within:border-ink/45 transition-colors">
      <Toolbar editor={editor} />
      <div
        className="border-t border-ink/10"
        style={{ minHeight }}
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   TOOLBAR
   ──────────────────────────────────────────────────────────────── */

function Toolbar({ editor }) {
  const groups = [
    [
      {
        icon: Heading2,
        label: "Heading 2",
        active: editor.isActive("heading", { level: 2 }),
        onClick: () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        icon: Heading3,
        label: "Heading 3",
        active: editor.isActive("heading", { level: 3 }),
        onClick: () =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      {
        icon: Bold,
        label: "Bold",
        shortcut: "\u2318B",
        active: editor.isActive("bold"),
        onClick: () => editor.chain().focus().toggleBold().run(),
      },
      {
        icon: Italic,
        label: "Italic",
        shortcut: "\u2318I",
        active: editor.isActive("italic"),
        onClick: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        icon: Strikethrough,
        label: "Strikethrough",
        active: editor.isActive("strike"),
        onClick: () => editor.chain().focus().toggleStrike().run(),
      },
      {
        icon: CodeIcon,
        label: "Inline code",
        active: editor.isActive("code"),
        onClick: () => editor.chain().focus().toggleCode().run(),
      },
    ],
    [
      {
        icon: List,
        label: "Bullet list",
        active: editor.isActive("bulletList"),
        onClick: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        icon: ListOrdered,
        label: "Numbered list",
        active: editor.isActive("orderedList"),
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        icon: Quote,
        label: "Quote",
        active: editor.isActive("blockquote"),
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        icon: Minus,
        label: "Divider",
        onClick: () => editor.chain().focus().setHorizontalRule().run(),
      },
    ],
    [
      {
        icon: Undo2,
        label: "Undo",
        disabled: !editor.can().undo(),
        onClick: () => editor.chain().focus().undo().run(),
      },
      {
        icon: Redo2,
        label: "Redo",
        disabled: !editor.can().redo(),
        onClick: () => editor.chain().focus().redo().run(),
      },
    ],
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 px-2 py-1.5 bg-paper-50">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {group.map(({ icon: Icon, label, shortcut, active, disabled, onClick }) => (
            <button
              key={label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClick}
              disabled={disabled}
              title={shortcut ? `${label} \u00b7 ${shortcut}` : label}
              aria-label={label}
              aria-pressed={!!active}
              className={clsx(
                "h-8 w-8 grid place-items-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember",
                active
                  ? "bg-ink text-paper"
                  : "text-ink/65 hover:bg-paper hover:text-ink",
                disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <Icon size={14} strokeWidth={1.75} />
            </button>
          ))}
          {gi < groups.length - 1 && (
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-ink/15" />
          )}
        </div>
      ))}
    </div>
  );
}

"use client";
import { useRef, useState } from "react";
import { Camera, Loader2, Upload, FileImage } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import Avatar from "@/components/ui/Avatar";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export default function AvatarUpload() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file) {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Please pick a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Max file size is 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/api/users/me/avatar", fd);
      setUser({ ...user, avatarUrl: data.avatarUrl });
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch gap-6">
      {/* Avatar block — square stamp with corner camera button */}
      <div className="relative shrink-0 self-start">
        <Avatar user={user} size="xl" className="ring-1 ring-ink/15" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change avatar"
          className={clsx(
            "absolute -bottom-2 -right-2 grid place-items-center h-9 w-9",
            "bg-ink text-paper hover:bg-ember transition-colors",
            "ring-2 ring-paper",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
            "disabled:opacity-70 disabled:cursor-not-allowed"
          )}
        >
          {uploading ? (
            <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <Camera size={15} strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Drop target — hairline border, ember on drag */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={clsx(
          "flex-1 cursor-pointer relative px-5 py-5 transition-colors",
          "border border-dashed",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          dragOver
            ? "border-ember bg-ember-50/40"
            : "border-ink/25 hover:border-ink/55 bg-paper-50/60 hover:bg-paper-100"
        )}
      >
        {/* corner mono caption */}
        <span className="absolute top-3 right-4 font-mono text-[10px] uppercase tracking-widest2 text-ink/40">
          Drop · Or browse
        </span>

        <div className="flex items-center gap-4 pr-24 sm:pr-0">
          <span
            className={clsx(
              "grid place-items-center h-11 w-11 shrink-0 transition-colors",
              dragOver
                ? "bg-ember text-paper"
                : "bg-ink/5 text-ink/55"
            )}
            aria-hidden="true"
          >
            {dragOver ? (
              <FileImage size={18} strokeWidth={1.75} />
            ) : (
              <Upload size={18} strokeWidth={1.75} />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-display italic text-lg leading-tight text-ink">
              {dragOver ? "Drop to upload" : "Click or drag a photo here"}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-ink/45">
              JPG · PNG · WebP <span className="text-ink/25">/</span> Max 5 MB
            </p>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => uploadFile(e.target.files?.[0])}
      />
    </div>
  );
}

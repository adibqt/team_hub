"use client";
import { useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
      <div className="relative shrink-0">
        <Avatar user={user} size="xl" className="ring-4 ring-white shadow-lg" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change avatar"
          className="absolute -bottom-1 -right-1 grid place-items-center h-9 w-9 rounded-full bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-md ring-4 ring-white hover:scale-105 transition-transform focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:opacity-70"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
          "flex-1 cursor-pointer rounded-xl border-2 border-dashed px-5 py-4 transition-all",
          "focus:outline-none focus:ring-2 focus:ring-brand-200",
          dragOver
            ? "border-brand-400 bg-brand-50"
            : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
        )}
      >
        <div className="flex items-center gap-3">
          <span className={clsx(
            "grid place-items-center h-10 w-10 rounded-lg shrink-0 transition-colors",
            dragOver ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"
          )}>
            <Upload size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">
              {dragOver ? "Drop to upload" : "Click or drag a photo here"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">JPG, PNG, or WebP — up to 5 MB</p>
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

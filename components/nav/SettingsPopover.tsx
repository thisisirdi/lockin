"use client";

import { useState } from "react";
import { getStoredApiKey, setStoredApiKey } from "@/lib/anthropic/key-vault";
import { toast } from "sonner";

export function SettingsPopover({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState(() => getStoredApiKey() ?? "");
  const hadKey = Boolean(getStoredApiKey());

  function save() {
    setStoredApiKey(key.trim() || null);
    toast.success(key.trim() ? "API key saved on this device" : "API key cleared");
    onClose();
  }

  return (
    <div
      className="absolute right-0 top-full mt-2.5 flex w-[300px] flex-col gap-2.5 rounded-[14px] border p-3.5"
      style={{
        background: "rgba(18,19,23,0.92)",
        backdropFilter: "blur(24px)",
        borderColor: "var(--edge-hi)",
        boxShadow: "0 20px 50px -12px rgba(0,0,0,0.8)",
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "var(--dim2)" }}>
        Anthropic API key
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: "var(--dim)" }}>
        {hadKey
          ? "Companion and Studio bill to your own key, stored only in this browser."
          : "Optional — without one, AI features bill to the app owner's account."}
      </p>
      <input
        type="password"
        autoComplete="off"
        placeholder="sk-ant-…"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="h-8 rounded-[9px] border bg-transparent px-2.5 text-[13px] outline-none placeholder:text-white/35"
        style={{ borderColor: "var(--edge-soft)" }}
      />
      <div className="flex gap-1.5">
        <button
          onClick={save}
          className="h-8 flex-1 rounded-[9px] bg-white/92 text-[12.5px] font-medium text-[#111214]"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="h-8 rounded-[9px] border px-3 text-[12.5px]"
          style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

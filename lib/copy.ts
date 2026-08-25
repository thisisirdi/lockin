import { toast } from "sonner";
import type { ClipboardSource } from "@/lib/types";

/** Copies to the OS clipboard and logs the action to in-app clipboard history. */
export async function copyWithHistory(content: string, source: ClipboardSource) {
  try {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Couldn't access clipboard");
    return;
  }

  fetch("/api/clipboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, source }),
  }).catch(() => {});
}

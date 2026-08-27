"use client";

import { useEffect } from "react";
import { OSWindow } from "@/components/os/Window";
import { useClipboardHistory } from "@/lib/hooks/use-clipboard";
import { Clipboard, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function ClipboardWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const { items, load, remove, clear } = useClipboardHistory();

  useEffect(() => {
    load();
  }, [load]);

  return (
    <OSWindow id="clipboard" icon={<Clipboard className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {items.slice(0, 12).map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-[11px] border p-2"
              style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.04)" }}
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[12px] leading-relaxed">{item.content}</p>
                <span className="text-[10.5px]" style={{ color: "var(--dim2)" }}>
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(item.content);
                    toast.success("Copied");
                  }}
                  className="text-white/50 hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(item.id)} className="text-white/50 hover:text-white">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-3 text-center text-[12.5px]" style={{ color: "var(--dim2)" }}>
              Nothing copied yet.
            </p>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="rounded-[9px] border py-1.5 text-[12px]"
            style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
          >
            Clear all
          </button>
        )}
      </div>
    </OSWindow>
  );
}

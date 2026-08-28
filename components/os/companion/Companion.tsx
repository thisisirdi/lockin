"use client";

import { OSWindow } from "@/components/os/Window";
import { useOSStore } from "@/lib/store/os";
import { useCompanionStore, type CompanionTab } from "@/lib/store/companion";
import { Sparkles, Blocks } from "lucide-react";
import { ChatTab } from "@/components/os/companion/tabs/ChatTab";
import { ReviewTab } from "@/components/os/companion/tabs/ReviewTab";

const TABS: { id: CompanionTab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "review", label: "Review" },
];

export function Companion({
  stageRef,
  stage,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>;
  stage: { width: number; height: number };
}) {
  const activeTab = useCompanionStore((s) => s.activeTab);
  const goTab = useCompanionStore((s) => s.goTab);
  const showWin = useOSStore((s) => s.show);

  return (
    <OSWindow
      id="ai"
      icon={<Sparkles className="h-[13px] w-[13px]" strokeWidth={1.9} style={{ color: "var(--accent)" }} />}
      stageRef={stageRef}
    >
      <div className="flex h-full flex-col">
        <div
          className="flex shrink-0 gap-0.5 overflow-x-auto px-2.5 pt-2"
          style={{ scrollbarWidth: "none" }}
        >
          {TABS.map((t) => {
            const on = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => goTab(t.id)}
                className="shrink-0 whitespace-nowrap rounded-t-[9px] px-[11px] py-1.5 text-[12.5px]"
                style={{
                  background: on ? "rgba(255,255,255,0.1)" : "transparent",
                  color: on ? "rgba(255,255,255,0.95)" : "var(--dim)",
                }}
              >
                {t.label}
              </button>
            );
          })}
          <button
            onClick={() => showWin("studio", stage)}
            title="Open the Studio window"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-[9px] px-[11px] py-1.5 text-[12.5px]"
            style={{ color: "var(--dim)" }}
          >
            <Blocks className="h-3 w-3" />
            Studio
          </button>
        </div>
        <div className="h-px shrink-0" style={{ background: "var(--edge-soft)" }} />

        <div className="flex min-h-0 flex-1 flex-col">
          {activeTab === "chat" && <ChatTab stage={stage} />}
          {activeTab === "review" && <ReviewTab />}
        </div>
      </div>
    </OSWindow>
  );
}

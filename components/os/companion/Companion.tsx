"use client";

import { OSWindow } from "@/components/os/Window";
import { useCompanionStore, type CompanionTab } from "@/lib/store/companion";
import { Sparkles } from "lucide-react";
import { ChatTab } from "@/components/os/companion/tabs/ChatTab";
import { PlanTab } from "@/components/os/companion/tabs/PlanTab";
import { BreakdownTab } from "@/components/os/companion/tabs/BreakdownTab";
import { ReviewTab } from "@/components/os/companion/tabs/ReviewTab";
import { AskNotesTab } from "@/components/os/companion/tabs/AskNotesTab";
import { RefineTab } from "@/components/os/companion/tabs/RefineTab";
import { UnstickTab } from "@/components/os/companion/tabs/UnstickTab";

const TABS: { id: CompanionTab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "plan", label: "Plan my day" },
  { id: "breakdown", label: "Break down" },
  { id: "review", label: "Review" },
  { id: "notes", label: "Ask notes" },
  { id: "refine", label: "Refine" },
  { id: "unstick", label: "Unstick" },
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
        </div>
        <div className="h-px shrink-0" style={{ background: "var(--edge-soft)" }} />

        <div className="flex min-h-0 flex-1 flex-col">
          {activeTab === "chat" && <ChatTab />}
          {activeTab === "plan" && <PlanTab stage={stage} />}
          {activeTab === "breakdown" && <BreakdownTab />}
          {activeTab === "review" && <ReviewTab />}
          {activeTab === "notes" && <AskNotesTab />}
          {activeTab === "refine" && <RefineTab />}
          {activeTab === "unstick" && <UnstickTab stage={stage} />}
        </div>
      </div>
    </OSWindow>
  );
}

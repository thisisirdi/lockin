"use client";

import { useEffect, useMemo, useState } from "react";
import { OSWindow } from "@/components/os/Window";
import { usePrompts } from "@/lib/hooks/use-prompts";
import { useFrameworks } from "@/lib/hooks/use-frameworks";
import { useOSStore } from "@/lib/store/os";
import { useStudioStore } from "@/lib/store/studio";
import { openPromptInStudio } from "@/lib/studio/open-in-studio";
import { copyWithHistory } from "@/lib/copy";
import { toast } from "sonner";
import { BookOpenText, Copy, Plus, Blocks, Archive, Search } from "lucide-react";

type SortMode = "recent" | "used";

export function PromptsWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const visible = useOSStore((s) => s.windows.prompts.visible);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("recent");
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { prompts, trackUsage, archivePrompt } = usePrompts(search, tagFilter, visible);
  const { frameworks } = useFrameworks(visible);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of prompts) for (const t of p.tags) set.add(t);
    return [...set].sort();
  }, [prompts]);

  const sorted = useMemo(() => {
    const list = [...prompts];
    if (sort === "used") list.sort((a, b) => b.usage_count - a.usage_count);
    return list;
  }, [prompts, sort]);

  function stage() {
    const r = stageRef.current?.getBoundingClientRect();
    return { width: r?.width ?? 1240, height: r?.height ?? 780 };
  }

  function newPrompt() {
    useStudioStore.getState().reset();
    useOSStore.getState().show("studio", stage());
  }

  async function openInStudio(id: string) {
    const prompt = prompts.find((p) => p.id === id);
    if (!prompt) return;
    setOpening(id);
    try {
      await openPromptInStudio(prompt, frameworks, stage());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open that prompt");
    } finally {
      setOpening(null);
    }
  }

  return (
    <OSWindow id="prompts" icon={<BookOpenText className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
        <button
          onClick={newPrompt}
          className="flex items-center justify-center gap-1.5 rounded-[9px] border py-[7px] text-[12.5px]"
          style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
        >
          <Plus className="h-3.5 w-3.5" /> New prompt
        </button>

        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: "var(--dim2)" }} />
            <input
              placeholder="Search…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-7 w-full rounded-[8px] border bg-transparent pl-6 pr-2 text-[12px] outline-none placeholder:text-white/35"
              style={{ borderColor: "var(--edge-soft)" }}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="h-7 shrink-0 rounded-[8px] border bg-transparent px-1.5 text-[11.5px] outline-none"
            style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
          >
            <option value="recent" className="bg-[#141518] text-white">Recent</option>
            <option value="used" className="bg-[#141518] text-white">Most used</option>
          </select>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter((cur) => (cur === t ? null : t))}
                className="rounded-full border px-2 py-0.5 text-[11px]"
                style={{
                  borderColor: "var(--edge-soft)",
                  background: tagFilter === t ? "rgba(255,255,255,0.14)" : "transparent",
                  color: tagFilter === t ? "#fff" : "var(--dim)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {sorted.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-1 rounded-[11px] border p-2.5"
              style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.045)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-[13px]">{p.title}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => openInStudio(p.id)}
                    disabled={opening === p.id}
                    title="Open in Studio"
                    className="text-white/50 hover:text-white disabled:opacity-40"
                  >
                    <Blocks className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      copyWithHistory(p.body, "prompt");
                      trackUsage(p.id);
                    }}
                    title="Copy"
                    className="text-white/50 hover:text-white"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => archivePrompt(p.id)}
                    title="Archive"
                    className="text-white/50 hover:text-white"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="line-clamp-2 text-[12px] leading-relaxed" style={{ color: "var(--dim)" }}>
                {p.description || p.body}
              </p>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--dim2)" }}>
                {p.usage_count > 0 && <span>used {p.usage_count}×</span>}
                {p.tags.map((t) => (
                  <span key={t}>#{t}</span>
                ))}
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="py-3 text-center text-[12.5px]" style={{ color: "var(--dim2)" }}>
              {search || tagFilter ? "No matching prompts." : "No saved prompts."}
            </p>
          )}
        </div>
      </div>
    </OSWindow>
  );
}

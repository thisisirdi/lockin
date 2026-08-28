"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OSWindow } from "@/components/os/Window";
import { useOSStore } from "@/lib/store/os";
import { useStudioStore } from "@/lib/store/studio";
import { useFrameworks } from "@/lib/hooks/use-frameworks";
import { usePromptVersions } from "@/lib/hooks/use-prompt-versions";
import { resolvePrompt } from "@/lib/studio/resolve";
import { streamRefineBlock } from "@/lib/studio/refine-stream";
import { BLOCK_LABELS, DELIVERABLE_TYPES } from "@/lib/studio/constants";
import { fetchJSON } from "@/lib/fetch-json";
import { copyWithHistory } from "@/lib/copy";
import type { Prompt, PromptVersion, DeliverableType } from "@/lib/types";
import { toast } from "sonner";
import {
  Blocks,
  Lock,
  Unlock,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Copy,
} from "lucide-react";

export function StudioWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const visible = useOSStore((s) => s.windows.studio.visible);
  const { frameworks } = useFrameworks(visible);

  const promptId = useStudioStore((s) => s.promptId);
  const title = useStudioStore((s) => s.title);
  const deliverableType = useStudioStore((s) => s.deliverableType);
  const framework = useStudioStore((s) => s.framework);
  const blocks = useStudioStore((s) => s.blocks);
  const variables = useStudioStore((s) => s.variables);
  const contextChips = useStudioStore((s) => s.contextChips);
  const setTitle = useStudioStore((s) => s.setTitle);
  const setDeliverableType = useStudioStore((s) => s.setDeliverableType);
  const setFramework = useStudioStore((s) => s.setFramework);
  const updateBlockBody = useStudioStore((s) => s.updateBlockBody);
  const lockBlock = useStudioStore((s) => s.lockBlock);
  const unlockBlock = useStudioStore((s) => s.unlockBlock);
  const removeContextChip = useStudioStore((s) => s.removeContextChip);
  const loadPrompt = useStudioStore((s) => s.loadPrompt);
  const reset = useStudioStore((s) => s.reset);

  const { versions } = usePromptVersions(promptId);
  const queryClient = useQueryClient();

  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  useEffect(() => {
    if (!framework && !promptId && frameworks.length > 0) {
      setFramework(frameworks.find((f) => f.key === "rtf") ?? frameworks[0]);
    }
  }, [framework, promptId, frameworks, setFramework]);

  const orderedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  const activeBlock = orderedBlocks.find((b) => b.state !== "locked") ?? null;
  const lockedCount = orderedBlocks.filter((b) => b.state === "locked").length;
  const totalSlots = framework?.slot_map.length ?? orderedBlocks.length;

  const resolved = resolvePrompt({
    blocks,
    variables,
    context: contextChips.map((c, i) => ({ name: c.label, body: c.text, position: i })),
  });

  function clearRefineState() {
    setRefinedText(null);
    setChangeNote(null);
    setSuggestions(null);
  }

  async function handleSuggest() {
    if (!activeBlock) return;
    setSuggesting(true);
    setSuggestions(null);
    try {
      const { candidates } = await fetchJSON<{ candidates: string[] }>("/api/studio/suggest-block", {
        method: "POST",
        body: JSON.stringify({
          blockType: activeBlock.block_type,
          deliverableType,
          lockedBlocks: orderedBlocks
            .filter((b) => b.state === "locked")
            .map((b) => ({ blockType: b.block_type, body: b.body })),
        }),
      });
      setSuggestions(candidates);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't get suggestions");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleLock() {
    if (!activeBlock || !activeBlock.body.trim()) return;
    setRefining(true);
    setRefinedText("");
    try {
      const result = await streamRefineBlock(
        {
          blockType: activeBlock.block_type,
          draft: activeBlock.body,
          deliverableType,
          lockedBlocks: orderedBlocks
            .filter((b) => b.state === "locked")
            .map((b) => ({ blockType: b.block_type, body: b.body })),
        },
        (textSoFar) => setRefinedText(textSoFar)
      );
      setRefinedText(result.refined);
      setChangeNote(result.changeNote || "Tightened the wording.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refinement failed");
      setRefinedText(null);
    } finally {
      setRefining(false);
    }
  }

  function acceptRefined() {
    if (!activeBlock || refinedText === null) return;
    lockBlock(activeBlock.block_type, refinedText);
    clearRefineState();
  }

  function keepDraft() {
    if (!activeBlock) return;
    lockBlock(activeBlock.block_type, activeBlock.body);
    clearRefineState();
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Give your prompt a title first");
      return;
    }
    setSaving(true);
    try {
      let id = promptId;
      if (!id) {
        const { prompt } = await fetchJSON<{ prompt: Prompt }>("/api/prompts", {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            deliverableType,
            frameworkId: framework?.id ?? null,
          }),
        });
        id = prompt.id;
      }
      const { version } = await fetchJSON<{ version: PromptVersion }>(
        `/api/prompts/${id}/versions`,
        { method: "POST", body: JSON.stringify({ blocks, variables }) }
      );
      loadPrompt({ promptId: id, title, deliverableType, framework, blocks, variables });
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["prompt-versions", id] });
      toast.success(`Saved v${version.version_no}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save this version");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OSWindow id="studio" icon={<Blocks className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 flex-col gap-1.5 border-b px-3.5 pb-2.5 pt-3" style={{ borderColor: "var(--edge-soft)" }}>
          <div className="flex items-center gap-1.5">
            <input
              placeholder="Untitled prompt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-7 flex-1 rounded-[8px] border bg-transparent px-2 text-[13px] outline-none placeholder:text-white/35"
              style={{ borderColor: "var(--edge-soft)" }}
            />
            <button
              onClick={() => {
                reset();
                clearRefineState();
              }}
              title="Start a new prompt"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[var(--dim)] hover:bg-white/[0.055] hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={deliverableType ?? ""}
              onChange={(e) => setDeliverableType((e.target.value || null) as DeliverableType | null)}
              className="h-7 flex-1 rounded-[8px] border bg-transparent px-1.5 text-[12px] outline-none"
              style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
            >
              <option value="">Deliverable type…</option>
              {DELIVERABLE_TYPES.map((d) => (
                <option key={d.value} value={d.value} className="bg-[#141518] text-white">
                  {d.label}
                </option>
              ))}
            </select>
            <select
              value={framework?.id ?? ""}
              onChange={(e) => {
                const fw = frameworks.find((f) => f.id === e.target.value);
                if (fw) setFramework(fw);
              }}
              className="h-7 flex-1 rounded-[8px] border bg-transparent px-1.5 text-[12px] outline-none"
              style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
            >
              {frameworks.map((f) => (
                <option key={f.id} value={f.id} className="bg-[#141518] text-white">
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {contextChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {contextChips.map((c, i) => (
                <span
                  key={i}
                  title={c.text}
                  className="flex items-center gap-1.5 rounded-[8px] border py-[3px] pl-2.5 pr-2 text-[11.5px] text-white/85"
                  style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.09)" }}
                >
                  {c.label}
                  <button onClick={() => removeContextChip(i)} className="text-[var(--dim2)] hover:text-white">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.13]">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${totalSlots > 0 ? (lockedCount / totalSlots) * 100 : 0}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
            <span className="shrink-0 text-[11px]" style={{ color: "var(--dim2)" }}>
              {lockedCount}/{totalSlots} locked
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 py-3">
          {orderedBlocks.map((block) => {
            const isActive = activeBlock?.id === block.id;
            const isLocked = block.state === "locked";

            if (isLocked) {
              return (
                <button
                  key={block.id}
                  onClick={() => {
                    unlockBlock(block.block_type);
                    clearRefineState();
                  }}
                  title="Click to unlock and edit"
                  className="group flex items-center justify-between gap-2 rounded-[10px] border px-2.5 py-2 text-left"
                  style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Lock className="h-3 w-3 shrink-0 group-hover:hidden" style={{ color: "var(--dim2)" }} />
                    <Unlock className="hidden h-3 w-3 shrink-0 group-hover:block" style={{ color: "var(--dim2)" }} />
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
                      {BLOCK_LABELS[block.block_type]}
                    </span>
                    <span className="truncate text-[12.5px]" style={{ color: "var(--dim)" }}>
                      {block.body}
                    </span>
                  </div>
                </button>
              );
            }

            if (!isActive) {
              return (
                <div
                  key={block.id}
                  className="flex items-center gap-2 rounded-[10px] border border-dashed px-2.5 py-2 opacity-45"
                  style={{ borderColor: "var(--edge-soft)" }}
                >
                  <span className="text-[11px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
                    {BLOCK_LABELS[block.block_type]}
                  </span>
                  <span className="text-[11.5px]" style={{ color: "var(--dim2)" }}>
                    up next
                  </span>
                </div>
              );
            }

            return (
              <div
                key={block.id}
                className="flex flex-col gap-2 rounded-[12px] border p-2.5"
                style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.045)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "var(--dim)" }}>
                    {BLOCK_LABELS[block.block_type]}
                  </span>
                  {block.framework_slot === null && (
                    <span className="text-[10.5px]" style={{ color: "var(--dim2)" }}>
                      Additional
                    </span>
                  )}
                </div>

                <textarea
                  value={block.body}
                  onChange={(e) => updateBlockBody(block.block_type, e.target.value)}
                  placeholder={`Write the ${BLOCK_LABELS[block.block_type].toLowerCase()}…`}
                  className="min-h-16 resize-none rounded-[9px] border bg-transparent p-2 text-[12.5px] leading-relaxed outline-none placeholder:text-white/35"
                  style={{ borderColor: "var(--edge-soft)" }}
                />

                {suggestions && (
                  <div className="flex flex-col gap-1">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          updateBlockBody(block.block_type, s);
                          setSuggestions(null);
                        }}
                        className="rounded-[8px] border px-2 py-1.5 text-left text-[12px] leading-relaxed"
                        style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {refinedText !== null ? (
                  <div className="flex flex-col gap-1.5 rounded-[9px] border p-2" style={{ borderColor: "var(--edge)" }}>
                    <span className="text-[10.5px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
                      Refined
                    </span>
                    <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">
                      {refinedText || (refining && "…")}
                    </p>
                    {changeNote && (
                      <p className="text-[11px] italic" style={{ color: "var(--dim2)" }}>
                        {changeNote}
                      </p>
                    )}
                    {!refining && (
                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          onClick={acceptRefined}
                          className="h-7 flex-1 rounded-[8px] bg-white/92 text-[12px] font-medium text-[#111214]"
                        >
                          Use refined
                        </button>
                        <button
                          onClick={keepDraft}
                          className="h-7 flex-1 rounded-[8px] border text-[12px]"
                          style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
                        >
                          Keep mine
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleSuggest}
                      disabled={suggesting}
                      className="flex h-7 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12px] disabled:opacity-50"
                      style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
                    >
                      {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Suggest
                    </button>
                    <button
                      onClick={handleLock}
                      disabled={refining || !block.body.trim()}
                      className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-white/92 text-[12px] font-medium text-[#111214] disabled:opacity-50"
                    >
                      {refining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
                      Lock &amp; refine
                    </button>
                    <button
                      onClick={() => lockBlock(block.block_type, block.body)}
                      disabled={!block.body.trim()}
                      title="Lock without refining"
                      className="h-7 shrink-0 rounded-[8px] border px-2 text-[12px] disabled:opacity-30"
                      style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
                    >
                      as-is
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {orderedBlocks.length === 0 && (
            <p className="py-4 text-center text-[12.5px]" style={{ color: "var(--dim2)" }}>
              Pick a framework above to start.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 border-t px-3.5 py-2.5" style={{ borderColor: "var(--edge-soft)" }}>
          <button
            onClick={() => setPreviewOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[11.5px]"
            style={{ color: "var(--dim)" }}
          >
            {previewOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Preview · ~{resolved.tokenEstimate} tokens
          </button>
          {previewOpen && (
            <div
              className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-[9px] border p-2 text-[12px] leading-relaxed"
              style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.04)", color: "var(--dim)" }}
            >
              {resolved.resolvedPrompt || "Nothing to preview yet."}
            </div>
          )}

          {versions.length > 0 && (
            <button
              onClick={() => setVersionsOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[11.5px]"
              style={{ color: "var(--dim)" }}
            >
              {versionsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {versions.length} version{versions.length === 1 ? "" : "s"}
            </button>
          )}
          {versionsOpen && (
            <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-[11.5px]" style={{ color: "var(--dim2)" }}>
                  <span>v{v.version_no}</span>
                  <span className="truncate px-2">{v.change_note ?? "—"}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1.5">
            <button
              onClick={() => {
                if (!resolved.resolvedPrompt) return;
                copyWithHistory(resolved.resolvedPrompt, "prompt");
              }}
              disabled={!resolved.resolvedPrompt}
              className="flex h-8 items-center gap-1.5 rounded-[9px] border px-3 text-[12.5px] disabled:opacity-40"
              style={{ borderColor: "var(--edge-soft)", color: "rgba(255,255,255,0.85)" }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || lockedCount === 0}
              className="h-8 flex-1 rounded-[9px] bg-white/92 text-[12.5px] font-medium text-[#111214] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save version"}
            </button>
          </div>
        </div>
      </div>
    </OSWindow>
  );
}

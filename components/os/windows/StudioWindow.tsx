"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OSWindow } from "@/components/os/Window";
import { useOSStore } from "@/lib/store/os";
import { useStudioStore } from "@/lib/store/studio";
import { useFrameworks } from "@/lib/hooks/use-frameworks";
import { usePromptVersions, fetchVersionDiff } from "@/lib/hooks/use-prompt-versions";
import { useContextBlocks } from "@/lib/hooks/use-context-blocks";
import { useRuns } from "@/lib/hooks/use-runs";
import { usePromptRuns, type PatchSuggestion } from "@/lib/hooks/use-prompt-runs";
import { resolvePrompt, estimateTokens } from "@/lib/studio/resolve";
import { streamRefineBlock } from "@/lib/studio/refine-stream";
import { patchBlock, type BlockDiffEntry } from "@/lib/studio/diff";
import { BLOCK_LABELS, DELIVERABLE_TYPES } from "@/lib/studio/constants";
import { fetchJSON } from "@/lib/fetch-json";
import { copyWithHistory } from "@/lib/copy";
import type { Prompt, PromptVersion, DeliverableType, ContextBlockKind } from "@/lib/types";
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
  ExternalLink,
  Star,
  GitCompare,
} from "lucide-react";

const CRITIQUE_TAGS: { tag: string; label: string }[] = [
  { tag: "too_long", label: "Too long" },
  { tag: "too_generic", label: "Too generic" },
  { tag: "wrong_audience", label: "Wrong audience" },
  { tag: "missed_constraint", label: "Missed a constraint" },
  { tag: "wrong_format", label: "Wrong format" },
  { tag: "invented_facts", label: "Invented facts" },
  { tag: "wrong_tone", label: "Wrong tone" },
];

const CONTEXT_TOKEN_BUDGET = 8000;

const CONTEXT_KINDS: { value: ContextBlockKind; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "product", label: "Product" },
  { value: "customer", label: "Customer" },
  { value: "stack", label: "Stack" },
  { value: "audience", label: "Audience" },
  { value: "voice", label: "Voice" },
  { value: "glossary", label: "Glossary" },
  { value: "snippet", label: "Snippet" },
];

const DEEP_LINKS = [
  { label: "ChatGPT", url: "https://chat.openai.com/" },
  { label: "Claude", url: "https://claude.ai/new" },
  { label: "Gemini", url: "https://gemini.google.com/app" },
];

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
  const attachedContextBlocks = useStudioStore((s) => s.attachedContextBlocks);
  const setTitle = useStudioStore((s) => s.setTitle);
  const setDeliverableType = useStudioStore((s) => s.setDeliverableType);
  const setFramework = useStudioStore((s) => s.setFramework);
  const updateBlockBody = useStudioStore((s) => s.updateBlockBody);
  const lockBlock = useStudioStore((s) => s.lockBlock);
  const unlockBlock = useStudioStore((s) => s.unlockBlock);
  const updateVariable = useStudioStore((s) => s.updateVariable);
  const removeContextChip = useStudioStore((s) => s.removeContextChip);
  const attachContextBlock = useStudioStore((s) => s.attachContextBlock);
  const detachContextBlock = useStudioStore((s) => s.detachContextBlock);
  const currentVersionId = useStudioStore((s) => s.currentVersionId);
  const markSaved = useStudioStore((s) => s.markSaved);
  const switchVersion = useStudioStore((s) => s.switchVersion);
  const setBlocksInStore = useStudioStore((s) => s.setBlocks);
  const reset = useStudioStore((s) => s.reset);

  const { versions, promoteVersion } = usePromptVersions(promptId);
  const { contextBlocks, createContextBlock } = useContextBlocks(visible);
  const { createRun, recordOutput } = useRuns();
  const { runs, rateRun, setCritiqueTags, requestPatch } = usePromptRuns(promptId);
  const queryClient = useQueryClient();

  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [addingContext, setAddingContext] = useState(false);
  const [newContextKind, setNewContextKind] = useState<ContextBlockKind>("snippet");
  const [newContextName, setNewContextName] = useState("");
  const [newContextBody, setNewContextBody] = useState("");
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [pastedOutput, setPastedOutput] = useState("");
  const [runsOpen, setRunsOpen] = useState(false);
  const [patchingRunId, setPatchingRunId] = useState<string | null>(null);
  const [activePatch, setActivePatch] = useState<(PatchSuggestion & { runId: string }) | null>(null);
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);
  const [diffEntries, setDiffEntries] = useState<BlockDiffEntry[] | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  useEffect(() => {
    if (!framework && !promptId && frameworks.length > 0) {
      setFramework(frameworks.find((f) => f.key === "rtf") ?? frameworks[0]);
    }
  }, [framework, promptId, frameworks, setFramework]);

  const orderedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  const activeBlock = orderedBlocks.find((b) => b.state !== "locked") ?? null;
  const lockedCount = orderedBlocks.filter((b) => b.state === "locked").length;
  const totalSlots = framework?.slot_map.length ?? orderedBlocks.length;

  const contextForResolve = useMemo(
    () => [
      ...attachedContextBlocks.map((c, i) => ({ name: c.name, body: c.body, position: i })),
      ...contextChips.map((c, i) => ({ name: c.label, body: c.text, position: attachedContextBlocks.length + i })),
    ],
    [attachedContextBlocks, contextChips]
  );

  const contextTokenTotal = useMemo(
    () => attachedContextBlocks.reduce((sum, c) => sum + (c.token_estimate || estimateTokens(c.body)), 0),
    [attachedContextBlocks]
  );

  // Falls back to the variable's last-used default until the user overrides it this session.
  const effectiveFillValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const v of variables) values[v.key] = fillValues[v.key] ?? v.default ?? "";
    return values;
  }, [variables, fillValues]);

  const resolved = resolvePrompt({
    blocks,
    variables,
    variableValues: effectiveFillValues,
    context: contextForResolve,
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
      markSaved(id, version.id);
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["prompt-versions", id] });
      setLastRunId(null);
      setPastedOutput("");
      toast.success(`Saved v${version.version_no}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save this version");
    } finally {
      setSaving(false);
    }
  }

  function rememberFillValues() {
    for (const v of variables) {
      const value = effectiveFillValues[v.key];
      if (value && value !== v.default) updateVariable(v.key, { default: value });
    }
  }

  async function handleCopy() {
    if (!resolved.resolvedPrompt) return;
    rememberFillValues();
    await copyWithHistory(resolved.resolvedPrompt, "prompt");
    await maybeStartRun();
  }

  async function handleOpenDeepLink(url: string) {
    if (!resolved.resolvedPrompt) return;
    rememberFillValues();
    await copyWithHistory(resolved.resolvedPrompt, "prompt");
    window.open(url, "_blank", "noopener,noreferrer");
    toast("Prompt copied — paste it in", { description: "Opened in a new tab." });
    await maybeStartRun();
  }

  async function maybeStartRun() {
    if (!currentVersionId) return;
    try {
      const run = await createRun(currentVersionId, resolved.resolvedPrompt, effectiveFillValues);
      setLastRunId(run.id);
    } catch {
      // Recording a run is a nice-to-have alongside copy — a failure here shouldn't block the copy itself.
    }
  }

  async function handleRecordOutput() {
    if (!lastRunId || !pastedOutput.trim()) return;
    try {
      await recordOutput(lastRunId, pastedOutput.trim());
      toast.success("Run saved");
      setPastedOutput("");
      setLastRunId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the run");
    }
  }

  async function handleCreateContextBlock() {
    if (!newContextName.trim()) return;
    try {
      const block = await createContextBlock(newContextKind, newContextName.trim(), newContextBody.trim());
      attachContextBlock(block);
      setNewContextName("");
      setNewContextBody("");
      setAddingContext(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create that context block");
    }
  }

  async function handleToggleCritiqueTag(runId: string, tag: string, currentTags: string[]) {
    const has = currentTags.includes(tag);
    const nextTags = has ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
    setCritiqueTags(runId, nextTags).catch(() =>
      toast.error("Couldn't save that tag")
    );
    if (has) {
      if (activePatch?.runId === runId) setActivePatch(null);
      return;
    }
    setPatchingRunId(runId);
    setActivePatch(null);
    try {
      const suggestion = await requestPatch(runId, tag);
      setActivePatch({ ...suggestion, runId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't propose a patch");
    } finally {
      setPatchingRunId(null);
    }
  }

  async function handleAcceptPatch() {
    if (!activePatch || !promptId) return;
    const newBlocks = patchBlock(blocks, activePatch.blockType, activePatch.after);
    setBlocksInStore(newBlocks);
    try {
      const { version } = await fetchJSON<{ version: PromptVersion }>(
        `/api/prompts/${promptId}/versions`,
        {
          method: "POST",
          body: JSON.stringify({
            blocks: newBlocks,
            variables,
            changeNote: `Patched ${BLOCK_LABELS[activePatch.blockType]} from run feedback`,
            createdFromRunId: activePatch.runId,
          }),
        }
      );
      markSaved(promptId, version.id);
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["prompt-versions", promptId] });
      toast.success(`Saved v${version.version_no}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the patched version");
    } finally {
      setActivePatch(null);
    }
  }

  async function handleToggleDiff(versionId: string) {
    if (diffVersionId === versionId) {
      setDiffVersionId(null);
      setDiffEntries(null);
      return;
    }
    if (!promptId || !currentVersionId) return;
    setDiffVersionId(versionId);
    setDiffEntries(null);
    try {
      const { entries } = await fetchVersionDiff(promptId, versionId, currentVersionId);
      setDiffEntries(entries);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load that diff");
      setDiffVersionId(null);
    }
  }

  async function handlePromote(versionId: string) {
    const target = versions.find((v) => v.id === versionId);
    if (!target) return;
    setPromotingId(versionId);
    try {
      await promoteVersion(versionId);
      switchVersion(versionId, target.blocks, target.variables);
      setDiffVersionId(null);
      setDiffEntries(null);
      toast.success("Promoted to current");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't promote that version");
    } finally {
      setPromotingId(null);
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

          {variables.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-[10px] border p-2.5" style={{ borderColor: "var(--edge-soft)" }}>
              <span className="text-[11px] uppercase tracking-[0.06em]" style={{ color: "var(--dim2)" }}>
                Variables
              </span>
              {variables.map((v) => (
                <div key={v.key} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-20 shrink-0 truncate font-mono text-[11.5px]" style={{ color: "var(--dim)" }}>
                      {"{{" + v.key + "}}"}
                    </span>
                    <select
                      value={v.type}
                      onChange={(e) => updateVariable(v.key, { type: e.target.value as typeof v.type })}
                      className="h-6.5 rounded-[6px] border bg-transparent px-1 text-[11px] outline-none"
                      style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
                    >
                      <option value="text" className="bg-[#141518] text-white">text</option>
                      <option value="number" className="bg-[#141518] text-white">number</option>
                      <option value="boolean" className="bg-[#141518] text-white">yes/no</option>
                    </select>
                    <label className="flex shrink-0 items-center gap-1 text-[11px]" style={{ color: "var(--dim2)" }}>
                      <input
                        type="checkbox"
                        checked={v.required}
                        onChange={(e) => updateVariable(v.key, { required: e.target.checked })}
                      />
                      required
                    </label>
                  </div>
                  {v.type === "boolean" ? (
                    <select
                      value={effectiveFillValues[v.key] ?? ""}
                      onChange={(e) => setFillValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                      className="h-7 rounded-[7px] border bg-transparent px-2 text-[12px] outline-none"
                      style={{ borderColor: "var(--edge-soft)" }}
                    >
                      <option value="" className="bg-[#141518] text-white">—</option>
                      <option value="yes" className="bg-[#141518] text-white">yes</option>
                      <option value="no" className="bg-[#141518] text-white">no</option>
                    </select>
                  ) : (
                    <input
                      type={v.type === "number" ? "number" : "text"}
                      placeholder={v.label}
                      value={effectiveFillValues[v.key] ?? ""}
                      onChange={(e) => setFillValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                      className="h-7 rounded-[7px] border bg-transparent px-2 text-[12px] outline-none placeholder:text-white/35"
                      style={{ borderColor: "var(--edge-soft)" }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5 rounded-[10px] border p-2.5" style={{ borderColor: "var(--edge-soft)" }}>
            <button
              onClick={() => setContextOpen((v) => !v)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.06em]" style={{ color: "var(--dim2)" }}>
                {contextOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Context · {attachedContextBlocks.length} attached
              </span>
              <span
                className="text-[11px]"
                style={{ color: contextTokenTotal > CONTEXT_TOKEN_BUDGET ? "oklch(0.75 0.15 30)" : "var(--dim2)" }}
              >
                ~{contextTokenTotal} tokens
              </span>
            </button>

            {contextOpen && (
              <div className="flex flex-col gap-2 pt-1">
                {contextTokenTotal > CONTEXT_TOKEN_BUDGET && (
                  <p className="text-[11px]" style={{ color: "oklch(0.75 0.15 30)" }}>
                    Attached context is over the {CONTEXT_TOKEN_BUDGET.toLocaleString()}-token budget — consider detaching something.
                  </p>
                )}

                {attachedContextBlocks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {attachedContextBlocks.map((c) => (
                      <span
                        key={c.id}
                        title={c.body}
                        className="flex items-center gap-1.5 rounded-[8px] border py-[3px] pl-2.5 pr-2 text-[11.5px] text-white/85"
                        style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.09)" }}
                      >
                        {c.name}
                        <button onClick={() => detachContextBlock(c.id)} className="text-[var(--dim2)] hover:text-white">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex max-h-28 flex-col gap-0.5 overflow-y-auto">
                  {contextBlocks
                    .filter((c) => !attachedContextBlocks.some((a) => a.id === c.id))
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => attachContextBlock(c)}
                        className="flex items-center justify-between rounded-[7px] px-2 py-1.5 text-left text-[12px] hover:bg-white/[0.06]"
                        style={{ color: "var(--dim)" }}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="shrink-0 text-[10.5px]" style={{ color: "var(--dim2)" }}>
                          {c.kind}
                        </span>
                      </button>
                    ))}
                  {contextBlocks.length === 0 && !addingContext && (
                    <p className="py-1 text-[11.5px]" style={{ color: "var(--dim2)" }}>
                      No saved context yet.
                    </p>
                  )}
                </div>

                {addingContext ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-1.5">
                      <select
                        value={newContextKind}
                        onChange={(e) => setNewContextKind(e.target.value as ContextBlockKind)}
                        className="h-7 rounded-[7px] border bg-transparent px-1.5 text-[12px] outline-none"
                        style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
                      >
                        {CONTEXT_KINDS.map((k) => (
                          <option key={k.value} value={k.value} className="bg-[#141518] text-white">
                            {k.label}
                          </option>
                        ))}
                      </select>
                      <input
                        autoFocus
                        placeholder="Name"
                        value={newContextName}
                        onChange={(e) => setNewContextName(e.target.value)}
                        className="h-7 flex-1 rounded-[7px] border bg-transparent px-2 text-[12px] outline-none placeholder:text-white/35"
                        style={{ borderColor: "var(--edge-soft)" }}
                      />
                    </div>
                    <textarea
                      placeholder="What should Studio know?"
                      value={newContextBody}
                      onChange={(e) => setNewContextBody(e.target.value)}
                      className="min-h-14 resize-none rounded-[7px] border bg-transparent p-2 text-[12px] outline-none placeholder:text-white/35"
                      style={{ borderColor: "var(--edge-soft)" }}
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleCreateContextBlock}
                        disabled={!newContextName.trim()}
                        className="h-7 flex-1 rounded-[7px] bg-white/92 text-[12px] font-medium text-[#111214] disabled:opacity-50"
                      >
                        Save &amp; attach
                      </button>
                      <button
                        onClick={() => setAddingContext(false)}
                        className="h-7 rounded-[7px] border px-2.5 text-[12px]"
                        style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingContext(true)}
                    className="flex items-center justify-center gap-1.5 rounded-[7px] border py-1.5 text-[12px]"
                    style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
                  >
                    <Plus className="h-3 w-3" /> New context block
                  </button>
                )}
              </div>
            )}
          </div>
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
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {versions.map((v) => {
                const isCurrent = v.id === currentVersionId;
                return (
                  <div key={v.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-[11.5px]" style={{ color: "var(--dim2)" }}>
                      <span className="shrink-0" style={{ color: isCurrent ? "var(--accent)" : "var(--dim2)" }}>
                        v{v.version_no}{isCurrent && " · current"}
                      </span>
                      <span className="min-w-0 flex-1 truncate px-2">{v.change_note ?? "—"}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        {!isCurrent && currentVersionId && (
                          <button onClick={() => handleToggleDiff(v.id)} title="Diff vs current" className="hover:text-white">
                            <GitCompare className="h-3 w-3" />
                          </button>
                        )}
                        {!isCurrent && (
                          <button
                            onClick={() => handlePromote(v.id)}
                            disabled={promotingId === v.id}
                            className="rounded-[6px] border px-1.5 py-0.5 text-[10.5px] disabled:opacity-50"
                            style={{ borderColor: "var(--edge-soft)" }}
                          >
                            Promote
                          </button>
                        )}
                      </div>
                    </div>
                    {diffVersionId === v.id && (
                      <div className="flex flex-col gap-1 rounded-[8px] border p-2" style={{ borderColor: "var(--edge-soft)" }}>
                        {diffEntries === null ? (
                          <span className="text-[11px]" style={{ color: "var(--dim2)" }}>Loading…</span>
                        ) : diffEntries.every((e) => !e.changed) ? (
                          <span className="text-[11px]" style={{ color: "var(--dim2)" }}>No block differences.</span>
                        ) : (
                          diffEntries
                            .filter((e) => e.changed)
                            .map((e) => (
                              <div key={e.blockType} className="flex flex-col gap-0.5">
                                <span className="text-[10.5px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
                                  {BLOCK_LABELS[e.blockType]}
                                </span>
                                <p className="text-[11.5px] line-through" style={{ color: "oklch(0.7 0.14 25)" }}>
                                  {e.before ?? "—"}
                                </p>
                                <p className="text-[11.5px]" style={{ color: "oklch(0.75 0.14 145)" }}>
                                  {e.after ?? "—"}
                                </p>
                              </div>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {promptId && (
            <button
              onClick={() => setRunsOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[11.5px]"
              style={{ color: "var(--dim)" }}
            >
              {runsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {runs.length} run{runs.length === 1 ? "" : "s"}
            </button>
          )}
          {runsOpen && (
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
              {runs.map((r) => (
                <div key={r.id} className="flex flex-col gap-1.5 rounded-[9px] border p-2" style={{ borderColor: "var(--edge-soft)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px]" style={{ color: "var(--dim2)" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => rateRun(r.id, n)}>
                          <Star
                            className="h-3 w-3"
                            fill={(r.rating ?? 0) >= n ? "var(--accent)" : "none"}
                            style={{ color: "var(--accent)" }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  {r.output && (
                    <p className="line-clamp-2 text-[11.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
                      {r.output}
                    </p>
                  )}
                  {r.output && (
                    <div className="flex flex-wrap gap-1">
                      {CRITIQUE_TAGS.map((c) => {
                        const on = r.critique_tags.includes(c.tag);
                        return (
                          <button
                            key={c.tag}
                            onClick={() => handleToggleCritiqueTag(r.id, c.tag, r.critique_tags)}
                            disabled={patchingRunId === r.id}
                            className="rounded-full border px-2 py-0.5 text-[10.5px] disabled:opacity-50"
                            style={{
                              borderColor: "var(--edge-soft)",
                              background: on ? "rgba(255,255,255,0.14)" : "transparent",
                              color: on ? "#fff" : "var(--dim2)",
                            }}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {patchingRunId === r.id && (
                    <span className="text-[11px]" style={{ color: "var(--dim2)" }}>
                      Proposing a patch…
                    </span>
                  )}
                  {activePatch?.runId === r.id && (
                    <div className="flex flex-col gap-1 rounded-[8px] border p-2" style={{ borderColor: "var(--edge)" }}>
                      <span className="text-[10.5px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
                        {BLOCK_LABELS[activePatch.blockType]} — proposed patch
                      </span>
                      <p className="text-[11.5px] line-through" style={{ color: "oklch(0.7 0.14 25)" }}>
                        {activePatch.before}
                      </p>
                      <p className="text-[11.5px]" style={{ color: "oklch(0.75 0.14 145)" }}>
                        {activePatch.after}
                      </p>
                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          onClick={handleAcceptPatch}
                          className="h-6.5 flex-1 rounded-[7px] bg-white/92 text-[11.5px] font-medium text-[#111214]"
                        >
                          Accept — save as new version
                        </button>
                        <button
                          onClick={() => setActivePatch(null)}
                          className="h-6.5 rounded-[7px] border px-2 text-[11.5px]"
                          style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {runs.length === 0 && (
                <p className="text-[11.5px]" style={{ color: "var(--dim2)" }}>
                  No runs yet — copy or open a deep link to start one.
                </p>
              )}
            </div>
          )}

          {lastRunId && (
            <div className="flex gap-1.5">
              <input
                placeholder="Paste the output here to save this run…"
                value={pastedOutput}
                onChange={(e) => setPastedOutput(e.target.value)}
                className="h-8 flex-1 rounded-[9px] border bg-transparent px-2.5 text-[12px] outline-none placeholder:text-white/35"
                style={{ borderColor: "var(--edge-soft)" }}
              />
              <button
                onClick={handleRecordOutput}
                disabled={!pastedOutput.trim()}
                className="h-8 shrink-0 rounded-[9px] border px-3 text-[12px] disabled:opacity-40"
                style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
              >
                Save run
              </button>
            </div>
          )}

          <div className="flex gap-1.5">
            <button
              onClick={handleCopy}
              disabled={!resolved.resolvedPrompt}
              title="Copy resolved prompt"
              className="flex h-8 items-center gap-1.5 rounded-[9px] border px-3 text-[12.5px] disabled:opacity-40"
              style={{ borderColor: "var(--edge-soft)", color: "rgba(255,255,255,0.85)" }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            {DEEP_LINKS.map((d) => (
              <button
                key={d.label}
                onClick={() => handleOpenDeepLink(d.url)}
                disabled={!resolved.resolvedPrompt}
                title={`Copy and open ${d.label}`}
                className="flex h-8 items-center gap-1 rounded-[9px] border px-2.5 text-[12px] disabled:opacity-40"
                style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
              >
                {d.label}
                <ExternalLink className="h-3 w-3" />
              </button>
            ))}
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

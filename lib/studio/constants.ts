import type { BlockType, DeliverableType } from "@/lib/types";

export const BLOCK_LABELS: Record<BlockType, string> = {
  role: "Role",
  context: "Context",
  task: "Task",
  constraints: "Constraints",
  format: "Format",
  examples: "Examples",
  guardrails: "Guardrails",
};

export const DELIVERABLE_TYPES: { value: DeliverableType; label: string }[] = [
  { value: "discovery", label: "Discovery summary" },
  { value: "runbook", label: "Integration runbook" },
  { value: "troubleshooting", label: "Troubleshooting guide" },
  { value: "onboarding", label: "Onboarding plan" },
  { value: "qbr", label: "QBR narrative" },
  { value: "enablement", label: "Enablement material" },
  { value: "comms", label: "Comms / announcement" },
  { value: "analysis", label: "Analysis" },
  { value: "other", label: "Other" },
];

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { useTimerStore } from "@/lib/store/timer";
import { fetchJSON } from "@/lib/fetch-json";
import type { PomodoroSettings } from "@/lib/types";
import { toast } from "sonner";

const FIELDS: { key: keyof PomodoroSettings; label: string }[] = [
  { key: "work_minutes", label: "Work (min)" },
  { key: "short_break_minutes", label: "Short break (min)" },
  { key: "long_break_minutes", label: "Long break (min)" },
  { key: "cycles_before_long_break", label: "Cycles before long break" },
];

export function PomodoroSettingsDialog() {
  const pomodoroSettings = useTimerStore((s) => s.pomodoroSettings);
  const setPomodoroSettings = useTimerStore((s) => s.setPomodoroSettings);
  const [draft, setDraft] = useState(pomodoroSettings);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setPomodoroSettings(draft);
    try {
      await fetchJSON("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ pomodoroSettings: draft }),
      });
    } catch {
      // Local state already updated; server sync failing isn't fatal for v1.
    } finally {
      setSaving(false);
      setOpen(false);
      toast.success("Pomodoro settings saved");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(pomodoroSettings);
      }}
    >
      <DialogTrigger
        render={<Button variant="ghost" size="icon" aria-label="Pomodoro settings" />}
      >
        <Settings2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pomodoro settings</DialogTitle>
          <DialogDescription>
            Configure work/break durations and cycles.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                min={1}
                value={draft[key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [key]: Number(e.target.value) || 1 }))
                }
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

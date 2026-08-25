"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClipboardHistory } from "@/lib/hooks/use-clipboard";
import { Clipboard, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const SOURCE_LABEL: Record<string, string> = {
  note: "Note",
  prompt: "Prompt",
  task: "Task",
  manual: "Manual",
};

export function ClipboardSheet() {
  const { items, loading, refresh, remove, clear } = useClipboardHistory();

  return (
    <Sheet onOpenChange={(open) => open && refresh()}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label="Clipboard history" />}
      >
        <Clipboard className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Clipboard history</SheetTitle>
          <SheetDescription>
            Last 50 things you&apos;ve copied inside LockIn — notes, prompts, task titles.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {!loading && items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing copied yet. Use any Copy button around the app.
              </p>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-start gap-2 rounded-md border border-border p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {SOURCE_LABEL[item.source] ?? item.source}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-foreground/90">
                    {item.content}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(item.content);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {items.length > 0 && (
          <SheetFooter>
            <Button variant="outline" size="sm" onClick={clear}>
              Clear all
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

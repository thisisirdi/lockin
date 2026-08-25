"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { fetchJSON } from "@/lib/fetch-json";
import { extractYouTubeId } from "@/lib/youtube";
import type { RoomSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Volume2 } from "lucide-react";

const THEMES = [
  { id: "lofi", label: "Lofi", className: "from-indigo-500/30 via-purple-500/20 to-slate-900" },
  { id: "ghibli", label: "Ghibli", className: "from-emerald-500/30 via-sky-500/20 to-slate-900" },
  { id: "rain", label: "Rain", className: "from-slate-600/40 via-slate-700/30 to-slate-900" },
] as const;

export default function RoomPage() {
  const [settings, setSettings] = useState<RoomSettings | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetchJSON<{ profile: { room_settings: RoomSettings } }>("/api/profile").then(
      ({ profile }) => {
        setSettings(profile.room_settings);
        setUrlInput(profile.room_settings.youtube_url ?? "");
      }
    );
  }, []);

  function persist(next: RoomSettings) {
    setSettings(next);
    fetchJSON("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ roomSettings: next }),
    }).catch(() => toast.error("Couldn't save room settings"));
  }

  function setVolume(volume: number) {
    if (!settings) return;
    persist({ ...settings, volume });
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "setVolume", args: [volume] }),
      "*"
    );
  }

  if (!settings) return null;

  const videoId = settings.youtube_url ? extractYouTubeId(settings.youtube_url) : null;
  const theme = THEMES.find((t) => t.id === settings.theme) ?? THEMES[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">My Room</h1>

      <Card className="overflow-hidden">
        <div
          className={cn(
            "flex h-48 items-center justify-center bg-gradient-to-br",
            !videoId && theme.className
          )}
        >
          {videoId ? (
            <iframe
              ref={iframeRef}
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0`}
              title="Ambient background"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <span className="text-sm text-white/70">{theme.label} ambience</span>
          )}
        </div>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <Button
                  key={t.id}
                  variant={settings.theme === t.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => persist({ ...settings, theme: t.id })}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtube-url">Custom YouTube URL</Label>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                persist({ ...settings, youtube_url: urlInput || null });
              }}
            >
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Button type="submit" variant="secondary">
                Set
              </Button>
            </form>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Volume2 className="h-4 w-4" /> Volume
            </Label>
            <Slider
              value={[settings.volume]}
              max={100}
              step={5}
              onValueChange={(val) => setVolume(Array.isArray(val) ? val[0] : val)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { fetchJSON } from "@/lib/fetch-json";
import { extractYouTubeId } from "@/lib/youtube";
import { ROOM_BACKGROUNDS, getRoomBackground } from "@/lib/room-backgrounds";
import type { RoomSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Volume2, Check } from "lucide-react";

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
  const background = getRoomBackground(settings.theme) ?? ROOM_BACKGROUNDS[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">My Room</h1>

      <Card className="overflow-hidden">
        <div className="relative flex h-56 items-center justify-center bg-muted">
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
            <>
              <Image
                src={`/room-backgrounds/${background.file}`}
                alt={background.label}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
              />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                {background.label}
              </span>
            </>
          )}
        </div>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>Background</Label>
            <div className="grid grid-cols-5 gap-2">
              {ROOM_BACKGROUNDS.map((bg) => {
                const active = settings.theme === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    title={bg.label}
                    onClick={() => persist({ ...settings, theme: bg.id })}
                    className={cn(
                      "relative aspect-video overflow-hidden rounded-md ring-offset-2 ring-offset-background transition-all",
                      active ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"
                    )}
                  >
                    <Image
                      src={`/room-backgrounds/${bg.file}`}
                      alt={bg.label}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                    {active && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
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
            <p className="text-xs text-muted-foreground">
              Overrides the background above while set. Clear the field and hit Set to
              go back to your chosen photo.
            </p>
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

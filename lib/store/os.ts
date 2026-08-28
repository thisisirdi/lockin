import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  WINDOW_IDS,
  LAYOUTS,
  REFERENCE_STAGE,
  type WindowId,
  type WindowState,
  type WindowGeometry,
  type LayoutWinSpec,
} from "@/lib/os/types";
import { findFreeSpot as findFreeSpotAmong } from "@/lib/os/layout";

const DEFAULT_GEOMETRY: WindowGeometry = { x: 40, y: 40, w: 300, h: null };

function initialWindows(): Record<WindowId, WindowState> {
  const out = {} as Record<WindowId, WindowState>;
  for (const id of WINDOW_IDS) {
    out[id] = { geometry: { ...DEFAULT_GEOMETRY }, visible: false, minimized: false, z: 1 };
  }
  return out;
}

function fitFactor(stageW: number, stageH: number) {
  return Math.max(0.6, Math.min(1, stageW / REFERENCE_STAGE.width, stageH / REFERENCE_STAGE.height));
}

/** First free spot for `id`'s window among the other currently-visible windows. */
function findFreeSpot(
  windows: Record<WindowId, WindowState>,
  selfId: WindowId,
  size: { w: number; h: number },
  stage: { width: number; height: number }
): { x: number; y: number } {
  const occupied = Object.entries(windows)
    .filter(([wid, w]) => wid !== selfId && w.visible)
    .map(([, w]) => ({ x: w.geometry.x, y: w.geometry.y, w: w.geometry.w, h: w.geometry.h ?? 200 }));
  return findFreeSpotAmong(occupied, size, stage);
}

interface OSState {
  windows: Record<WindowId, WindowState>;
  layout: string;
  layoutName: string;
  savedLayouts: Record<string, { name: string; wins: Partial<Record<WindowId, LayoutWinSpec>> }>;
  topZ: number;
  accent: string;
  glassOpacity: number;
  blur: number;
  font: string;
  wallpaper: string;
  /** True while any window is being dragged or resized — drives the grid overlay. */
  interacting: boolean;

  focus: (id: WindowId) => void;
  setInteracting: (interacting: boolean) => void;
  show: (id: WindowId, stage: { width: number; height: number }) => void;
  hide: (id: WindowId, minimized?: boolean) => void;
  toggle: (id: WindowId, stage: { width: number; height: number }) => void;
  commitGeometry: (id: WindowId, geometry: Partial<WindowGeometry>) => void;
  applyLayout: (key: string, stage: { width: number; height: number }) => void;
  saveCurrentLayout: () => string;
  setFont: (font: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setAccent: (accent: string) => void;
}

export const useOSStore = create<OSState>()(
  persist(
    (set, get) => ({
      windows: initialWindows(),
      layout: "home",
      layoutName: "Everything",
      savedLayouts: {},
      topZ: 20,
      accent: "oklch(0.82 0.09 78)",
      glassOpacity: 0.44,
      blur: 30,
      font: "'IBM Plex Sans JP', system-ui, sans-serif",
      wallpaper: "tokyo-neon-rain-street",
      interacting: false,

      setInteracting: (interacting) => set({ interacting }),

      focus: (id) => {
        const z = get().topZ + 1;
        set((s) => ({
          topZ: z,
          windows: { ...s.windows, [id]: { ...s.windows[id], z } },
        }));
      },

      show: (id, stage) => {
        const w = get().windows[id];
        const spot = findFreeSpot(get().windows, id, { w: w.geometry.w, h: w.geometry.h ?? 200 }, stage);
        set((s) => ({
          windows: {
            ...s.windows,
            [id]: {
              ...w,
              visible: true,
              minimized: false,
              geometry: { ...w.geometry, x: spot.x, y: spot.y },
            },
          },
        }));
        get().focus(id);
      },

      hide: (id, minimized = false) => {
        set((s) => ({
          windows: { ...s.windows, [id]: { ...s.windows[id], visible: false, minimized } },
        }));
      },

      toggle: (id, stage) => {
        const w = get().windows[id];
        if (w.visible) get().hide(id, true);
        else get().show(id, stage);
      },

      commitGeometry: (id, geometry) => {
        set((s) => ({
          windows: {
            ...s.windows,
            [id]: { ...s.windows[id], geometry: { ...s.windows[id].geometry, ...geometry } },
          },
        }));
      },

      applyLayout: (key, stage) => {
        const def = key.startsWith("saved:")
          ? get().savedLayouts[key]
          : LAYOUTS[key];
        if (!def) return;

        const compact = stage.width < 1160 || stage.height < 720;
        const f = compact ? 1 : fitFactor(stage.width, stage.height);

        const next: Record<WindowId, WindowState> = { ...get().windows };
        let z = get().topZ;

        for (const id of WINDOW_IDS) {
          const spec = def.wins[id];
          if (spec === undefined) continue;
          if (spec === null) {
            next[id] = { ...next[id], visible: false, minimized: false };
            continue;
          }
          if (spec === "min") {
            next[id] = { ...next[id], visible: false, minimized: true };
            continue;
          }
          const [x0, y0, w0, h0, align] = spec;
          const width = w0 ? Math.max(212, Math.round(w0 * Math.max(f, 0.85))) : next[id].geometry.w;
          const height = h0 ? Math.round(h0 * Math.max(f, 0.85)) : null;
          let x = x0 == null ? 0 : Math.round(x0 * f);
          const y = Math.round(y0 * f);
          if (align === "center") x = (stage.width - width) / 2;
          if (align === "right") x = stage.width - width - Math.round(32 * f);
          x = Math.max(12, Math.min(x, stage.width - width - 12));
          z += 1;
          next[id] = {
            geometry: { x, y: Math.max(8, Math.min(y, stage.height - 120)), w: width, h: height },
            visible: true,
            minimized: false,
            z,
          };
        }

        set({ windows: next, layout: key, layoutName: def.name, topZ: z });
      },

      saveCurrentLayout: () => {
        const { windows, savedLayouts } = get();
        const key = `saved:${Date.now()}`;
        const wins: Partial<Record<WindowId, LayoutWinSpec>> = {};
        for (const id of WINDOW_IDS) {
          const w = windows[id];
          wins[id] = w.visible
            ? [w.geometry.x, w.geometry.y, w.geometry.w, w.geometry.h]
            : w.minimized
              ? "min"
              : null;
        }
        const name = `Saved ${Object.keys(savedLayouts).length + 1}`;
        set({ savedLayouts: { ...savedLayouts, [key]: { name, wins } } });
        return key;
      },

      setFont: (font) => set({ font }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
      setAccent: (accent) => set({ accent }),
    }),
    {
      name: "lockin-os",
      partialize: (s) => ({
        windows: s.windows,
        layout: s.layout,
        layoutName: s.layoutName,
        savedLayouts: s.savedLayouts,
        topZ: s.topZ,
        accent: s.accent,
        glassOpacity: s.glassOpacity,
        blur: s.blur,
        font: s.font,
        wallpaper: s.wallpaper,
      }),
      // A persisted blob predating a new WINDOW_IDS entry (e.g. "studio") won't
      // have that key. persist's default merge shallow-replaces `windows`
      // wholesale, leaving it undefined for the new id — fill gaps from the
      // fresh default state instead of trusting the persisted shape.
      merge: (persisted, current) => {
        const p = persisted as Partial<OSState> | undefined;
        return {
          ...current,
          ...p,
          windows: { ...current.windows, ...(p?.windows ?? {}) },
        };
      },
    }
  )
);

export const WINDOW_IDS = [
  "clock",
  "timer",
  "freedom",
  "ai",
  "ambient",
  "tasks",
  "notes",
  "prompts",
  "clipboard",
  "studio",
] as const;

export type WindowId = (typeof WINDOW_IDS)[number];

export interface WindowGeometry {
  x: number;
  y: number;
  w: number;
  h: number | null;
}

export interface WindowState {
  geometry: WindowGeometry;
  visible: boolean;
  minimized: boolean;
  z: number;
}

export interface WindowMeta {
  id: WindowId;
  label: string;
}

export const WINDOW_META: Record<WindowId, WindowMeta> = {
  clock: { id: "clock", label: "Clock" },
  timer: { id: "timer", label: "Timer" },
  freedom: { id: "freedom", label: "Freedom Goal" },
  ai: { id: "ai", label: "Companion" },
  ambient: { id: "ambient", label: "Ambient" },
  tasks: { id: "tasks", label: "Tasks" },
  notes: { id: "notes", label: "Notes" },
  prompts: { id: "prompts", label: "Prompts" },
  clipboard: { id: "clipboard", label: "Clipboard" },
  studio: { id: "studio", label: "Studio" },
};

/** [x, y, width, height|null, align?] in the 1240x780 reference stage. */
export type LayoutWinSpec =
  | [number | null, number, number, number | null]
  | [number | null, number, number, number | null, "center" | "right"]
  | "min"
  | null;

export interface LayoutDef {
  name: string;
  wins: Partial<Record<WindowId, LayoutWinSpec>>;
}

export const LAYOUTS: Record<string, LayoutDef> = {
  home: {
    name: "Everything",
    wins: {
      clock: [28, 24, 236, null],
      timer: [28, 158, 300, null],
      freedom: [28, 452, 300, null],
      ai: [356, 24, 520, 588],
      ambient: [904, 24, 284, null],
      tasks: null,
      notes: null,
      prompts: null,
      clipboard: null,
      studio: null,
    },
  },
  deep: {
    name: "Deep work",
    wins: {
      timer: [null, 150, 420, null, "center"],
      ambient: [null, 470, 420, null, "center"],
      clock: null,
      freedom: null,
      ai: null,
      tasks: null,
      notes: null,
      prompts: null,
      clipboard: null,
      studio: null,
    },
  },
  writing: {
    name: "Writing",
    wins: {
      notes: [80, 40, 700, 600],
      timer: "min",
      clock: [null, 40, 236, null, "right"],
      freedom: null,
      ai: null,
      tasks: null,
      prompts: null,
      ambient: "min",
      clipboard: null,
      studio: null,
    },
  },
  planning: {
    name: "Planning",
    wins: {
      tasks: [32, 32, 340, 420],
      ai: [396, 32, 520, 588],
      freedom: [32, 476, 340, null],
      clock: null,
      timer: "min",
      ambient: null,
      notes: null,
      prompts: null,
      clipboard: null,
      studio: null,
    },
  },
  studio: {
    name: "Studio",
    wins: {
      studio: [32, 28, 600, 640],
      prompts: [648, 28, 280, 300],
      notes: [648, 344, 280, 300],
      ai: [944, 28, 264, 640],
      timer: "min",
      clock: null,
      freedom: null,
      ambient: null,
      tasks: null,
      clipboard: null,
    },
  },
};

export const REFERENCE_STAGE = { width: 1240, height: 780 };

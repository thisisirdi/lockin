export interface RoomBackground {
  id: string;
  label: string;
  file: string;
}

export const ROOM_BACKGROUNDS: RoomBackground[] = [
  { id: "tokyo-neon-rain-street", label: "Neon rain, Tokyo", file: "tokyo-neon-rain-street.jpg" },
  { id: "torii-lake-hakone", label: "Torii, Lake Hakone", file: "torii-lake-hakone.jpg" },
  { id: "torii-foggy-forest-night", label: "Torii, foggy forest", file: "torii-foggy-forest-night.jpg" },
  { id: "mount-fuji-night-lake", label: "Fuji at dusk", file: "mount-fuji-night-lake.jpg" },
  { id: "cherry-blossom-lantern-street", label: "Blossom & lantern", file: "cherry-blossom-lantern-street.jpg" },
  { id: "cherry-blossom-city-night", label: "Blossom canopy, night", file: "cherry-blossom-city-night.jpg" },
  { id: "zen-rock-garden", label: "Zen garden, autumn", file: "zen-rock-garden.jpg" },
  { id: "koi-pond-garden", label: "Koi pond", file: "koi-pond-garden.jpg" },
  { id: "bamboo-forest", label: "Bamboo grove", file: "bamboo-forest.jpg" },
  { id: "rainy-window-desk", label: "Rain on the window", file: "rainy-window-desk.jpg" },
];

export function getRoomBackground(id: string | null): RoomBackground | null {
  return ROOM_BACKGROUNDS.find((bg) => bg.id === id) ?? null;
}

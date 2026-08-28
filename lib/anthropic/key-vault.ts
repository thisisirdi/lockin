"use client";

import { ANTHROPIC_KEY_HEADER } from "@/lib/anthropic/constants";

const STORAGE_KEY = "lockin.anthropic_key";

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredApiKey(key: string | null) {
  if (typeof window === "undefined") return;
  if (key && key.trim()) localStorage.setItem(STORAGE_KEY, key.trim());
  else localStorage.removeItem(STORAGE_KEY);
}

export { ANTHROPIC_KEY_HEADER };

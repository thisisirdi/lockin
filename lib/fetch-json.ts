import { getStoredApiKey, ANTHROPIC_KEY_HEADER } from "@/lib/anthropic/key-vault";

export async function fetchJSON<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const apiKey = getStoredApiKey();
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { [ANTHROPIC_KEY_HEADER]: apiKey } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `Request to ${input} failed (${res.status})`);
  }
  return data as T;
}

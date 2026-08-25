export async function fetchJSON<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `Request to ${input} failed (${res.status})`);
  }
  return data as T;
}

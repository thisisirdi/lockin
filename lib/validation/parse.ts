import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export async function parseJSON<T>(
  request: Request,
  schema: ZodType<T>
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: NextResponse }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: result.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}

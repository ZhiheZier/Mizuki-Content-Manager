import type { APIRoute } from "astro";
import { appendAppLog } from "../../lib/logs";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const input = await request.json();
    appendAppLog(String(input.message || ""));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
};

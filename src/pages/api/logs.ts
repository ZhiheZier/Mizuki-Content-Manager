import type { APIRoute } from "astro";
import { appendAppLog, listAppLogs, readAppLog } from "../../lib/logs";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const dates = listAppLogs();
    const date = url.searchParams.get("date") || dates[0] || new Date().toISOString().slice(0, 10);
    return Response.json({ ok: true, dates, date, content: readAppLog(date) }, { headers: {"Cache-Control": "no-store"} });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
};

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

import type { APIRoute } from "astro";
import { stopPreview } from "../../../lib/preview";
import { resolveProject } from "../../../lib/source";
import { redactCredentials } from "../../../lib/logs";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const input = await request.json();
    return Response.json(await stopPreview(resolveProject(input.project)));
  } catch (error) {
    return Response.json({ ok: false, error: redactCredentials(error instanceof Error ? error.message : String(error)) }, { status: 400 });
  }
};

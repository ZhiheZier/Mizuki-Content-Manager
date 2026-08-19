import type { APIRoute } from "astro";
import { readContentFile } from "../../../lib/files";
import { resolveProject } from "../../../lib/source";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const input = await request.json();
    const project = resolveProject(input.project);
    return Response.json({
      ok: true,
      file: readContentFile(project, input.path)
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
};

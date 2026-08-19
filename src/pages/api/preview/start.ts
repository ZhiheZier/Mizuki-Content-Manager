import type { APIRoute } from "astro";
import { startPreview } from "../../../lib/preview";
import { DEFAULT_DEV_COMMAND, resolveProject } from "../../../lib/source";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const input = await request.json();
  const project = resolveProject(input.project);
  return Response.json(await startPreview(project, input.command || DEFAULT_DEV_COMMAND));
};

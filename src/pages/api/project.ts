import type { APIRoute } from "astro";
import { projectSummary, resolveProject } from "../../lib/source";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const input = await request.json();
  const project = resolveProject(input);
  return Response.json({
    ok: true,
    project,
    summary: projectSummary(project)
  });
};

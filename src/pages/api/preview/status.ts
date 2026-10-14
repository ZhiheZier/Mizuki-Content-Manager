import type { APIRoute } from "astro";
import { checkPreviewStatus } from "../../../lib/preview";
import { resolveProject } from "../../../lib/source";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const input = await request.json();
  const project = resolveProject(input.project);
  return Response.json(await checkPreviewStatus(project, typeof input.previewUrl === "string" ? input.previewUrl : ""));
};

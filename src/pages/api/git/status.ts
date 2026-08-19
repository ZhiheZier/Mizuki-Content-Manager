import type { APIRoute } from "astro";
import { readGitStatus } from "../../../lib/git";
import { resolveProject } from "../../../lib/source";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const input = await request.json();
  const project = resolveProject(input.project || input);
  return Response.json({
    ok: true,
    status: await readGitStatus(project)
  });
};

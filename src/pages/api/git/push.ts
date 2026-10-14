import type { APIRoute } from "astro";
import { commitAndPushContent } from "../../../lib/git";
import { resolveProject } from "../../../lib/source";
import { redactCredentials } from "../../../lib/logs";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const input = await request.json();
    const project = resolveProject(input.project || input);
    return Response.json(await commitAndPushContent(project));
  } catch (error) {
    return Response.json(
      { ok: false, message: redactCredentials(error instanceof Error ? error.message : String(error)) },
      { status: 400 }
    );
  }
};

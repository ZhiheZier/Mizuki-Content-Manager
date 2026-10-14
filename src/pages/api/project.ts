import type { APIRoute } from "astro";
import { looksLikeMizukiRepo, projectSummary, resolveProject } from "../../lib/source";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const input = await request.json();
  if (typeof input.codeRoot !== "string" || !input.codeRoot.trim()) {
    return Response.json({ ok: false, error: "请填写代码仓库路径。" }, { status: 400 });
  }
  const project = resolveProject(input);
  if (!looksLikeMizukiRepo(project.codeRoot)) {
    return Response.json({ ok: false, error: "该目录不是有效的 Mizuki / Astro 代码仓库。" }, { status: 400 });
  }
  return Response.json({
    ok: true,
    project,
    summary: projectSummary(project)
  });
};

import type { APIRoute } from "astro";
import { Buffer } from "node:buffer";
import { writeDiaryImage } from "../../../lib/album-assets";
import { resolveProject } from "../../../lib/source";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const project = resolveProject(JSON.parse(String(form.get("project") || "{}")));
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    const paths: string[] = [];

    for (const file of files) {
      paths.push(writeDiaryImage(project, file.name, Buffer.from(await file.arrayBuffer())));
    }

    return Response.json({ ok: true, paths });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
};

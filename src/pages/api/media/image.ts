import type { APIRoute } from "astro";
import { Buffer } from "node:buffer";
import { deletePublicImage, writeImageToFolder } from "../../../lib/album-assets";
import { resolveProject } from "../../../lib/source";

export const prerender = false;

function mediaFolder(value: unknown): "device" | "anime" | "posts" | "projects" {
  if (value === "device" || value === "anime" || value === "posts" || value === "projects") return value;
  throw new Error("Unsupported image folder.");
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const project = resolveProject(JSON.parse(String(form.get("project") || "{}")));
      const folder = mediaFolder(form.get("folder"));
      const file = form.getAll("files").find((value): value is File => value instanceof File);
      if (!file) throw new Error("Missing image file.");
      const path = writeImageToFolder(project, folder, file.name, Buffer.from(await file.arrayBuffer()));
      return Response.json({ ok: true, path });
    }

    const input = await request.json();
    const project = resolveProject(input.project);
    if (input.action === "delete") {
      deletePublicImage(project, String(input.path || ""));
      return Response.json({ ok: true });
    }

    throw new Error("Unsupported action.");
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
};

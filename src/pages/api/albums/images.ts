import type { APIRoute } from "astro";
import { Buffer } from "node:buffer";
import { deleteAlbumImage, listAlbumImages, writeAlbumImage } from "../../../lib/album-assets";
import { resolveProject } from "../../../lib/source";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const project = resolveProject(JSON.parse(String(form.get("project") || "{}")));
      const album = String(form.get("album") || "");
      const files = form.getAll("files").filter((value): value is File => value instanceof File);
      for (const file of files) {
        writeAlbumImage(project, album, file.name, Buffer.from(await file.arrayBuffer()));
      }
      return Response.json({ ok: true, images: listAlbumImages(project, album) });
    }

    const input = await request.json();
    const project = resolveProject(input.project);
    const album = typeof input.album === "string" ? input.album : "";

    if (input.action === "delete") {
      deleteAlbumImage(project, album, String(input.name || ""));
      return Response.json({ ok: true, images: listAlbumImages(project, album) });
    }

    return Response.json({ ok: true, images: listAlbumImages(project, album) });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
};

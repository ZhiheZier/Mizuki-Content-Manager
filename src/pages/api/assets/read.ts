import type { APIRoute } from "astro";
import { readAppConfig } from "../../../lib/app-config";
import { readAsset } from "../../../lib/album-assets";
import { resolveProject } from "../../../lib/source";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const codeRoot = url.searchParams.get("codeRoot") || readAppConfig().codeRoot || "";
    const path = url.searchParams.get("path") || "";
    const project = resolveProject({ codeRoot });
    const asset = readAsset(project, path);
    return new Response(asset.buffer, {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
};

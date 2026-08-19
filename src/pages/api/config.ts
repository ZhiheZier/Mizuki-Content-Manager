import type { APIRoute } from "astro";
import { readAppConfig, writeAppConfig } from "../../lib/app-config";

export const prerender = false;

export const GET: APIRoute = async () => {
  return Response.json({
    ok: true,
    config: readAppConfig()
  });
};

export const POST: APIRoute = async ({ request }) => {
  const input = await request.json();
  const codeRoot = typeof input.codeRoot === "string" ? input.codeRoot.trim() : "";

  return Response.json({
    ok: true,
    config: writeAppConfig({ codeRoot })
  });
};

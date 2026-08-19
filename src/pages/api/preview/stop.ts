import type { APIRoute } from "astro";
import { stopPreview } from "../../../lib/preview";

export const prerender = false;

export const POST: APIRoute = async () => {
  return Response.json(await stopPreview());
};

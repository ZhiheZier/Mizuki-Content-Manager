import type { APIRoute } from "astro";
import { listRecords, readRecord, saveRecord, type RecordType } from "../../lib/records";
import { resolveProject } from "../../lib/source";

export const prerender = false;

function getType(value: unknown): RecordType {
  if (
    value === "about" ||
    value === "diary" ||
    value === "friends" ||
    value === "blog" ||
    value === "projects" ||
    value === "timeline" ||
    value === "skills" ||
    value === "devices" ||
    value === "aiTools" ||
    value === "anime" ||
    value === "albums"
  ) return value;
  throw new Error("未知分类");
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const input = await request.json();
    const project = resolveProject(input.project);
    const type = getType(input.type);

    if (input.action === "read") {
      return Response.json({ ok: true, record: readRecord(project, type, input.id) });
    }
    if (input.action === "save") {
      saveRecord(project, type, input.item || {}, input.id);
      return Response.json({ ok: true, ...listRecords(project, type) });
    }
    return Response.json({ ok: true, ...listRecords(project, type) });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
};

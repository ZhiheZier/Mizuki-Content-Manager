import fs from "node:fs";
import path from "node:path";

export type ContentMode = "integrated" | "separated";

export interface ProjectConfigInput {
  codeRoot: string;
  contentRootOverride?: string;
  contentMode?: ContentMode;
  previewUrl?: string;
}

export interface ResolvedProject {
  codeRoot: string;
  contentMode: ContentMode;
  contentRoot: string;
  previewUrl: string;
  dataDir: string;
  postsDir: string;
  specDir: string;
  imagesDir: string;
  contentDirName: string;
  contentRepoUrl: string;
}

export const DEFAULT_PREVIEW_URL = "http://localhost:4321";
export const DEFAULT_DEV_COMMAND = "pnpm dev";

export function normalizePath(value = "") {
  return path.resolve(value.trim().replace(/^["']|["']$/g, ""));
}

function readEnv(codeRoot: string) {
  const envPath = path.join(codeRoot, ".env");
  const values = new Map<string, string>();
  if (!fs.existsSync(envPath)) return values;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    values.set(key.trim(), rest.join("=").trim().replace(/^["']|["']$/g, ""));
  }
  return values;
}

export function readContentDirFromEnv(codeRoot: string) {
  return readEnv(codeRoot).get("CONTENT_DIR") || "content";
}

export function sanitizeRepoUrl(value: string) {
  if (!value) return "";

  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return value.replace(/^(https?:\/\/)[^/@]+@/i, "$1");
  }
}

export function readContentRepoUrlFromEnv(codeRoot: string) {
  return sanitizeRepoUrl(readEnv(codeRoot).get("CONTENT_REPO_URL") || "");
}

export function isContentSyncEnabled(codeRoot: string) {
  return readEnv(codeRoot).get("ENABLE_CONTENT_SYNC")?.toLowerCase() === "true";
}

export function detectContentMode(codeRoot: string): ContentMode {
  return isContentSyncEnabled(codeRoot) ? "separated" : "integrated";
}

export function resolveContentRoot(input: ProjectConfigInput) {
  const codeRoot = normalizePath(input.codeRoot || ".");
  const override = input.contentRootOverride?.trim();
  const contentMode = input.contentMode || detectContentMode(codeRoot);

  if (contentMode === "integrated") return codeRoot;
  if (override) return normalizePath(override);

  const contentDir = readContentDirFromEnv(codeRoot);
  return path.isAbsolute(contentDir) ? normalizePath(contentDir) : path.join(codeRoot, contentDir);
}

export function resolveProject(input: ProjectConfigInput): ResolvedProject {
  const codeRoot = normalizePath(input.codeRoot || ".");
  const contentMode = input.contentMode || detectContentMode(codeRoot);
  const contentRoot = resolveContentRoot({ ...input, codeRoot, contentMode });
  const contentDirName = contentMode === "separated" ? readContentDirFromEnv(codeRoot) : "";
  const contentRepoUrl = contentMode === "separated" ? readContentRepoUrlFromEnv(codeRoot) : "";

  if (contentMode === "integrated") {
    return {
      codeRoot,
      contentMode,
      contentRoot,
      previewUrl: input.previewUrl?.trim() || DEFAULT_PREVIEW_URL,
      dataDir: path.join(codeRoot, "src", "data"),
      postsDir: path.join(codeRoot, "src", "content", "posts"),
      specDir: path.join(codeRoot, "src", "content", "spec"),
      imagesDir: path.join(codeRoot, "public", "images"),
      contentDirName,
      contentRepoUrl
    };
  }

  return {
    codeRoot,
    contentMode,
    contentRoot,
    previewUrl: input.previewUrl?.trim() || DEFAULT_PREVIEW_URL,
    dataDir: path.join(contentRoot, "data"),
    postsDir: path.join(contentRoot, "posts"),
    specDir: path.join(contentRoot, "spec"),
    imagesDir: path.join(contentRoot, "images"),
    contentDirName,
    contentRepoUrl
  };
}

export function looksLikeMizukiRepo(codeRoot: string) {
  if (!codeRoot || !fs.existsSync(codeRoot)) return false;
  return (
    fs.existsSync(path.join(codeRoot, "package.json")) &&
    fs.existsSync(path.join(codeRoot, "src")) &&
    (fs.existsSync(path.join(codeRoot, "astro.config.mjs")) ||
      fs.existsSync(path.join(codeRoot, "astro.config.ts")))
  );
}

export function projectSummary(project: ResolvedProject) {
  const modeLabel = project.contentMode === "separated" ? "内容分离" : "不分离内容";
  const lines = [`内容模式: ${modeLabel}`];

  if (project.contentMode === "separated") {
    lines.push(`内容仓库: ${project.contentRepoUrl || "未在 .env 中设置 CONTENT_REPO_URL"}`);
    lines.push(`内容目录: ${project.contentDirName || "content"}`);
  }

  const checks = [
    ["代码仓库", project.codeRoot],
    ["内容目录", project.contentRoot],
    ["数据目录", project.dataDir],
    ["文章目录", project.postsDir],
    ["页面目录", project.specDir],
    ["图片目录", project.imagesDir]
  ];

  return lines
    .concat(checks.map(([label, target]) => `${label}: ${target} (${fs.existsSync(target) ? "存在" : "不存在"})`))
    .join("\n");
}

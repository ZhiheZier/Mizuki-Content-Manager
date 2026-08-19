import fs from "node:fs";
import path from "node:path";
import type { ResolvedProject } from "./source";

export interface FileNode {
  label: string;
  path: string;
  kind: "file" | "dir";
  editable?: boolean;
  children?: FileNode[];
}

const EDITABLE_EXTENSIONS = new Set([".md", ".mdx", ".ts", ".json"]);
const ASSET_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const IGNORED_NAMES = new Set([".git", ".astro", "node_modules"]);
const ALBUMS_ROOT_README = "images/albums/readme.md";

function relativeFrom(root: string, target: string) {
  return path.relative(root, target).replaceAll(path.sep, "/");
}

function assertInside(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes the configured content root.");
  }
}

function listDir(root: string, dir: string, depth = 0): FileNode[] {
  if (!fs.existsSync(dir) || depth > 8) return [];

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !IGNORED_NAMES.has(entry.name))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

  const nodes: FileNode[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const children = listDir(root, full, depth + 1);
      nodes.push({ label: entry.name, path: relativeFrom(root, full), kind: "dir", children });
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    const relativePath = relativeFrom(root, full);
    if (relativePath.toLowerCase() === ALBUMS_ROOT_README) continue;
    if (EDITABLE_EXTENSIONS.has(ext) || ASSET_EXTENSIONS.has(ext)) {
      nodes.push({
        label: entry.name,
        path: relativePath,
        kind: "file",
        editable: EDITABLE_EXTENSIONS.has(ext)
      });
    }
  }
  return nodes;
}

export function listEditableFiles(project: ResolvedProject) {
  const roots = [
    ["data", project.dataDir],
    ["posts", project.postsDir],
    ["spec", project.specDir],
    ["images", project.imagesDir]
  ];

  return roots.map(([label, dir]) => ({
    label,
    path: label,
    kind: "dir" as const,
    children: listDir(project.contentRoot, dir)
  }));
}

export function readContentFile(project: ResolvedProject, relativePath: string) {
  const full = path.join(project.contentRoot, relativePath);
  assertInside(project.contentRoot, full);
  if (!fs.existsSync(full)) throw new Error("File does not exist.");
  return {
    path: relativePath,
    content: fs.readFileSync(full, "utf8"),
    updatedAt: fs.statSync(full).mtimeMs
  };
}

export function saveContentFile(project: ResolvedProject, relativePath: string, content: string) {
  const full = path.join(project.contentRoot, relativePath);
  assertInside(project.contentRoot, full);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  return {
    path: relativePath,
    updatedAt: fs.statSync(full).mtimeMs
  };
}

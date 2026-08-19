import fs from "node:fs";
import path from "node:path";
import type { ResolvedProject } from "./source";

export interface AlbumImage {
  name: string;
  path: string;
  size: number;
  updatedAt: number;
  isCover: boolean;
}

const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

function assertInside(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes the configured content root.");
  }
}

function albumDir(project: ResolvedProject, album: string) {
  const full = path.join(project.imagesDir, "albums", album);
  assertInside(project.imagesDir, full);
  return full;
}

function isImageFile(name: string) {
  return IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase());
}

export function listAlbumImages(project: ResolvedProject, album: string): AlbumImage[] {
  const dir = albumDir(project, album);
  if (!album || !fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) => {
      const full = path.join(dir, entry.name);
      const stats = fs.statSync(full);
      return {
        name: entry.name,
        path: path.relative(project.contentRoot, full).replaceAll(path.sep, "/"),
        size: stats.size,
        updatedAt: stats.mtimeMs,
        isCover: path.parse(entry.name).name.toLowerCase() === "cover"
      };
    })
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.name.localeCompare(b.name));
}

export function deleteAlbumImage(project: ResolvedProject, album: string, imageName: string) {
  if (!imageName || !isImageFile(imageName)) throw new Error("Only album image files can be deleted.");
  const full = path.join(albumDir(project, album), imageName);
  assertInside(project.imagesDir, full);
  if (!fs.existsSync(full)) throw new Error("Image does not exist.");
  fs.unlinkSync(full);
}

export function writeAlbumImage(project: ResolvedProject, album: string, fileName: string, data: Buffer) {
  if (!album.trim()) throw new Error("Missing album directory.");
  const safeName = path.basename(fileName).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim();
  if (!safeName || !isImageFile(safeName)) throw new Error("Only image files can be uploaded.");

  const dir = albumDir(project, album);
  fs.mkdirSync(dir, { recursive: true });

  const parsed = path.parse(safeName);
  let target = path.join(dir, safeName);
  let index = 1;
  while (fs.existsSync(target)) {
    target = path.join(dir, `${parsed.name}-${index}${parsed.ext}`);
    index += 1;
  }

  assertInside(project.imagesDir, target);
  fs.writeFileSync(target, data);
}

export function writeDiaryImage(project: ResolvedProject, fileName: string, data: Buffer) {
  return writeImageToFolder(project, "diary", fileName, data);
}

export function writeImageToFolder(project: ResolvedProject, folder: "diary" | "device" | "anime" | "posts", fileName: string, data: Buffer) {
  const safeName = path.basename(fileName).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim();
  if (!safeName || !isImageFile(safeName)) throw new Error("Only image files can be uploaded.");

  const dir = path.join(project.imagesDir, folder);
  assertInside(project.imagesDir, dir);
  fs.mkdirSync(dir, { recursive: true });

  const parsed = path.parse(safeName);
  let target = path.join(dir, safeName);
  let index = 1;
  while (fs.existsSync(target)) {
    target = path.join(dir, `${parsed.name}-${index}${parsed.ext}`);
    index += 1;
  }

  assertInside(project.imagesDir, target);
  fs.writeFileSync(target, data);
  return `/images/${folder}/${path.basename(target)}`;
}

export function deletePublicImage(project: ResolvedProject, imagePath: string) {
  const normalized = imagePath.replace(/^\/+/, "");
  if (!normalized.startsWith("images/") || !isImageFile(normalized)) {
    throw new Error("Only managed image paths can be deleted.");
  }
  const full = path.join(project.imagesDir, normalized.slice("images/".length));
  assertInside(project.imagesDir, full);
  if (!fs.existsSync(full)) throw new Error("Image does not exist.");
  fs.unlinkSync(full);
}

export function deletePublicImageIfExists(project: ResolvedProject, imagePath: string) {
  const normalized = imagePath.replace(/^\/+/, "");
  if (!normalized.startsWith("images/") || !isImageFile(normalized)) return false;
  const full = path.join(project.imagesDir, normalized.slice("images/".length));
  assertInside(project.imagesDir, full);
  if (!fs.existsSync(full)) return false;
  fs.unlinkSync(full);
  return true;
}

export function deleteAlbumDirectory(project: ResolvedProject, album: string) {
  const dir = albumDir(project, album);
  assertInside(project.imagesDir, dir);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

export function readAsset(project: ResolvedProject, relativePath: string) {
  const normalized = relativePath.replace(/^\/+/, "");
  let full = path.join(project.contentRoot, normalized);
  if (!fs.existsSync(full) && normalized.startsWith("images/")) {
    full = path.join(project.imagesDir, normalized.slice("images/".length));
  }
  assertInside(project.contentRoot, full);
  if (!fs.existsSync(full)) throw new Error("Asset does not exist.");
  if (!isImageFile(full)) throw new Error("Only image assets can be previewed.");
  return {
    buffer: fs.readFileSync(full),
    mimeType: mimeTypeFor(full)
  };
}

function mimeTypeFor(file: string) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".avif") return "image/avif";
  if (ext === ".gif") return "image/gif";
  if (ext === ".jpeg" || ext === ".jpg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

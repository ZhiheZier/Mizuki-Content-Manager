import fs from "node:fs";
import path from "node:path";
import { deleteAlbumDirectory, deletePublicImageIfExists } from "./album-assets";
import type { ResolvedProject } from "./source";

export type RecordType = "about" | "diary" | "friends" | "blog" | "projects" | "timeline" | "skills" | "devices" | "aiTools" | "anime" | "albums";
export type RecordMode = "ts-array" | "ts-category-map" | "markdown-single" | "markdown-list" | "album-list";
export type FieldInput = "text" | "textarea" | "tags" | "boolean" | "date" | "select" | "number" | "json";

export interface FieldConfig {
  key: string;
  label: string;
  input: FieldInput;
  options?: { label: string; value: string }[];
}

export interface RecordConfig {
  type: RecordType;
  label: string;
  mode: RecordMode;
  file?: string;
  variable?: string;
  directory?: string;
  fields: FieldConfig[];
}

const option = (label: string, value: string) => ({ label, value });

export const RECORD_CONFIGS: Record<RecordType, RecordConfig> = {
  about: {
    type: "about",
    label: "关于",
    mode: "markdown-single",
    file: "spec/about.md",
    fields: []
  },
  diary: {
    type: "diary",
    label: "日记",
    mode: "ts-array",
    file: "data/diary.ts",
    variable: "diaryData",
    fields: [
      { key: "id", label: "ID", input: "number" },
      { key: "content", label: "内容", input: "textarea" },
      { key: "date", label: "日期", input: "date" },
      { key: "mood", label: "心情", input: "text" },
      { key: "location", label: "地点", input: "text" },
      { key: "tags", label: "标签", input: "tags" },
      { key: "images", label: "图片", input: "tags" }
    ]
  },
  friends: {
    type: "friends",
    label: "友情链接",
    mode: "ts-array",
    file: "data/friends.ts",
    variable: "friendsData",
    fields: [
      { key: "id", label: "ID", input: "number" },
      { key: "title", label: "名称", input: "text" },
      { key: "imgurl", label: "头像", input: "text" },
      { key: "desc", label: "描述", input: "textarea" },
      { key: "siteurl", label: "链接", input: "text" },
      { key: "tags", label: "标签", input: "tags" }
    ]
  },
  blog: {
    type: "blog",
    label: "博客",
    mode: "markdown-list",
    directory: "posts",
    fields: [
      { key: "path", label: "文件路径", input: "text" },
      { key: "title", label: "标题", input: "text" },
      { key: "published", label: "发布日期", input: "date" },
      { key: "updated", label: "更新日期", input: "date" },
      { key: "description", label: "描述", input: "textarea" },
      { key: "body", label: "正文", input: "textarea" },
      { key: "image", label: "封面图片", input: "text" },
      { key: "tags", label: "标签", input: "tags" },
      { key: "category", label: "分类", input: "text" },
      { key: "draft", label: "草稿", input: "boolean" },
      { key: "pinned", label: "置顶", input: "boolean" },
      { key: "priority", label: "置顶优先级", input: "number" },
      { key: "comment", label: "开启评论", input: "boolean" },
      { key: "lang", label: "文章语言", input: "select", options: [option("跟随站点", ""), option("简体中文", "zh_CN"), option("繁体中文", "zh_TW"), option("English", "en"), option("日本語", "ja"), option("한국어", "ko"), option("Español", "es"), option("ไทย", "th"), option("Tiếng Việt", "vi"), option("Türkçe", "tr"), option("Bahasa Indonesia", "id")] },
      { key: "author", label: "作者", input: "text" },
      { key: "sourceLink", label: "来源链接", input: "text" },
      { key: "licenseName", label: "许可名称", input: "text" },
      { key: "licenseUrl", label: "许可链接", input: "text" },
      { key: "alias", label: "别名路径", input: "text" },
      { key: "permalink", label: "固定链接", input: "text" },
      { key: "encrypted", label: "文章加密", input: "boolean" },
      { key: "password", label: "访问密码", input: "text" },
      { key: "passwordHint", label: "密码提示", input: "text" },
      { key: "hideHomeContent", label: "隐藏首页摘要", input: "boolean" }
    ]
  },
  projects: {
    type: "projects",
    label: "项目",
    mode: "ts-array",
    file: "data/projects.ts",
    variable: "projectsData",
    fields: [
      { key: "id", label: "ID", input: "text" },
      { key: "title", label: "标题", input: "text" },
      { key: "description", label: "描述", input: "textarea" },
      { key: "image", label: "图片", input: "text" },
      { key: "category", label: "类别", input: "select", options: [option("网页应用", "web"), option("移动应用", "mobile"), option("桌面应用", "desktop"), option("其它", "other")] },
      { key: "techStack", label: "技术栈", input: "tags" },
      { key: "status", label: "状态", input: "select", options: [option("已完成", "completed"), option("进行中", "in-progress"), option("已计划", "planned")] },
      { key: "liveDemo", label: "演示地址", input: "text" },
      { key: "sourceCode", label: "源码地址", input: "text" },
      { key: "visitUrl", label: "访问地址", input: "text" },
      { key: "startDate", label: "开始日期", input: "text" },
      { key: "endDate", label: "结束日期", input: "text" },
      { key: "featured", label: "精选", input: "boolean" },
      { key: "showImage", label: "显示图片", input: "boolean" },
      { key: "tags", label: "标签", input: "tags" }
    ]
  },
  timeline: {
    type: "timeline",
    label: "时间线",
    mode: "ts-array",
    file: "data/timeline.ts",
    variable: "timelineData",
    fields: [
      { key: "id", label: "ID", input: "text" },
      { key: "title", label: "标题", input: "text" },
      { key: "description", label: "描述", input: "textarea" },
      { key: "type", label: "类型", input: "select", options: [option("教育", "education"), option("工作", "work"), option("项目", "project"), option("成就", "achievement")] },
      { key: "startDate", label: "开始日期", input: "text" },
      { key: "endDate", label: "结束日期", input: "text" },
      { key: "location", label: "地点", input: "text" },
      { key: "organization", label: "组织", input: "text" },
      { key: "position", label: "职位", input: "text" },
      { key: "skills", label: "技能", input: "tags" },
      { key: "achievements", label: "成就", input: "tags" },
      { key: "links", label: "链接 JSON", input: "json" },
      { key: "icon", label: "图标", input: "text" },
      { key: "featured", label: "精选", input: "boolean" },
      { key: "color", label: "颜色", input: "text" }
    ]
  },
  skills: {
    type: "skills",
    label: "技能",
    mode: "ts-array",
    file: "data/skills.ts",
    variable: "skillsData",
    fields: [
      { key: "id", label: "ID", input: "text" },
      { key: "name", label: "名称", input: "text" },
      { key: "description", label: "描述", input: "textarea" },
      { key: "icon", label: "图标", input: "text" },
      { key: "category", label: "分类", input: "select", options: [option("前端", "frontend"), option("后端", "backend"), option("数据库", "database"), option("工具", "tools"), option("其它", "other")] },
      { key: "level", label: "熟练度", input: "select", options: [option("入门", "beginner"), option("中等", "intermediate"), option("高级", "advanced"), option("专家", "expert")] },
      { key: "experience.years", label: "经验年", input: "number" },
      { key: "experience.months", label: "经验月", input: "number" },
      { key: "projects", label: "关联项目", input: "tags" },
      { key: "certifications", label: "证书", input: "tags" },
      { key: "color", label: "颜色", input: "text" }
    ]
  },
  devices: {
    type: "devices",
    label: "设备",
    mode: "ts-category-map",
    file: "data/devices.ts",
    variable: "devicesData",
    fields: [
      { key: "__category", label: "设备分类", input: "text" },
      { key: "name", label: "名称", input: "text" },
      { key: "image", label: "图片", input: "text" },
      { key: "specs", label: "规格", input: "textarea" },
      { key: "description", label: "描述", input: "textarea" },
      { key: "link", label: "链接", input: "text" }
    ]
  },
  aiTools: {
    type: "aiTools",
    label: "AI 工具",
    mode: "ts-array",
    file: "data/ai-tools.ts",
    variable: "aiToolsData",
    fields: [
      { key: "id", label: "ID", input: "text" },
      { key: "name", label: "名称", input: "text" },
      { key: "description.zh_CN", label: "中文描述", input: "textarea" },
      { key: "description.zh_TW", label: "繁中描述", input: "textarea" },
      { key: "description.en", label: "英文描述", input: "textarea" },
      { key: "description.ja", label: "日文描述", input: "textarea" },
      { key: "icon", label: "图标", input: "text" },
      { key: "category", label: "分类", input: "select", options: [option("聊天", "chat"), option("编程", "coding"), option("图像", "image"), option("音频", "audio"), option("视频", "video"), option("写作", "writing"), option("搜索", "search"), option("其它", "other")] },
      { key: "frequency", label: "频率", input: "select", options: [option("每天", "daily"), option("每周", "weekly"), option("偶尔", "occasional"), option("实验", "experimental")] },
      { key: "url", label: "链接", input: "text" },
      { key: "usage.zh_CN", label: "中文用途", input: "textarea" },
      { key: "usage.zh_TW", label: "繁中用途", input: "textarea" },
      { key: "usage.en", label: "英文用途", input: "textarea" },
      { key: "usage.ja", label: "日文用途", input: "textarea" },
      { key: "tags", label: "标签", input: "tags" },
      { key: "color", label: "颜色", input: "text" }
    ]
  },
  anime: {
    type: "anime",
    label: "追番",
    mode: "ts-array",
    file: "data/anime.ts",
    variable: "localAnimeList",
    fields: [
      { key: "title", label: "标题", input: "text" },
      { key: "status", label: "状态", input: "select", options: [option("在看", "watching"), option("已看", "completed"), option("计划", "planned")] },
      { key: "rating", label: "评分", input: "number" },
      { key: "cover", label: "封面", input: "text" },
      { key: "description", label: "描述", input: "textarea" },
      { key: "episodes", label: "集数文本", input: "text" },
      { key: "year", label: "年份", input: "text" },
      { key: "genre", label: "类型", input: "tags" },
      { key: "studio", label: "制作公司", input: "text" },
      { key: "link", label: "链接", input: "text" },
      { key: "progress", label: "进度", input: "number" },
      { key: "totalEpisodes", label: "总集数", input: "number" },
      { key: "startDate", label: "开始日期", input: "date" },
      { key: "endDate", label: "结束日期", input: "date" }
    ]
  },
  albums: {
    type: "albums",
    label: "相册",
    mode: "album-list",
    directory: "images/albums",
    fields: [
      { key: "__dirname", label: "目录名", input: "text" },
      { key: "title", label: "标题", input: "text" },
      { key: "description", label: "描述", input: "textarea" },
      { key: "date", label: "日期", input: "date" },
      { key: "location", label: "地点", input: "text" },
      { key: "tags", label: "标签", input: "tags" },
      { key: "mode", label: "图片模式", input: "select", options: [option("本地目录", ""), option("外链列表", "external")] },
      { key: "cover", label: "外链封面", input: "text" },
      { key: "photos", label: "外链照片 JSON", input: "json" },
      { key: "layout", label: "布局", input: "select", options: [option("网格", "grid"), option("瀑布流", "masonry")] },
      { key: "columns", label: "列数", input: "number" },
      { key: "hidden", label: "隐藏", input: "boolean" },
      { key: "password", label: "访问密码", input: "text" },
      { key: "passwordHint", label: "密码提示", input: "text" }
    ]
  }
};

function contentPath(project: ResolvedProject, relativePath: string) {
  return path.join(project.contentRoot, relativePath);
}

function assertInside(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("路径超出了内容目录。");
  }
}

function normalizeContentRelativePath(relativePath: string) {
  return relativePath.trim().replaceAll("\\", "/").replace(/^\/+/, "");
}

function getNested(item: Record<string, unknown>, key: string) {
  return key.split(".").reduce<unknown>((value, part) => (value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined), item);
}

function setNested(item: Record<string, unknown>, key: string, value: unknown) {
  const parts = key.split(".");
  let target = item;
  for (const part of parts.slice(0, -1)) {
    if (!target[part] || typeof target[part] !== "object") target[part] = {};
    target = target[part] as Record<string, unknown>;
  }
  target[parts[parts.length - 1]] = value;
}

function stringifyChoice(item: Record<string, unknown>, fallback: string) {
  const id = item.id === undefined || item.id === null ? "" : String(item.id);
  const title = item.title || item.name || item.content || item.date || fallback;
  return id ? `${id} - ${String(title).slice(0, 48)}` : String(title);
}

function extractAssignedValue(content: string, variable: string) {
  const pattern = new RegExp(`(?:export\\s+)?const\\s+${variable}\\s*(?::[^=]+)?=\\s*`);
  const match = pattern.exec(content);
  if (!match) throw new Error(`未找到 ${variable}`);
  let index = match.index + match[0].length;
  while (index < content.length && !["[", "{"].includes(content[index])) index += 1;
  const start = index;
  const stack: string[] = [];
  let quote = "";
  let lineComment = false;
  let blockComment = false;
  for (; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1] || "";
    const prev = content[index - 1] || "";
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (!quote && char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (!quote && char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (["\"", "'", "`"].includes(char)) {
      if (!quote) quote = char;
      else if (quote === char && prev !== "\\") quote = "";
      continue;
    }
    if (quote) continue;
    if (char === "[" || char === "{") stack.push(char);
    if (char === "]" || char === "}") {
      stack.pop();
      if (!stack.length) return { value: content.slice(start, index + 1), start, end: index + 1 };
    }
  }
  throw new Error(`无法解析 ${variable}`);
}

function parseObjectLiteral<T>(value: string) {
  return Function(`"use strict"; return (${value});`)() as T;
}

function readTsValue<T>(project: ResolvedProject, config: RecordConfig) {
  const file = contentPath(project, config.file || "");
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const extracted = extractAssignedValue(content, config.variable || "");
  return { file, content, extracted, value: parseObjectLiteral<T>(extracted.value) };
}

function writeTsValue(project: ResolvedProject, config: RecordConfig, value: unknown) {
  const current = readTsValue<unknown>(project, config);
  const formatted = JSON.stringify(value, null, 2);
  const next = current.content.slice(0, current.extracted.start) + formatted + current.content.slice(current.extracted.end);
  fs.writeFileSync(current.file, next, "utf8");
}

function parseFrontmatter(content: string) {
  if (!content.startsWith("---")) return { data: {}, body: content };
  const close = content.indexOf("\n---", 3);
  if (close < 0) return { data: {}, body: content };
  const raw = content.slice(3, close).trim();
  const body = content.slice(close + 4).replace(/^\r?\n/, "");
  const data: Record<string, unknown> = {};
  for (const line of raw.split(/\r?\n/)) {
    const [key, ...rest] = line.split(":");
    if (!key || !rest.length) continue;
    const value = rest.join(":").trim();
    if (value === "true" || value === "false") data[key.trim()] = value === "true";
    else if (value.startsWith("[") && value.endsWith("]")) data[key.trim()] = value.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
    else data[key.trim()] = value.replace(/^["']|["']$/g, "");
  }
  return { data, body };
}

function stringifyFrontmatter(item: Record<string, unknown>) {
  const body = String(item.body || "");
  const lines = Object.entries(item)
    .filter(([key]) => key !== "body" && key !== "path")
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: [${value.join(", ")}]`;
      if (typeof value === "string") return `${key}: ${value.includes(":") || value.includes("#") ? JSON.stringify(value) : value}`;
      return `${key}: ${String(value)}`;
    });
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

function listMarkdownFiles(dir: string, base: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(full, base);
    return /\.(md|mdx)$/i.test(entry.name) ? [path.relative(base, full).replaceAll(path.sep, "/")] : [];
  });
}

function albumsDir(project: ResolvedProject, config: RecordConfig) {
  return contentPath(project, config.directory || "images/albums");
}

function readAlbumInfo(project: ResolvedProject, dirname: string): Record<string, unknown> & { __dirname: string } {
  const infoPath = path.join(albumsDir(project, RECORD_CONFIGS.albums), dirname, "info.json");
  const info = fs.existsSync(infoPath) ? JSON.parse(fs.readFileSync(infoPath, "utf8")) as Record<string, unknown> : {};
  return { __dirname: dirname, ...info };
}

function listAlbumDirs(project: ResolvedProject, config: RecordConfig) {
  const base = albumsDir(project, config);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readAlbumInfo(project, entry.name));
}

function flattenDeviceMap(map: Record<string, Record<string, unknown>[]>) {
  return Object.entries(map).flatMap(([category, devices]) =>
    (devices || []).map((device, index): Record<string, unknown> & { __category: string; __index: number } => ({ ...device, __category: category, __index: index }))
  );
}

function collectManagedImagePaths(value: unknown): string[] {
  const paths: string[] = [];
  const visit = (item: unknown) => {
    if (!item) return;
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (/^\/?images\//.test(trimmed)) paths.push(trimmed);
      for (const match of item.matchAll(/(?:^|[(\s"'])((?:\/)?images\/[^\s)"']+\.(?:avif|gif|jpe?g|png|svg|webp))/gi)) {
        paths.push(match[1]);
      }
      return;
    }
    if (Array.isArray(item)) {
      for (const entry of item) visit(entry);
      return;
    }
    if (typeof item === "object") {
      for (const entry of Object.values(item as Record<string, unknown>)) visit(entry);
    }
  };
  visit(value);
  return Array.from(new Set(paths));
}

function deleteManagedImages(project: ResolvedProject, record: Record<string, unknown> | null) {
  if (!record) return [];
  const deleted: string[] = [];
  for (const imagePath of collectManagedImagePaths(record)) {
    if (deletePublicImageIfExists(project, imagePath)) deleted.push(imagePath);
  }
  return deleted;
}

export function getRecordConfig(type: RecordType) {
  return RECORD_CONFIGS[type];
}

export function listRecords(project: ResolvedProject, type: RecordType) {
  const config = getRecordConfig(type);
  if (config.mode === "ts-array") {
    const { value } = readTsValue<Record<string, unknown>[]>(project, config);
    return { config, items: value, choices: value.map((item, index) => ({ value: String(item.id ?? index), label: stringifyChoice(item, String(index + 1)) })) };
  }
  if (config.mode === "ts-category-map") {
    const { value } = readTsValue<Record<string, Record<string, unknown>[]>>(project, config);
    const items = flattenDeviceMap(value);
    return { config, items, choices: items.map((item) => ({ value: `${item.__category}::${item.__index}`, label: `${item.__category} / ${item.name || item.__index}` })) };
  }
  if (config.mode === "markdown-single") {
    const file = contentPath(project, config.file || "");
    return { config, items: [], choices: [], current: fs.existsSync(file) ? { body: fs.readFileSync(file, "utf8") } : { body: "" } };
  }
  if (config.mode === "album-list") {
    const items = listAlbumDirs(project, config);
    return { config, items, choices: items.map((item) => ({ value: String(item.__dirname), label: `${item.__dirname} - ${String(item.title || "未命名相册")}` })) };
  }
  const files = listMarkdownFiles(contentPath(project, config.directory || ""), project.contentRoot);
  return { config, items: [], choices: files.map((file) => ({ value: file, label: file })) };
}

export function readRecord(project: ResolvedProject, type: RecordType, id?: string) {
  const config = getRecordConfig(type);
  if (config.mode === "ts-array") {
    const { value } = readTsValue<Record<string, unknown>[]>(project, config);
    return value.find((item, index) => String(item.id ?? index) === id) || null;
  }
  if (config.mode === "ts-category-map") {
    const { value } = readTsValue<Record<string, Record<string, unknown>[]>>(project, config);
    const [category, rawIndex] = String(id || "").split("::");
    const index = Number(rawIndex);
    const item = value[category]?.[index];
    return item ? { ...item, __category: category, __index: index } : null;
  }
  if (config.mode === "markdown-single") return listRecords(project, type).current;
  if (config.mode === "album-list") {
    if (!id) return null;
    return readAlbumInfo(project, id);
  }
  if (!id) return null;
  const file = contentPath(project, id);
  const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
  return { ...parsed.data, body: parsed.body, path: id };
}

function normalizeFormItem(config: RecordConfig, item: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};
  for (const field of config.fields) {
    const raw = getNested(item, field.key) ?? item[field.key];
    if (raw === undefined || raw === "") continue;
    let value: unknown = raw;
    if (field.input === "number") value = Number(raw);
    if (field.input === "json") {
      try {
        value = JSON.parse(String(raw));
      } catch {
        throw new Error(`${field.label} 不是有效的 JSON`);
      }
    }
    setNested(normalized, field.key, value);
  }
  return normalized;
}

export function saveRecord(project: ResolvedProject, type: RecordType, item: Record<string, unknown>, id?: string) {
  const config = getRecordConfig(type);
  const normalized = normalizeFormItem(config, item);
  if (config.mode === "ts-array") {
    const current = readTsValue<Record<string, unknown>[]>(project, config);
    const nextItems = [...current.value];
    const key = String(normalized.id ?? id ?? "");
    const index = nextItems.findIndex((entry, idx) => String(entry.id ?? idx) === key);
    if (index >= 0) nextItems[index] = { ...nextItems[index], ...normalized };
    else {
      const numericIds = nextItems.map((entry) => Number(entry.id)).filter(Number.isFinite);
      nextItems.push({ ...normalized, id: normalized.id || Math.max(0, ...numericIds) + 1 });
    }
    writeTsValue(project, config, nextItems);
    return { ok: true };
  }
  if (config.mode === "ts-category-map") {
    const current = readTsValue<Record<string, Record<string, unknown>[]>>(project, config);
    const nextMap = { ...current.value };
    const [oldCategory, rawIndex] = String(id || "").split("::");
    const index = Number(rawIndex);
    const category = String(normalized.__category || oldCategory || "自定义");
    delete normalized.__category;
    delete normalized.__index;
    if (!nextMap[category]) nextMap[category] = [];
    if (oldCategory && Number.isFinite(index) && nextMap[oldCategory]?.[index]) {
      const existing = nextMap[oldCategory][index];
      nextMap[oldCategory].splice(index, 1);
      if (!nextMap[oldCategory].length) delete nextMap[oldCategory];
      nextMap[category].push({ ...existing, ...normalized });
    } else nextMap[category].push(normalized);
    writeTsValue(project, config, nextMap);
    return { ok: true };
  }
  if (config.mode === "markdown-single") {
    fs.writeFileSync(contentPath(project, config.file || ""), String(normalized.body || ""), "utf8");
    return { ok: true };
  }
  if (config.mode === "album-list") {
    const dirname = String(normalized.__dirname || id || "").trim();
    if (!dirname) throw new Error("缺少相册目录名");
    delete normalized.__dirname;
    const dir = path.join(albumsDir(project, config), dirname);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "info.json"), JSON.stringify(normalized, null, 2), "utf8");
    return { ok: true };
  }
  const target = normalizeContentRelativePath(String(normalized.path || item.path || id || ""));
  if (!target) throw new Error("缺少文章路径");
  if (!/\.(md|mdx)$/i.test(target)) throw new Error("文章路径必须以 .md 或 .mdx 结尾");
  const oldTarget = id ? normalizeContentRelativePath(id) : "";
  const file = contentPath(project, target);
  assertInside(project.contentRoot, file);
  if (oldTarget) assertInside(project.contentRoot, contentPath(project, oldTarget));
  const existing = fs.existsSync(file) ? parseFrontmatter(fs.readFileSync(file, "utf8")) : { data: {}, body: "" };
  if (oldTarget && oldTarget !== target) {
    const oldFile = contentPath(project, oldTarget);
    if (fs.existsSync(file)) throw new Error("目标文章路径已存在。");
    if (fs.existsSync(oldFile) && !fs.existsSync(file)) {
      const oldParsed = parseFrontmatter(fs.readFileSync(oldFile, "utf8"));
      existing.data = oldParsed.data;
      existing.body = oldParsed.body;
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stringifyFrontmatter({ ...existing.data, ...normalized, body: item.body ?? existing.body }), "utf8");
  if (oldTarget && oldTarget !== target) {
    const oldFile = contentPath(project, oldTarget);
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }
  return { ok: true };
}

export function deleteRecord(project: ResolvedProject, type: RecordType, id?: string) {
  const config = getRecordConfig(type);
  if (!id) throw new Error("缺少要删除的记录。");
  if (config.mode === "markdown-single") throw new Error("单文件页面不支持删除记录。");

  if (config.mode === "ts-array") {
    const current = readTsValue<Record<string, unknown>[]>(project, config);
    const index = current.value.findIndex((entry, idx) => String(entry.id ?? idx) === id);
    if (index < 0) throw new Error("没有找到要删除的记录。");
    const [removed] = current.value.splice(index, 1);
    const images = deleteManagedImages(project, removed);
    writeTsValue(project, config, current.value);
    return { ok: true, deletedImages: images };
  }

  if (config.mode === "ts-category-map") {
    const current = readTsValue<Record<string, Record<string, unknown>[]>>(project, config);
    const [category, rawIndex] = String(id).split("::");
    const index = Number(rawIndex);
    if (!category || !Number.isFinite(index) || !current.value[category]?.[index]) throw new Error("没有找到要删除的记录。");
    const [removed] = current.value[category].splice(index, 1);
    if (!current.value[category].length) delete current.value[category];
    const images = deleteManagedImages(project, removed);
    writeTsValue(project, config, current.value);
    return { ok: true, deletedImages: images };
  }

  if (config.mode === "album-list") {
    const record = readRecord(project, type, id);
    const images = deleteManagedImages(project, record || null);
    deleteAlbumDirectory(project, id);
    return { ok: true, deletedImages: images };
  }

  const target = normalizeContentRelativePath(id);
  const file = contentPath(project, target);
  assertInside(project.contentRoot, file);
  if (!fs.existsSync(file)) throw new Error("没有找到要删除的文件。");
  const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
  const images = deleteManagedImages(project, { ...parsed.data, body: parsed.body });
  fs.unlinkSync(file);
  return { ok: true, deletedImages: images };
}

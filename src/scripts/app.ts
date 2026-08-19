interface ProjectInput {
  codeRoot: string;
  previewUrl?: string;
}

interface FileNode {
  label: string;
  path: string;
  kind: "file" | "dir";
  editable?: boolean;
  children?: FileNode[];
}

interface AppConfig {
  codeRoot?: string;
}

interface ResolvedProjectInfo {
  contentMode: "integrated" | "separated";
  contentRoot: string;
  codeRoot: string;
  previewUrl: string;
}

interface GitStatus {
  repoRoot: string;
  isGitRepo: boolean;
  dirty: boolean;
  ahead: boolean;
  summary: string;
  output: string;
}

type CategoryKey = "about" | "diary" | "friends" | "blog" | "projects" | "timeline" | "skills" | "devices" | "aiTools" | "anime" | "albums";

interface FieldConfig {
  key: string;
  label: string;
  input: "text" | "textarea" | "tags" | "boolean" | "date" | "select" | "number" | "json";
  options?: { label: string; value: string }[];
}

interface RecordConfig {
  label: string;
  mode: "ts-array" | "ts-category-map" | "markdown-single" | "markdown-list" | "album-list";
  fields: FieldConfig[];
}

interface RecordChoice {
  value: string;
  label: string;
}

interface PendingImageUpload {
  id: string;
  file: File;
  previewUrl: string;
}

let project: ProjectInput | null = null;
let resolvedProject: ResolvedProjectInfo | null = null;
let activePath = "";
let projectLocked = false;
let fileNodes: FileNode[] = [];
let activeCategory: CategoryKey = "about";
let activeRecordId = "";
let activeRecordConfig: RecordConfig | null = null;
let recordDirty = false;
let sourceDirty = false;
let hydratingForm = false;
let pendingSingleUpload: PendingImageUpload | null = null;
let pendingDiaryUploads: PendingImageUpload[] = [];
let pendingAlbumUploads: PendingImageUpload[] = [];
const pendingManagedDeletes = new Set<string>();
const pendingAlbumDeletes = new Set<string>();
const logLines: string[] = [];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  codeRoot: $<HTMLInputElement>("codeRoot"),
  applyProject: $<HTMLButtonElement>("applyProject"),
  startPreview: $<HTMLButtonElement>("startPreview"),
  stopPreview: $<HTMLButtonElement>("stopPreview"),
  pushContent: $<HTMLButtonElement>("pushContent"),
  refreshFiles: $<HTMLButtonElement>("refreshFiles"),
  saveFile: $<HTMLButtonElement>("saveFile"),
  saveRecord: $<HTMLButtonElement>("saveRecord"),
  newRecord: $<HTMLButtonElement>("newRecord"),
  deleteRecord: $<HTMLButtonElement>("deleteRecord"),
  recordEditor: $<HTMLDivElement>("recordEditor"),
  recordSelect: $<HTMLSelectElement>("recordSelect"),
  recordPicker: $<HTMLDivElement>("recordPicker"),
  recordPickerButton: $<HTMLButtonElement>("recordPickerButton"),
  recordPickerMenu: $<HTMLDivElement>("recordPickerMenu"),
  recordForm: $<HTMLDivElement>("recordForm"),
  albumMedia: $<HTMLDivElement>("albumMedia"),
  mediaTitle: $<HTMLDivElement>("mediaTitle"),
  albumMediaCount: $<HTMLSpanElement>("albumMediaCount"),
  albumImages: $<HTMLDivElement>("albumImages"),
  albumUpload: $<HTMLInputElement>("albumUpload"),
  albumUploadButton: $<HTMLButtonElement>("albumUploadButton"),
  externalImageTools: $<HTMLSpanElement>("externalImageTools"),
  externalImageUrl: $<HTMLInputElement>("externalImageUrl"),
  addExternalImage: $<HTMLButtonElement>("addExternalImage"),
  previewToggle: $<HTMLButtonElement>("previewToggle"),
  reloadPreview: $<HTMLButtonElement>("reloadPreview"),
  closePreview: $<HTMLButtonElement>("closePreview"),
  projectStatus: $<HTMLPreElement>("projectStatus"),
  fileTree: $<HTMLDivElement>("fileTree"),
  activeFile: $<HTMLElement>("activeFile"),
  activeType: $<HTMLElement>("activeType"),
  editor: $<HTMLTextAreaElement>("editor"),
  previewDrawer: $<HTMLElement>("previewDrawer"),
  previewFrame: $<HTMLIFrameElement>("previewFrame"),
  previewLabel: $<HTMLElement>("previewLabel"),
  imageLightbox: $<HTMLDivElement>("imageLightbox"),
  imageLightboxImg: $<HTMLImageElement>("imageLightboxImg"),
  imageLightboxClose: $<HTMLButtonElement>("imageLightboxClose"),
  confirmDialog: $<HTMLDivElement>("confirmDialog"),
  confirmTitle: $<HTMLElement>("confirmTitle"),
  confirmMessage: $<HTMLElement>("confirmMessage"),
  confirmCancel: $<HTMLButtonElement>("confirmCancel"),
  confirmOk: $<HTMLButtonElement>("confirmOk")
};

const categoryButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".category-tabs button"));

function collectProject(): ProjectInput {
  return { codeRoot: els.codeRoot.value };
}

function appendLog(message: string) {
  const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  logLines.push(`[${time}] ${message}`);
  if (logLines.length > 80) logLines.shift();
  els.projectStatus.textContent = logLines.length ? logLines.join("\n") : "暂无日志。";
  els.projectStatus.scrollTop = els.projectStatus.scrollHeight;
  fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  }).catch(() => undefined);
}

function markRecordDirty() {
  if (!hydratingForm) recordDirty = true;
}

function markSourceDirty() {
  sourceDirty = true;
}

function showConfirm(title: string, message: string, okText = "确定") {
  return new Promise<boolean>((resolve) => {
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    els.confirmOk.textContent = okText;
    els.confirmDialog.classList.remove("hidden");
    els.confirmDialog.setAttribute("aria-hidden", "false");

    const finish = (confirmed: boolean) => {
      els.confirmDialog.classList.add("hidden");
      els.confirmDialog.setAttribute("aria-hidden", "true");
      els.confirmCancel.removeEventListener("click", cancel);
      els.confirmOk.removeEventListener("click", ok);
      els.confirmDialog.removeEventListener("click", backdrop);
      resolve(confirmed);
    };
    const cancel = () => finish(false);
    const ok = () => finish(true);
    const backdrop = (event: MouseEvent) => {
      if (event.target === els.confirmDialog) finish(false);
    };

    els.confirmCancel.addEventListener("click", cancel);
    els.confirmOk.addEventListener("click", ok);
    els.confirmDialog.addEventListener("click", backdrop);
    els.confirmOk.focus();
  });
}

async function confirmDiscardChanges() {
  if (!recordDirty && !sourceDirty) return true;
  const confirmed = await showConfirm("离开当前内容？", "当前有未保存的更改，不保存记录/文件是不会保存的。确定要离开吗？", "离开");
  if (confirmed) {
    recordDirty = false;
    sourceDirty = false;
    clearPendingMedia();
  }
  return confirmed;
}

async function guardUnsaved(action: () => Promise<void> | void) {
  if (!(await confirmDiscardChanges())) return;
  await action();
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || data.message || "Request failed");
  return data;
}

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || data.message || "Request failed");
  return data;
}

function renderTree(nodes: FileNode[], container = els.fileTree, level = 0) {
  container.innerHTML = "";
  for (const node of nodes) {
    if (node.kind === "dir") {
      const dir = document.createElement("button");
      dir.type = "button";
      dir.className = "tree-row dir";
      dir.style.paddingLeft = `${level * 12}px`;
      dir.title = node.path;

      const icon = document.createElement("span");
      icon.className = "tree-icon";
      icon.textContent = node.children?.length ? "v" : "";

      const label = document.createElement("span");
      label.className = "tree-label";
      label.textContent = node.label;

      dir.append(icon, label);
      container.appendChild(dir);

      if (node.children?.length) {
        const childWrap = document.createElement("div");
        childWrap.className = "tree-children";
        container.appendChild(childWrap);
        renderTree(node.children, childWrap, level + 1);
        dir.addEventListener("click", () => {
          childWrap.classList.toggle("collapsed");
          icon.textContent = childWrap.classList.contains("collapsed") ? ">" : "v";
        });
      }
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-row file";
    button.dataset.path = node.path;
    button.style.paddingLeft = `${level * 12 + 8}px`;
    button.disabled = node.editable === false;
    button.title = node.path;

    const icon = document.createElement("span");
    icon.className = "tree-icon";
    icon.textContent = node.editable === false ? "-" : "";

    const label = document.createElement("span");
    label.className = "tree-label";
    label.textContent = node.label;

    button.append(icon, label);
    if (node.editable !== false) button.addEventListener("click", () => readFile(node.path));
    container.appendChild(button);
  }
}

function markActiveFile(path: string) {
  els.fileTree.querySelectorAll(".file.active").forEach((node) => node.classList.remove("active"));
  els.fileTree.querySelector<HTMLElement>(`.file[data-path="${CSS.escape(path)}"]`)?.classList.add("active");
}

function findFile(nodes: FileNode[], matcher: (path: string) => boolean): string | null {
  for (const node of nodes) {
    if (node.kind === "file" && node.editable !== false && matcher(node.path)) return node.path;
    if (node.children?.length) {
      const match = findFile(node.children, matcher);
      if (match) return match;
    }
  }
  return null;
}

function categoryForPath(path: string): CategoryKey | null {
  if (path === "spec/about.md") return "about";
  if (path === "data/diary.ts") return "diary";
  if (path === "data/friends.ts" || path === "spec/friends.md") return "friends";
  if (path === "data/projects.ts") return "projects";
  if (path === "data/timeline.ts") return "timeline";
  if (path === "data/skills.ts") return "skills";
  if (path === "data/devices.ts") return "devices";
  if (path === "data/ai-tools.ts") return "aiTools";
  if (path === "data/anime.ts") return "anime";
  if (path.startsWith("images/albums/")) return "albums";
  if (path.startsWith("posts/")) return "blog";
  return null;
}

function classifyPath(path: string) {
  const root = path.split("/")[0] || "";
  const labels: Record<string, string> = {
    data: "数据",
    posts: "文章",
    spec: "页面",
    images: "图片"
  };
  return labels[root] || "文件";
}

function clearSourceEditor() {
  activePath = "";
  els.activeFile.textContent = "未选择";
  els.activeType.textContent = "未分类";
  els.editor.value = "";
  sourceDirty = false;
  els.fileTree.querySelectorAll(".file.active").forEach((node) => node.classList.remove("active"));
}

function setActiveCategory(category: CategoryKey | null) {
  for (const button of categoryButtons) {
    button.classList.toggle("active", button.dataset.category === category);
  }
}

function setRecordPickerOpen(open: boolean) {
  els.recordPicker.classList.toggle("open", open);
}

async function selectRecord(choice: RecordChoice, choices: RecordChoice[]) {
  if (!(await confirmDiscardChanges())) return;
  activeRecordId = choice.value;
  els.recordSelect.value = choice.value;
  setRecordPickerOpen(false);
  renderRecordPicker(choices);
  if (activeRecordConfig?.mode === "markdown-list" && activeRecordId) await readFile(activeRecordId);
  else await loadSelectedRecord();
}

function renderRecordPicker(choices: RecordChoice[]) {
  els.recordPickerMenu.innerHTML = "";
  const current = choices.find((choice) => choice.value === activeRecordId);
  els.recordPickerButton.textContent = current?.label || "选择记录";
  for (const choice of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "record-picker-option";
    button.classList.toggle("active", choice.value === activeRecordId);
    button.textContent = choice.label;
    button.addEventListener("click", () => selectRecord(choice, choices).catch(handleError));
    els.recordPickerMenu.appendChild(button);
  }
}

function closeFieldPickers() {
  els.recordForm.querySelectorAll(".field-picker.open").forEach((picker) => {
    picker.classList.remove("open");
    picker.closest("label")?.classList.remove("field-open");
  });
}

function syncFieldPicker(select: HTMLSelectElement) {
  const button = select.parentElement?.querySelector<HTMLButtonElement>(".field-picker-button");
  const options = select.parentElement?.querySelectorAll<HTMLButtonElement>(".field-picker-option");
  const selected = select.options[select.selectedIndex];
  if (button) button.textContent = selected?.textContent || "选择";
  options?.forEach((option) => option.classList.toggle("active", option.dataset.value === select.value));
}

function assetUrl(relativePath: string) {
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const assetPath = relativePath.replace(/^\/+/, "");
  const params = new URLSearchParams({
    codeRoot: project?.codeRoot || "",
    path: assetPath,
    v: String(Date.now())
  });
  return `/api/assets/read?${params.toString()}`;
}

function isExternalImage(relativePath: string) {
  return /^https?:\/\//i.test(relativePath);
}

function openImageLightbox(src: string, alt = "") {
  els.imageLightboxImg.src = src;
  els.imageLightboxImg.alt = alt;
  els.imageLightbox.classList.remove("hidden");
  els.imageLightbox.setAttribute("aria-hidden", "false");
}

function closeImageLightbox() {
  els.imageLightbox.classList.add("hidden");
  els.imageLightbox.setAttribute("aria-hidden", "true");
  els.imageLightboxImg.src = "";
}

function revokePending(upload: PendingImageUpload | null) {
  if (upload) URL.revokeObjectURL(upload.previewUrl);
}

function clearPendingMedia() {
  revokePending(pendingSingleUpload);
  for (const upload of pendingDiaryUploads) revokePending(upload);
  for (const upload of pendingAlbumUploads) revokePending(upload);
  pendingSingleUpload = null;
  pendingDiaryUploads = [];
  pendingAlbumUploads = [];
  pendingManagedDeletes.clear();
  pendingAlbumDeletes.clear();
}

function createPendingUpload(file: File): PendingImageUpload {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file)
  };
}

function renderImageCard(label: string, imagePath: string, onDelete: () => void | Promise<void>, previewSrc = assetUrl(imagePath)) {
  const card = document.createElement("div");
  card.className = "album-image-card";

  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "album-image-preview";

  const img = document.createElement("img");
  img.src = previewSrc;
  img.alt = label;
  img.loading = "lazy";

  preview.appendChild(img);
  preview.addEventListener("click", () => openImageLightbox(previewSrc, label));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "album-image-delete";
  remove.title = "删除";
  remove.textContent = "×";
  remove.addEventListener("click", async (event) => {
    event.stopPropagation();
    await onDelete();
  });

  const name = document.createElement("div");
  name.className = "album-image-name";
  name.title = imagePath;
  name.textContent = label;

  card.append(preview, remove, name);
  return card;
}

function setAlbumMediaVisible(visible: boolean) {
  els.albumMedia.classList.toggle("hidden", !visible);
  if (!visible) {
    els.albumImages.innerHTML = "";
    els.albumMediaCount.textContent = "0 张";
    setExternalImageTools(false);
  }
}

function setExternalImageTools(visible: boolean) {
  els.externalImageTools.classList.toggle("hidden", !visible);
  els.externalImageUrl.value = "";
}

function mediaEmptyText(message: string) {
  const empty = document.createElement("div");
  empty.className = "album-empty";
  empty.textContent = message;
  els.albumImages.appendChild(empty);
}

function albumMode() {
  const modeInput = els.recordForm.querySelector<HTMLSelectElement>('[name="mode"]');
  return modeInput?.value === "external" ? "external" : "local";
}

function albumDirectoryName() {
  const dirnameInput = els.recordForm.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="__dirname"]');
  return (activeRecordId || dirnameInput?.value || "").trim();
}

function albumCoverInput() {
  return els.recordForm.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="cover"]');
}

function albumPhotosInput() {
  return els.recordForm.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="photos"]');
}

function parseAlbumPhotos() {
  const input = albumPhotosInput();
  const raw = (input?.value || "").trim();
  if (!raw) return [] as Record<string, unknown>[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === "string" ? { src: item } : item))
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && String(item.src || "").trim()));
  } catch {
    return [];
  }
}

function setAlbumPhotos(photos: Record<string, unknown>[]) {
  const input = albumPhotosInput();
  if (!input) return;
  input.value = JSON.stringify(photos, null, 2);
}

function syncAlbumCover(photos = parseAlbumPhotos()) {
  const input = albumCoverInput();
  if (!input) return;
  const current = input.value.trim();
  const first = String(photos[0]?.src || "");
  if (!current || !photos.some((photo) => String(photo.src || "") === current)) input.value = first;
}

function updateAlbumModeVisibility() {
  if (activeCategory !== "albums") return;
  els.mediaTitle.textContent = "相册图片";
  els.albumUploadButton.textContent = "上传图片";
  const isExternal = albumMode() === "external";
  for (const key of ["cover", "photos"]) {
    const field = els.recordForm.querySelector<HTMLElement>(`[data-field-key="${CSS.escape(key)}"]`);
    field?.classList.add("hidden-field");
    if (field) field.dataset.skipWhenHidden = String(!isExternal);
  }
  setAlbumMediaVisible(true);
  setExternalImageTools(isExternal);
  els.albumUploadButton.classList.toggle("hidden", isExternal);
  if (isExternal) renderExternalAlbumImages();
  else if (albumDirectoryName()) loadAlbumImages().catch(handleError);
  else {
    els.albumImages.innerHTML = "";
    els.albumMediaCount.textContent = "0 张";
    mediaEmptyText("保存相册目录名后，这里会显示目录里的图片。");
  }
}

function diaryImagesInput() {
  return els.recordForm.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="images"]');
}

function currentDiaryImages() {
  const input = diaryImagesInput();
  return (input?.value || "").split(",").map((value) => value.trim()).filter(Boolean);
}

function setDiaryImages(paths: string[]) {
  const input = diaryImagesInput();
  if (!input) return;
  input.value = Array.from(new Set(paths)).join(", ");
}

function singleImageField() {
  if (activeCategory === "devices") return "image";
  if (activeCategory === "anime") return "cover";
  return "";
}

function singleImageFolder() {
  if (activeCategory === "devices") return "device";
  if (activeCategory === "anime") return "anime";
  return "";
}

function singleImageTitle() {
  if (activeCategory === "devices") return "设备图片";
  if (activeCategory === "anime") return "追番封面";
  return "";
}

function singleImageInput() {
  const field = singleImageField();
  if (!field) return null;
  return els.recordForm.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${field}"]`);
}

function renderSingleImage() {
  if (activeCategory !== "devices" && activeCategory !== "anime") return;
  const input = singleImageInput();
  const imagePath = (input?.value || "").trim();
  els.mediaTitle.textContent = singleImageTitle();
  els.albumUploadButton.textContent = imagePath || pendingSingleUpload ? "修改图片" : "上传图片";
  setExternalImageTools(false);
  setAlbumMediaVisible(true);
  els.albumImages.innerHTML = "";
  els.albumMediaCount.textContent = imagePath || pendingSingleUpload ? "1 张" : "0 张";

  if (pendingSingleUpload) {
    const card = renderImageCard(`待上传: ${pendingSingleUpload.file.name}`, pendingSingleUpload.file.name, async () => {
      if (!(await showConfirm("移除待上传图片？", `这只会移除待上传图片 ${pendingSingleUpload?.file.name || ""}，不会改动本地文件。`, "移除"))) return;
      revokePending(pendingSingleUpload);
      pendingSingleUpload = null;
      markRecordDirty();
      renderSingleImage();
    }, pendingSingleUpload.previewUrl);
    els.albumImages.appendChild(card);
    return;
  }

  if (!imagePath) {
    mediaEmptyText(`还没有${singleImageTitle()}，上传后会自动写入路径。`);
    return;
  }

  const card = renderImageCard(imagePath, imagePath, async () => {
    const action = isExternalImage(imagePath) ? "移除图片引用" : "删除图片";
    if (!project || !(await showConfirm(`${action}？`, `${action} ${imagePath}？点击“保存记录”后才会真正生效。`, "删除"))) return;
    if (!isExternalImage(imagePath)) pendingManagedDeletes.add(imagePath);
    if (input) input.value = "";
    markRecordDirty();
    appendLog(isExternalImage(imagePath) ? `已标记移除图片引用 ${imagePath}` : `已标记删除图片 ${imagePath}`);
    renderSingleImage();
  });
  els.albumImages.appendChild(card);
}

function renderDiaryImages() {
  if (activeCategory !== "diary") return;
  els.mediaTitle.textContent = "日记图片";
  els.albumUploadButton.textContent = "上传图片";
  els.albumUploadButton.classList.remove("hidden");
  setExternalImageTools(true);
  setAlbumMediaVisible(true);
  const images = currentDiaryImages();
  els.albumImages.innerHTML = "";
  els.albumMediaCount.textContent = `${images.length + pendingDiaryUploads.length} 张`;

  if (!images.length && !pendingDiaryUploads.length) {
    mediaEmptyText("这条日记还没有图片，上传后会自动写入图片路径。");
    return;
  }

  for (const imagePath of images) {
    const card = renderImageCard(imagePath, imagePath, async () => {
      if (!(await showConfirm("删除日记图片？", `删除 ${imagePath}？点击“保存记录”后才会真正生效。`, "删除"))) return;
      setDiaryImages(currentDiaryImages().filter((value) => value !== imagePath));
      if (!isExternalImage(imagePath)) pendingManagedDeletes.add(imagePath);
      markRecordDirty();
      renderDiaryImages();
    });
    els.albumImages.appendChild(card);
  }

  for (const upload of pendingDiaryUploads) {
    const card = renderImageCard(`待上传: ${upload.file.name}`, upload.file.name, async () => {
      if (!(await showConfirm("移除待上传图片？", `这只会移除待上传图片 ${upload.file.name}，不会改动本地文件。`, "移除"))) return;
      pendingDiaryUploads = pendingDiaryUploads.filter((item) => item.id !== upload.id);
      revokePending(upload);
      markRecordDirty();
      renderDiaryImages();
    }, upload.previewUrl);
    els.albumImages.appendChild(card);
  }
}

function renderExternalAlbumImages() {
  if (activeCategory !== "albums" || albumMode() !== "external") return;
  const photos = parseAlbumPhotos();
  const cover = albumCoverInput()?.value.trim() || "";
  els.mediaTitle.textContent = "外链相册图片";
  els.albumImages.innerHTML = "";
  els.albumMediaCount.textContent = `${photos.length} 张`;
  setAlbumMediaVisible(true);
  setExternalImageTools(true);
  els.albumUploadButton.classList.add("hidden");

  if (!photos.length) {
    mediaEmptyText("还没有外链图片，粘贴图片 URL 后添加。第一张会自动作为封面。");
    return;
  }

  for (const photo of photos) {
    const src = String(photo.src || "");
    const title = String(photo.title || photo.alt || src);
    const label = src === cover ? `封面: ${title}` : title;
    const card = renderImageCard(label, src, async () => {
      if (!(await showConfirm("删除外链图片？", `删除 ${src}？点击“保存记录”后才会真正生效。`, "删除"))) return;
      const next = parseAlbumPhotos().filter((item) => String(item.src || "") !== src);
      setAlbumPhotos(next);
      syncAlbumCover(next);
      markRecordDirty();
      renderExternalAlbumImages();
    });
    els.albumImages.appendChild(card);
  }
}

async function loadAlbumImages() {
  const albumName = albumDirectoryName();
  if (!project || activeCategory !== "albums" || albumMode() === "external" || !albumName) {
    if (activeCategory === "albums" && albumMode() === "external") renderExternalAlbumImages();
    else setAlbumMediaVisible(false);
    return;
  }

  const currentProject = project;
  setExternalImageTools(false);
  els.albumUploadButton.classList.remove("hidden");
  setAlbumMediaVisible(true);
  const data = await post<{ images: { name: string; path: string }[] }>("/api/albums/images", {
    project: currentProject,
    album: albumName
  });

  els.albumImages.innerHTML = "";
  const visibleImages = data.images.filter((image) => !pendingAlbumDeletes.has(image.name));
  els.albumMediaCount.textContent = `${visibleImages.length + pendingAlbumUploads.length} 张`;
  if (!visibleImages.length && !pendingAlbumUploads.length) {
    mediaEmptyText("这个相册目录里还没有图片。");
    return;
  }

  for (const image of visibleImages) {
    const card = renderImageCard(image.name, image.path, async () => {
      if (!(await showConfirm("删除相册图片？", `删除图片 ${image.name}？点击“保存记录”后才会真正生效。`, "删除"))) return;
      pendingAlbumDeletes.add(image.name);
      markRecordDirty();
      appendLog(`已标记删除相册图片 ${image.name}`);
      await loadAlbumImages();
    });
    els.albumImages.appendChild(card);
  }

  for (const upload of pendingAlbumUploads) {
    const card = renderImageCard(`待上传: ${upload.file.name}`, upload.file.name, async () => {
      if (!(await showConfirm("移除待上传图片？", `这只会移除待上传图片 ${upload.file.name}，不会改动本地文件。`, "移除"))) return;
      pendingAlbumUploads = pendingAlbumUploads.filter((item) => item.id !== upload.id);
      revokePending(upload);
      markRecordDirty();
      await loadAlbumImages();
    }, upload.previewUrl);
    els.albumImages.appendChild(card);
  }

  els.albumMediaCount.textContent = `${visibleImages.length + pendingAlbumUploads.length} 张`;
}

async function uploadAlbumImages() {
  if (!project || !["albums", "diary", "devices", "anime"].includes(activeCategory)) return;
  const files = Array.from(els.albumUpload.files || []);
  if (activeCategory === "albums" && !albumDirectoryName()) {
    appendLog("请先填写相册目录名。");
    return;
  }
  if (!files.length) return;

  if (activeCategory === "diary") {
    pendingDiaryUploads.push(...files.map(createPendingUpload));
    markRecordDirty();
    renderDiaryImages();
  } else if (activeCategory === "devices" || activeCategory === "anime") {
    revokePending(pendingSingleUpload);
    pendingSingleUpload = createPendingUpload(files[0]);
    markRecordDirty();
    renderSingleImage();
  } else {
    pendingAlbumUploads.push(...files.map(createPendingUpload));
    activeRecordId = albumDirectoryName();
    await loadAlbumImages();
    markRecordDirty();
  }
  appendLog(`已暂存 ${files.length} 张图片，点击保存记录后写入本地。`);
  els.albumUpload.value = "";
}

function addExternalImage() {
  const url = els.externalImageUrl.value.trim();
  if (!/^https?:\/\/\S+$/i.test(url)) {
    appendLog("请输入有效的 http/https 图片外链。");
    return;
  }

  if (activeCategory === "diary") {
    setDiaryImages([...currentDiaryImages(), url]);
    markRecordDirty();
    renderDiaryImages();
    appendLog(`已添加日记外链图片 ${url}`);
    return;
  }

  if (activeCategory === "albums" && albumMode() === "external") {
    const photos = parseAlbumPhotos();
    if (!photos.some((photo) => String(photo.src || "") === url)) {
      photos.push({ src: url });
      setAlbumPhotos(photos);
      syncAlbumCover(photos);
      markRecordDirty();
      appendLog(`已添加相册外链图片 ${url}`);
    }
    renderExternalAlbumImages();
  }
}

async function uploadFiles(url: string, form: FormData) {
  const response = await fetch(url, { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "Upload failed");
  return data;
}

async function uploadPendingRecordMedia() {
  if (!project) return;

  if (activeCategory === "diary" && pendingDiaryUploads.length) {
    const form = new FormData();
    form.set("project", JSON.stringify(project));
    for (const upload of pendingDiaryUploads) form.append("files", upload.file);
    const data = await uploadFiles("/api/diary/images", form);
    setDiaryImages([...currentDiaryImages(), ...(data.paths || [])]);
    appendLog(`已写入 ${pendingDiaryUploads.length} 张日记图片。`);
  }

  if ((activeCategory === "devices" || activeCategory === "anime") && pendingSingleUpload) {
    const form = new FormData();
    form.set("project", JSON.stringify(project));
    form.set("folder", singleImageFolder());
    form.append("files", pendingSingleUpload.file);
    const data = await uploadFiles("/api/media/image", form);
    const input = singleImageInput();
    if (input) input.value = data.path || "";
    appendLog(`已写入${singleImageTitle()}。`);
  }
}

async function applyPendingDeletes() {
  if (!project) return;
  for (const imagePath of pendingManagedDeletes) {
    await post("/api/media/image", { project, action: "delete", path: imagePath });
    appendLog(`已删除图片 ${imagePath}`);
  }
}

async function savePendingAlbumMedia(albumName: string, deleteAlbumName: string) {
  if (!project || activeCategory !== "albums") return;
  if (albumMode() === "external") return;
  for (const name of pendingAlbumDeletes) {
    await post("/api/albums/images", { project, album: deleteAlbumName, action: "delete", name });
    appendLog(`已删除相册图片 ${name}`);
  }
  if (pendingAlbumUploads.length) {
    const form = new FormData();
    form.set("project", JSON.stringify(project));
    form.set("album", albumName);
    for (const upload of pendingAlbumUploads) form.append("files", upload.file);
    await uploadFiles("/api/albums/images", form);
    appendLog(`已写入 ${pendingAlbumUploads.length} 张相册图片。`);
  }
}

function getNested(item: Record<string, unknown> | null, key: string) {
  return key.split(".").reduce<unknown>((value, part) => (value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined), item || {});
}

function renderRecordForm(config: RecordConfig) {
  els.recordForm.innerHTML = "";
  for (const field of config.fields) {
    const label = document.createElement("label");
    if (field.input === "textarea" || field.input === "json") label.className = "wide";
    label.dataset.fieldKey = field.key;
    label.textContent = field.label;

    const input =
      field.input === "textarea"
        ? document.createElement("textarea")
        : field.input === "json"
          ? document.createElement("textarea")
        : field.input === "select"
          ? document.createElement("select")
          : document.createElement("input");
    input.name = field.key;
    if (field.input === "select") {
      for (const choice of field.options || []) {
        const option = document.createElement("option");
        option.value = choice.value;
        option.textContent = choice.label;
        input.appendChild(option);
      }
      input.className = "field-select-native";
    } else if (field.input === "boolean") (input as HTMLInputElement).type = "checkbox";
    else if (field.input === "date") (input as HTMLInputElement).type = "date";
    else if (field.input === "number") (input as HTMLInputElement).type = "number";
    else if (field.input !== "textarea" && field.input !== "json") (input as HTMLInputElement).type = "text";

    input.addEventListener("input", markRecordDirty);
    input.addEventListener("change", markRecordDirty);
    if (activeCategory === "diary" && field.key === "images") {
      label.classList.add("hidden-field");
      input.addEventListener("input", renderDiaryImages);
    }
    if ((activeCategory === "devices" && field.key === "image") || (activeCategory === "anime" && field.key === "cover")) {
      label.classList.add("hidden-field");
      input.addEventListener("input", renderSingleImage);
    }
    label.appendChild(input);
    if (field.input === "select") {
      const select = input as HTMLSelectElement;
      const picker = document.createElement("div");
      picker.className = "field-picker";

      const button = document.createElement("button");
      button.className = "field-picker-button";
      button.type = "button";
      button.textContent = select.options[select.selectedIndex]?.textContent || "选择";

      const menu = document.createElement("div");
      menu.className = "field-picker-menu";

      for (const choice of field.options || []) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "field-picker-option";
        option.dataset.value = choice.value;
        option.textContent = choice.label;
        option.addEventListener("click", () => {
          select.value = choice.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          markRecordDirty();
          syncFieldPicker(select);
          picker.classList.remove("open");
          label.classList.remove("field-open");
          if (activeCategory === "albums" && field.key === "mode") updateAlbumModeVisibility();
        });
        menu.appendChild(option);
      }

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const shouldOpen = !picker.classList.contains("open");
        closeFieldPickers();
        picker.classList.toggle("open", shouldOpen);
        label.classList.toggle("field-open", shouldOpen);
      });
      select.addEventListener("change", () => syncFieldPicker(select));
      if (field.key === "mode") select.addEventListener("change", updateAlbumModeVisibility);
      picker.append(button, menu);
      label.appendChild(picker);
      syncFieldPicker(select);
    }
    els.recordForm.appendChild(label);
  }
}

function setFormValues(record: Record<string, unknown> | null) {
  if (!activeRecordConfig) return;
  clearPendingMedia();
  hydratingForm = true;
  for (const field of activeRecordConfig.fields) {
    const input = els.recordForm.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${field.key}"]`);
    if (!input) continue;
    const value = getNested(record, field.key);
    if (field.input === "boolean") (input as HTMLInputElement).checked = Boolean(value);
    else if (field.input === "json") input.value = value === undefined || value === null ? "" : JSON.stringify(value, null, 2);
    else if (Array.isArray(value)) input.value = value.join(", ");
    else input.value = value === undefined || value === null ? "" : String(value);
    if (field.input === "select") syncFieldPicker(input as HTMLSelectElement);
  }
  updateAlbumModeVisibility();
  if (activeCategory === "diary") renderDiaryImages();
  if (activeCategory === "devices" || activeCategory === "anime") renderSingleImage();
  hydratingForm = false;
  recordDirty = false;
}

function formValues() {
  const item: Record<string, unknown> = {};
  if (!activeRecordConfig) return item;
  for (const field of activeRecordConfig.fields) {
    const input = els.recordForm.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${field.key}"]`);
    if (!input) continue;
    const label = input.closest("label");
    if (label?.classList.contains("hidden-field") && label.dataset.skipWhenHidden === "true") continue;
    if (field.input === "boolean") item[field.key] = (input as HTMLInputElement).checked;
    else if (field.input === "tags") item[field.key] = input.value.split(",").map((value) => value.trim()).filter(Boolean);
    else item[field.key] = input.value;
  }
  return item;
}

async function loadRecordCategory(category: CategoryKey, preferredId = "") {
  if (!project) return;
  activeCategory = category;
  const data = await post<{ config: RecordConfig; choices: RecordChoice[]; current?: Record<string, unknown> }>("/api/records", {
    project,
    type: category,
    action: "list"
  });
  activeRecordConfig = data.config;
  renderRecordForm(data.config);
  els.recordEditor.classList.toggle("hidden", data.config.mode === "markdown-single" || data.config.fields.length === 0);
  document.querySelector<HTMLElement>(".record-head")?.classList.toggle("hidden", data.config.mode === "markdown-single");
  els.deleteRecord.classList.toggle("hidden", data.config.mode === "markdown-single");
  els.recordSelect.innerHTML = "";
  for (const choice of data.choices) {
    const option = document.createElement("option");
    option.value = choice.value;
    option.textContent = choice.label;
    els.recordSelect.appendChild(option);
  }
  activeRecordId = preferredId && data.choices.some((choice) => choice.value === preferredId) ? preferredId : data.choices[0]?.value || "";
  els.recordSelect.value = activeRecordId;
  renderRecordPicker(data.choices);
  if (data.current) setFormValues(data.current);
  else if (activeRecordId) await loadSelectedRecord();
  else setFormValues(null);
  if (category === "albums" && activeRecordId) await loadAlbumImages();
  else if (category === "albums") updateAlbumModeVisibility();
  else if (category === "diary") renderDiaryImages();
  else if (category === "devices" || category === "anime") renderSingleImage();
  else setAlbumMediaVisible(false);
  setActiveCategory(category);
}

async function loadSelectedRecord() {
  if (!project || !activeRecordId) return;
  const data = await post<{ record: Record<string, unknown> | null }>("/api/records", {
    project,
    type: activeCategory,
    action: "read",
    id: activeRecordId
  });
  setFormValues(data.record);
  if (activeRecordConfig?.mode === "album-list") updateAlbumModeVisibility();
  if (activeCategory === "diary") renderDiaryImages();
  if (activeCategory === "devices" || activeCategory === "anime") renderSingleImage();
}

async function saveRecordForm() {
  if (!project) return;
  const previousRecordId = activeRecordId;
  await uploadPendingRecordMedia();
  const values = formValues();
  await post("/api/records", {
    project,
    type: activeCategory,
    action: "save",
    id: activeRecordId,
    item: values
  });
  if (activeCategory === "albums") {
    const albumName = String(values.__dirname || activeRecordId || "").trim();
    await savePendingAlbumMedia(albumName, previousRecordId || albumName);
  } else {
    await applyPendingDeletes();
  }
  appendLog(`已保存${activeRecordConfig?.label || "记录"}。`);
  recordDirty = false;
  clearPendingMedia();
  await loadRecordCategory(activeCategory, String(values.__dirname || values.path || activeRecordId || ""));
  await refreshFiles();
}

async function deleteRecordForm() {
  if (!project || !activeRecordConfig || !activeRecordId) {
    appendLog("请先选择要删除的记录。");
    return;
  }
  if (recordDirty || sourceDirty) {
    appendLog("当前页面还有未保存内容。请先保存或放弃修改后再删除记录。");
    return;
  }
  const label = els.recordPickerButton.textContent || activeRecordId;
  if (!(await showConfirm("删除记录？", `确定删除「${label}」吗？相关的本地图片也会一起删除。`, "删除"))) return;
  const data = await post<{ deletedImages?: string[] }>("/api/records", {
    project,
    type: activeCategory,
    action: "delete",
    id: activeRecordId
  });
  const deletedImages = data.deletedImages?.length ? `\n已删除图片: ${data.deletedImages.join(", ")}` : "";
  appendLog(`已删除${activeRecordConfig.label}: ${label}${deletedImages}`);
  if (activePath === activeRecordId) clearSourceEditor();
  activeRecordId = "";
  recordDirty = false;
  sourceDirty = false;
  clearPendingMedia();
  await loadRecordCategory(activeCategory);
  await refreshFiles();
}

async function newRecordForm() {
  if (!(await confirmDiscardChanges())) return;
  activeRecordId = "";
  els.recordSelect.value = "";
  setFormValues(null);
  if (activeCategory === "albums") {
    setAlbumMediaVisible(true);
    els.albumImages.innerHTML = "";
    els.albumMediaCount.textContent = "0 张";
    const empty = document.createElement("div");
    empty.className = "album-empty";
    empty.textContent = "保存相册目录后，这里会显示目录里的图片。";
    els.albumImages.appendChild(empty);
    updateAlbumModeVisibility();
  } else if (activeCategory === "diary") {
    setAlbumMediaVisible(true);
    renderDiaryImages();
  } else if (activeCategory === "devices" || activeCategory === "anime") {
    setAlbumMediaVisible(true);
    renderSingleImage();
  } else {
    setAlbumMediaVisible(false);
  }
}

async function openCategory(category: CategoryKey) {
  if (!(await confirmDiscardChanges())) return;
  if (!project) await applyProject();
  clearSourceEditor();
  await loadRecordCategory(category);

  const exactPaths: Record<CategoryKey, string[]> = {
    about: ["spec/about.md"],
    diary: ["data/diary.ts"],
    friends: ["data/friends.ts", "spec/friends.md"],
    blog: [],
    projects: ["data/projects.ts"],
    timeline: ["data/timeline.ts"],
    skills: ["data/skills.ts"],
    devices: ["data/devices.ts"],
    aiTools: ["data/ai-tools.ts"],
    anime: ["data/anime.ts"],
    albums: []
  };
  if (category === "albums") {
    appendLog("已切换到相册目录编辑。");
    setActiveCategory(category);
    return;
  }
  const exactMatch = exactPaths[category].find((path) => findFile(fileNodes, (candidate) => candidate === path));
  const fallbackMatch = category === "blog" ? findFile(fileNodes, (path) => path.startsWith("posts/") && /\.(md|mdx)$/i.test(path)) : null;
  const target = exactMatch || fallbackMatch;

  if (!target) {
    appendLog("没有找到对应分类的文件。");
    setActiveCategory(category);
    return;
  }
  await readFile(target);
}

async function applyProject() {
  project = collectProject();
  const data = await post<{ summary: string; project: ResolvedProjectInfo }>("/api/project", project);
  resolvedProject = data.project;
  await post<{ config: AppConfig }>("/api/config", project);
  appendLog(`项目配置已应用。\n${data.summary}`);
  els.previewFrame.src = data.project.previewUrl;
  els.previewLabel.textContent = data.project.previewUrl;
  els.applyProject.textContent = "修改";
  els.codeRoot.disabled = true;
  projectLocked = true;
  await refreshFiles();
  await loadRecordCategory(activeCategory);
}

function editProjectPath() {
  els.codeRoot.disabled = false;
  els.applyProject.textContent = "确定";
  projectLocked = false;
  els.codeRoot.focus();
}

async function refreshFiles() {
  if (!project) {
    appendLog("请先应用项目配置。");
    return;
  }
  const data = await post<{ files: FileNode[] }>("/api/files/list", project);
  fileNodes = data.files;
  renderTree(fileNodes);
  appendLog("文件目录已刷新。");
}

async function checkContentGitBeforePreview() {
  if (!project || resolvedProject?.contentMode !== "separated") return true;
  const data = await post<{ status: GitStatus }>("/api/git/status", { project });
  const status = data.status;
  appendLog(`启动预览前检查内容仓库 Git 状态。\n${status.summary}`);
  if (!status.isGitRepo) return true;
  if (!status.dirty && !status.ahead) return true;
  appendLog("内容分离模式下，启动预览会同步远程内容仓库，可能覆盖本地未推送内容。请先保存并点击“推送”，确认内容仓库干净后再启动预览。");
  return false;
}

async function pushContent() {
  if (!project) await applyProject();
  if (recordDirty || sourceDirty) {
    appendLog("当前页面还有未保存内容。请先点击“保存记录”或“保存”，再推送内容仓库。");
    return;
  }
  if (!(await showConfirm("推送内容仓库？", "这会在内容仓库中执行 git add、git commit 和 git push。确定继续吗？", "推送"))) return;
  const data = await post<{ message: string }>("/api/git/push", { project });
  appendLog(data.message);
}

async function readFile(path: string) {
  if (!(await confirmDiscardChanges())) return;
  if (!project) return;
  const data = await post<{ file: { content: string; path: string } }>("/api/files/read", { project, path });
  activePath = data.file.path;
  els.activeFile.textContent = activePath;
  els.activeType.textContent = classifyPath(activePath);
  els.editor.value = data.file.content;
  sourceDirty = false;
  markActiveFile(activePath);
  const category = categoryForPath(activePath);
  if (category) {
    setActiveCategory(category);
    await loadRecordCategory(category, activePath);
  }
  appendLog(`已打开 ${activePath}`);
}

async function saveFile() {
  if (!project || !activePath) {
    appendLog("请先选择文件。");
    return;
  }
  await post("/api/files/save", { project, path: activePath, content: els.editor.value });
  appendLog(`已保存 ${activePath}`);
  sourceDirty = false;
  await loadRecordCategory(activeCategory);
}

async function startPreview() {
  if (!project) await applyProject();
  if (!(await checkContentGitBeforePreview())) return;
  const data = await post<{ message: string }>("/api/preview/start", { project });
  appendLog(data.message);
}

async function stopPreview() {
  const data = await post<{ message: string }>("/api/preview/stop", {});
  appendLog(data.message);
}

function reloadPreview() {
  const url = els.previewLabel.textContent || "http://localhost:4321";
  els.previewFrame.src = url;
  els.previewLabel.textContent = url;
}

function setPreviewOpen(open: boolean) {
  els.previewDrawer.classList.toggle("open", open);
  els.previewDrawer.setAttribute("aria-hidden", String(!open));
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  appendLog(`错误: ${message}`);
}

async function restoreConfig() {
  const data = await get<{ config: AppConfig }>("/api/config");
  if (!data.config.codeRoot) return;
  els.codeRoot.value = data.config.codeRoot;
  await applyProject();
}

els.applyProject.addEventListener("click", () => {
  if (projectLocked) {
    editProjectPath();
    return;
  }
  guardUnsaved(() => applyProject()).catch(handleError);
});
els.codeRoot.addEventListener("input", () => {
  els.applyProject.textContent = "确定";
  projectLocked = false;
  resolvedProject = null;
});
els.pushContent.addEventListener("click", () => pushContent().catch(handleError));
els.refreshFiles.addEventListener("click", () => refreshFiles().catch(handleError));
els.saveFile.addEventListener("click", () => saveFile().catch(handleError));
els.editor.addEventListener("input", markSourceDirty);
els.recordPickerButton.addEventListener("click", () => setRecordPickerOpen(!els.recordPicker.classList.contains("open")));
els.albumUploadButton.addEventListener("click", () => els.albumUpload.click());
els.albumUpload.addEventListener("change", () => uploadAlbumImages().catch(handleError));
els.addExternalImage.addEventListener("click", addExternalImage);
els.externalImageUrl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addExternalImage();
  }
});
document.addEventListener("click", (event) => {
  if (!els.recordPicker.contains(event.target as Node)) setRecordPickerOpen(false);
  if (!(event.target as HTMLElement).closest(".field-picker")) closeFieldPickers();
});
els.saveRecord.addEventListener("click", () => saveRecordForm().catch(handleError));
els.newRecord.addEventListener("click", () => newRecordForm().catch(handleError));
els.deleteRecord.addEventListener("click", () => deleteRecordForm().catch(handleError));
els.startPreview.addEventListener("click", () => startPreview().catch(handleError));
els.stopPreview.addEventListener("click", () => stopPreview().catch(handleError));
els.reloadPreview.addEventListener("click", reloadPreview);
els.previewToggle.addEventListener("click", () => setPreviewOpen(true));
els.closePreview.addEventListener("click", () => setPreviewOpen(false));
els.imageLightboxClose.addEventListener("click", closeImageLightbox);
els.imageLightbox.addEventListener("click", (event) => {
  if (event.target === els.imageLightbox) closeImageLightbox();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeImageLightbox();
});
window.addEventListener("beforeunload", (event) => {
  if (!recordDirty && !sourceDirty) return;
  event.preventDefault();
  event.returnValue = "";
});
categoryButtons.forEach((button) => {
  button.addEventListener("click", () => openCategory(button.dataset.category as CategoryKey).catch(handleError));
});

restoreConfig().catch(handleError);

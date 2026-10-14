interface LauncherProject { codeRoot: string; contentMode: "integrated" | "separated"; contentRoot: string; contentRepoUrl: string; }
interface LauncherGitStatus { isGitRepo: boolean; dirty: boolean; ahead: boolean; summary: string; }
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pathInput = element<HTMLInputElement>("codeRoot");
const confirmButton = element<HTMLButtonElement>("confirmProject");
const launchButton = element<HTMLButtonElement>("launch");
const pushButton = element<HTMLButtonElement>("push");
const retryButton = element<HTMLButtonElement>("retry");
const statusLabel = element("status");
const logView = element("log");
let selected: LauncherProject | null = null;
let busy = false;
let readyUrl = "";
let checkingPreview = false;
const lines: string[] = [];

function log(message: string) {
  lines.push(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${message}`);
  if (lines.length > 80) lines.shift();
  logView.textContent = lines.join("\n");
  logView.scrollTop = logView.scrollHeight;
  void fetch("/api/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }).catch(() => undefined);
}

async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || data.message || "请求失败");
  return data;
}

function setBusy(value: boolean) {
  busy = value;
  confirmButton.disabled = value;
  pathInput.disabled = value;
  launchButton.disabled = value || !selected;
  pushButton.disabled = value;
  retryButton.disabled = value;
  if (!value) launchButton.textContent = readyUrl ? "进入博客" : "启动并进入博客";
}

function savedPreviewUrl(codeRoot: string) {
  try {
    const session = JSON.parse(sessionStorage.getItem("mcm-workspace") || "null");
    return session?.codeRoot === codeRoot && typeof session.previewUrl === "string" ? session.previewUrl : "";
  } catch { return ""; }
}

async function refreshPreview() {
  if (!selected || checkingPreview) return;
  const project = selected;
  checkingPreview = true;
  try {
    const state = await request<{ ready: boolean; previewUrl?: string }>("/api/preview/status", { project: { codeRoot: project.codeRoot }, previewUrl: savedPreviewUrl(project.codeRoot) });
    if (selected !== project) return;
    readyUrl = state.ready ? state.previewUrl || "" : "";
    launchButton.textContent = readyUrl ? "进入博客" : "启动并进入博客";
    statusLabel.textContent = readyUrl ? "博客运行中" : "仓库已确认";
  } finally { checkingPreview = false; }
}

function enterWorkspace(url: string) {
  if (!selected) return;
  sessionStorage.setItem("mcm-workspace", JSON.stringify({ codeRoot: selected.codeRoot, previewUrl: url }));
  window.location.assign("/workspace");
}

async function run(action: () => Promise<void>) {
  if (busy) return;
  setBusy(true);
  try { await action(); } catch (error) {
    statusLabel.textContent = "操作未完成";
    log(error instanceof Error ? error.message : String(error));
  } finally { setBusy(false); }
}

async function confirmProject() {
  const data = await request<{ project: LauncherProject; summary: string }>("/api/project", { codeRoot: pathInput.value });
  await request("/api/config", { codeRoot: data.project.codeRoot });
  selected = data.project;
  pathInput.value = selected.codeRoot;
  pathInput.readOnly = true;
  confirmButton.textContent = "修改";
  element("projectDetails").hidden = false;
  element("contentMode").textContent = selected.contentMode === "separated" ? "内容分离" : "内容一体";
  element("repoPath").textContent = selected.codeRoot;
  element("contentPath").textContent = selected.contentRoot;
  const separated = selected.contentMode === "separated";
  element("remoteLabel").hidden = !separated;
  element("remotePath").hidden = !separated;
  element("remotePath").textContent = selected.contentRepoUrl || "未配置";
  element("syncNotice").hidden = !separated;
  element("gitBlock").hidden = true;
  statusLabel.textContent = "仓库已确认";
  log(data.summary);
  await refreshPreview();
}

async function launch() {
  if (!selected) return;
  await refreshPreview();
  if (readyUrl) { enterWorkspace(readyUrl); return; }
  if (selected.contentMode === "separated") {
    statusLabel.textContent = "检查内容仓库…";
    const { status } = await request<{ status: LauncherGitStatus }>("/api/git/status", { project: { codeRoot: selected.codeRoot } });
    log(status.summary);
    if (!status.isGitRepo || status.dirty || status.ahead) {
      element("gitBlock").hidden = false;
      element("gitMessage").textContent = status.isGitRepo ? "内容仓库有未提交或未推送的变更。请先提交并推送，再启动博客。" : "无法确认内容仓库状态，请检查内容目录及 Git 配置后重试。首次使用请先在代码仓库完成内容同步。";
      pushButton.hidden = !status.isGitRepo;
      statusLabel.textContent = "等待处理内容仓库";
      return;
    }
  }
  element("gitBlock").hidden = true;
  statusLabel.textContent = "正在启动博客…";
  launchButton.textContent = "正在启动…";
  try {
    const result = await request<{ ready: boolean; previewUrl?: string; message: string }>("/api/preview/start", { project: { codeRoot: selected.codeRoot } });
    log(result.message);
    if (!result.ready || !result.previewUrl) { statusLabel.textContent = "博客尚未就绪，可稍后重试"; return; }
    readyUrl = result.previewUrl;
    enterWorkspace(readyUrl);
  } finally { launchButton.textContent = readyUrl ? "进入博客" : "启动并进入博客"; }
}

element<HTMLFormElement>("projectForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (busy) return;
  if (selected) {
    selected = null; readyUrl = ""; pathInput.readOnly = false; confirmButton.textContent = "确定";
    launchButton.textContent = "启动并进入博客";
    element("projectDetails").hidden = true; element("gitBlock").hidden = true;
    launchButton.disabled = true; statusLabel.textContent = "等待确认仓库"; pathInput.focus();
    return;
  }
  void run(confirmProject);
});
launchButton.addEventListener("click", () => void run(launch));
retryButton.addEventListener("click", () => void run(launch));
pushButton.addEventListener("click", () => void run(async () => {
  if (!selected) return;
  statusLabel.textContent = "正在提交并推送…";
  const result = await request<{ message: string }>("/api/git/push", { project: { codeRoot: selected.codeRoot } });
  log(result.message); statusLabel.textContent = "内容已推送，可以启动博客";
}));
element("clearLog").addEventListener("click", () => { lines.length = 0; logView.textContent = "暂无日志"; });
void run(async () => {
  const data = await request<{ config: { codeRoot?: string } }>("/api/config");
  if (data.config.codeRoot) { pathInput.value = data.config.codeRoot; await confirmProject(); }
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted && !busy) void run(refreshPreview);
});
window.setInterval(() => {
  if (!busy && selected) void refreshPreview().catch(() => {
    readyUrl = "";
    launchButton.textContent = "启动并进入博客";
    statusLabel.textContent = "暂时无法确认博客状态";
  });
}, 10000);

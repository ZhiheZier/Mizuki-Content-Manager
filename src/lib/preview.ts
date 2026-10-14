import { spawn, type ChildProcess } from "node:child_process";
import { DEFAULT_DEV_COMMAND, looksLikeMizukiRepo, type ResolvedProject } from "./source";
import { previewGitEnvironment } from "./git";
import { redactCredentials } from "./logs";

type PreviewResult = {
  running: boolean;
  ready?: boolean;
  previewUrl?: string;
  message: string;
};

let processRef: ChildProcess | null = null;
let meta: { codeRoot: string; command: string; startedAt: number } | null = null;
let lastOutput = "";
let lastPreviewUrl = "";
let lastProjectRoot = "";

function commandParts(command: string) {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return commandParts(DEFAULT_DEV_COMMAND);
  return parts;
}

function detectPreviewUrl(text: string) {
  const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/i);
  return match?.[0] || "";
}

function appendOutput(chunk: unknown) {
  const text = redactCredentials(String(chunk || ""));
  lastOutput = `${lastOutput}${text}`.split(/\r?\n/).slice(-20).join("\n");
  const detectedUrl = detectPreviewUrl(text);
  if (detectedUrl) lastPreviewUrl = detectedUrl;
}

function spawnPreview(command: string, project: ResolvedProject, useSystemFonts = false) {
  const cwd = project.codeRoot;
  const env = { ...previewGitEnvironment(project.codeRoot, project.contentRoot), ASTRO_DEV_TOOLBAR: "false" };
  if (useSystemFonts) Object.assign(env, { MIZUKI_FONT_MODE: "system" });
  if (process.platform !== "win32") {
    const [cmd, ...args] = commandParts(command);
    return spawn(cmd, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
  }

  return spawn("cmd.exe", ["/d", "/s", "/c", command], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPreviewReady(url: string) {
  if (!url) return false;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1200)
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function currentReadyUrl(fallbackUrl: string) {
  const detectedUrl = detectPreviewUrl(lastOutput) || lastPreviewUrl;
  if (detectedUrl && await isPreviewReady(detectedUrl)) {
    lastPreviewUrl = detectedUrl;
    return detectedUrl;
  }
  if (await isPreviewReady(fallbackUrl)) {
    lastPreviewUrl = fallbackUrl;
    return fallbackUrl;
  }
  return "";
}

async function waitForPreview(fallbackUrl: string, child: ChildProcess, timeoutMs = 25000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const readyUrl = await currentReadyUrl(fallbackUrl);
    if (readyUrl) return readyUrl;
    if (child.exitCode !== null) return "";
    await sleep(600);
  }
  return "";
}

export function previewStatus(): PreviewResult {
  const previewUrl = lastPreviewUrl || "";
  if (!processRef) return { running: false, previewUrl, message: "预览服务未启动。" };
  const code = processRef.exitCode;
  if (code === null) {
    const elapsed = meta ? Math.round((Date.now() - meta.startedAt) / 1000) : 0;
    return {
      running: true,
      previewUrl,
      message: `预览服务运行中。\n代码仓库: ${meta?.codeRoot}\n命令: ${meta?.command}\n运行时长: ${elapsed}s`
    };
  }
  return { running: false, previewUrl, message: `预览服务已退出，退出码 ${code}。\n${lastOutput}`.trim() };
}

export async function checkPreviewStatus(project: ResolvedProject, knownUrl = ""): Promise<PreviewResult> {
  if (lastProjectRoot && lastProjectRoot !== project.codeRoot) {
    return { running: false, ready: false, message: "当前仓库的博客未启动。" };
  }
  const candidate = lastPreviewUrl || knownUrl;
  try {
    const url = new URL(candidate);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid preview URL");
    if (await isPreviewReady(url.origin)) {
      lastProjectRoot = project.codeRoot;
      lastPreviewUrl = url.origin;
      return { running: true, ready: true, previewUrl: url.origin, message: "博客运行中" };
    }
  } catch {}
  return { running: false, ready: false, message: "博客未启动" };
}

export async function startPreview(project: ResolvedProject, command = DEFAULT_DEV_COMMAND, useSystemFonts = false): Promise<PreviewResult> {
  if (processRef && processRef.exitCode === null) {
    if (meta?.codeRoot !== project.codeRoot) {
      return { running: false, ready: false, message: "另一仓库的预览仍在运行，请先停止该预览后再切换仓库。" };
    }
    const previewUrl = await currentReadyUrl(project.previewUrl);
    return { ...previewStatus(), ready: Boolean(previewUrl), previewUrl: previewUrl || lastPreviewUrl || project.previewUrl };
  }
  if (!looksLikeMizukiRepo(project.codeRoot)) {
    return {
      running: false,
      ready: false,
      previewUrl: project.previewUrl,
      message: `无法启动预览。未检测到 Mizuki/Astro 代码仓库: ${project.codeRoot}`
    };
  }

  lastOutput = "";
  lastPreviewUrl = "";
  lastProjectRoot = project.codeRoot;

  const child = spawnPreview(command, project, useSystemFonts);
  processRef = child;
  meta = { codeRoot: project.codeRoot, command, startedAt: Date.now() };
  child.stdout?.on("data", appendOutput);
  child.stderr?.on("data", appendOutput);

  return new Promise<PreviewResult>((resolve) => {
    let settled = false;
    const finish = (result: PreviewResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(async () => {
      const readyUrl = await waitForPreview(project.previewUrl, child);
      if (readyUrl) {
        finish({
          ...previewStatus(),
          ready: true,
          previewUrl: readyUrl,
          message: `${previewStatus().message}\n预览地址已可访问: ${readyUrl}`
        });
        return;
      }

      const previewUrl = detectPreviewUrl(lastOutput) || lastPreviewUrl || project.previewUrl;
      finish({
        ...previewStatus(),
        ready: false,
        previewUrl,
        message: `${previewStatus().message}\n预览进程已启动，但 ${previewUrl} 暂时还没有响应。\n请稍等几秒后再点“预览”或“刷新预览”。\n${lastOutput}`.trim()
      });
    }, 900);

    child.once("error", (error) => {
      processRef = null;
      meta = null;
      finish({
        running: false,
        ready: false,
        previewUrl: project.previewUrl,
        message: `预览启动失败: ${error.message}\n请确认已安装 pnpm，并且 Mizuki 仓库可以在终端中运行 pnpm dev。`
      });
    });

    child.once("exit", async (code) => {
      await sleep(100);
      const detectedUrl = detectPreviewUrl(lastOutput) || lastPreviewUrl;
      const fontDownloadFailed = lastOutput.includes("CannotFetchFontFile");
      processRef = null;
      meta = null;
      if (!settled && !useSystemFonts && fontDownloadFailed) {
        settled = true;
        clearTimeout(timer);
        const retry = await startPreview(project, command, true);
        resolve({ ...retry, message: `远程字体下载失败，已使用系统字体重试本地预览（字体外观可能不同）。\n${retry.message}` });
        return;
      }
      if (detectedUrl) {
        isPreviewReady(detectedUrl).then((ready) => {
          finish({
            running: ready,
            ready,
            previewUrl: detectedUrl,
            message: ready
              ? `检测到已有预览服务: ${detectedUrl}`
              : `预览服务启动后退出，退出码 ${code ?? "未知"}。\n${lastOutput}`.trim()
          });
        });
        return;
      }
      finish({
        running: false,
        ready: false,
        previewUrl: project.previewUrl,
        message: `预览服务启动后立即退出，退出码 ${code ?? "未知"}。\n${lastOutput}`.trim()
      });
    });
  });
}

export async function stopPreview() {
  if (!processRef) return { running: false, message: "预览服务未启动。" };
  if (processRef.exitCode === null) {
    if (process.platform === "win32" && processRef.pid) {
      spawn("taskkill", ["/pid", String(processRef.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      processRef.kill();
    }
  }
  processRef = null;
  meta = null;
  lastPreviewUrl = "";
  lastProjectRoot = "";
  return { running: false, message: "预览服务已停止。" };
}

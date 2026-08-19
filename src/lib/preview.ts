import { spawn, type ChildProcess } from "node:child_process";
import { DEFAULT_DEV_COMMAND, looksLikeMizukiRepo, type ResolvedProject } from "./source";

let processRef: ChildProcess | null = null;
let meta: { codeRoot: string; command: string; startedAt: number } | null = null;
let lastOutput = "";

function commandParts(command: string) {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return commandParts(DEFAULT_DEV_COMMAND);
  return parts;
}

function appendOutput(chunk: unknown) {
  const text = String(chunk || "");
  lastOutput = `${lastOutput}${text}`.split(/\r?\n/).slice(-12).join("\n");
}

export function previewStatus() {
  if (!processRef) return { running: false, message: "预览服务未启动。" };
  const code = processRef.exitCode;
  if (code === null) {
    const elapsed = meta ? Math.round((Date.now() - meta.startedAt) / 1000) : 0;
    return {
      running: true,
      message: `预览服务运行中。\n代码仓库: ${meta?.codeRoot}\n命令: ${meta?.command}\n运行时长: ${elapsed}s`
    };
  }
  return { running: false, message: `预览服务已退出，退出码 ${code}。\n${lastOutput}`.trim() };
}

export async function startPreview(project: ResolvedProject, command = DEFAULT_DEV_COMMAND) {
  if (processRef && processRef.exitCode === null) return previewStatus();
  if (!looksLikeMizukiRepo(project.codeRoot)) {
    return {
      running: false,
      message: `无法启动预览。未检测到 Mizuki/Astro 代码仓库: ${project.codeRoot}`
    };
  }

  const [cmd, ...args] = commandParts(command);
  lastOutput = "";

  const child = spawn(cmd, args, {
    cwd: project.codeRoot,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    windowsHide: true
  });
  processRef = child;
  meta = { codeRoot: project.codeRoot, command, startedAt: Date.now() };
  child.stdout?.on("data", appendOutput);
  child.stderr?.on("data", appendOutput);

  return new Promise<{ running: boolean; message: string }>((resolve) => {
    let settled = false;
    const finish = (result: { running: boolean; message: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => finish(previewStatus()), 900);

    child.once("error", (error) => {
      processRef = null;
      meta = null;
      finish({
        running: false,
        message: `预览启动失败: ${error.message}\n请确认已安装 pnpm，并且 Mizuki 仓库可以在终端中运行 pnpm dev。`
      });
    });

    child.once("exit", (code) => {
      processRef = null;
      meta = null;
      finish({
        running: false,
        message: `预览服务启动后立即退出，退出码 ${code ?? "未知"}。\n${lastOutput}`.trim()
      });
    });
  });
}

export async function stopPreview() {
  if (!processRef) return { running: false, message: "预览服务未启动。" };
  if (processRef.exitCode === null) {
    processRef.kill();
  }
  processRef = null;
  meta = null;
  return { running: false, message: "预览服务已停止。" };
}

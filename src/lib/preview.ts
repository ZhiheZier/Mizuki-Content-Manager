import { spawn, type ChildProcess } from "node:child_process";
import { DEFAULT_DEV_COMMAND, looksLikeMizukiRepo, type ResolvedProject } from "./source";

let processRef: ChildProcess | null = null;
let meta: { codeRoot: string; command: string; startedAt: number } | null = null;

function commandParts(command: string) {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return commandParts(DEFAULT_DEV_COMMAND);
  if (process.platform === "win32" && parts[0] === "pnpm") parts[0] = "pnpm.cmd";
  return parts;
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
  return { running: false, message: `预览服务已退出，退出码 ${code}。` };
}

export function startPreview(project: ResolvedProject, command = DEFAULT_DEV_COMMAND) {
  if (processRef && processRef.exitCode === null) return previewStatus();
  if (!looksLikeMizukiRepo(project.codeRoot)) {
    return {
      running: false,
      message: `无法启动预览。未检测到 Mizuki/Astro 代码仓库: ${project.codeRoot}`
    };
  }

  const [cmd, ...args] = commandParts(command);
  const child = spawn(cmd, args, {
    cwd: project.codeRoot,
    stdio: "ignore",
    shell: false,
    windowsHide: true
  });
  processRef = child;
  meta = { codeRoot: project.codeRoot, command, startedAt: Date.now() };
  child.once("exit", () => {
    meta = null;
  });
  return previewStatus();
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

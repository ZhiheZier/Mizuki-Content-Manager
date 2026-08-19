import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ResolvedProject } from "./source";

const execFileAsync = promisify(execFile);

export interface GitStatus {
  repoRoot: string;
  isGitRepo: boolean;
  dirty: boolean;
  ahead: boolean;
  branch: string;
  summary: string;
  output: string;
}

function gitRepoRoot(project: ResolvedProject) {
  return project.contentMode === "separated" ? project.contentRoot : project.codeRoot;
}

async function git(args: string[], cwd: string) {
  const result = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    timeout: 120_000,
    maxBuffer: 1024 * 1024
  });
  return `${result.stdout || ""}${result.stderr || ""}`.trim();
}

function parseStatus(output: string, repoRoot: string): GitStatus {
  const lines = output.split(/\r?\n/).filter(Boolean);
  const branchLine = lines.find((line) => line.startsWith("##")) || "";
  const branch = branchLine.replace(/^##\s*/, "").split("...")[0].trim() || "unknown";
  const dirtyLines = lines.filter((line) => !line.startsWith("##"));
  const ahead = /\[.*ahead \d+/i.test(branchLine);
  const dirty = dirtyLines.length > 0;
  const pieces = [`仓库: ${repoRoot}`, `分支: ${branch}`];
  if (dirty) pieces.push(`未提交变更: ${dirtyLines.length} 项`);
  if (ahead) pieces.push("本地有未推送提交");
  if (!dirty && !ahead) pieces.push("状态: 干净");
  return {
    repoRoot,
    isGitRepo: true,
    dirty,
    ahead,
    branch,
    summary: pieces.join("\n"),
    output
  };
}

export async function readGitStatus(project: ResolvedProject): Promise<GitStatus> {
  const repoRoot = gitRepoRoot(project);
  try {
    const output = await git(["status", "--porcelain=v1", "--branch"], repoRoot);
    return parseStatus(output, repoRoot);
  } catch (error) {
    return {
      repoRoot,
      isGitRepo: false,
      dirty: false,
      ahead: false,
      branch: "",
      summary: `不是 Git 仓库或无法读取状态: ${repoRoot}\n${error instanceof Error ? error.message : String(error)}`,
      output: ""
    };
  }
}

export async function commitAndPushContent(project: ResolvedProject) {
  const status = await readGitStatus(project);
  if (!status.isGitRepo) return { ok: false, message: status.summary, status };

  let committed = false;
  if (status.dirty) {
    await git(["add", "-A"], status.repoRoot);
    const message = `Update Mizuki content ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;
    await git(["commit", "-m", message], status.repoRoot);
    committed = true;
  }

  const afterCommit = await readGitStatus(project);
  if (committed || afterCommit.ahead) {
    const pushOutput = await git(["push"], status.repoRoot);
    const finalStatus = await readGitStatus(project);
    return {
      ok: true,
      message: [`内容仓库已推送。`, finalStatus.summary, pushOutput].filter(Boolean).join("\n"),
      status: finalStatus
    };
  }

  return {
    ok: true,
    message: `没有需要推送的内容。\n${afterCommit.summary}`,
    status: afterCommit
  };
}

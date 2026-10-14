import fs from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_RETENTION_DAYS = 14;
const LOG_MAX_FILES = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function redactCredentials(text: string) {
  return text.replace(/(https?:\/\/)[^\s/@]+@/gi, "$1[redacted]@");
}

function logFileName(date = new Date()) {
  return `${date.toISOString().slice(0, 10)}.log`;
}

function cleanupLogs(now = new Date()) {
  if (!fs.existsSync(LOG_DIR)) return;

  const files = fs
    .readdirSync(LOG_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}\.log$/.test(entry.name))
    .map((entry) => {
      const fullPath = path.join(LOG_DIR, entry.name);
      return { name: entry.name, fullPath };
    })
    .sort((a, b) => b.name.localeCompare(a.name));

  const cutoff = now.getTime() - LOG_RETENTION_DAYS * DAY_MS;
  const stale = files.filter((file, index) => {
    const day = Date.parse(file.name.slice(0, 10));
    return day < cutoff || index >= LOG_MAX_FILES;
  });

  for (const file of stale) {
    try {
      fs.unlinkSync(file.fullPath);
    } catch {
      // Log cleanup should never block the actual user operation.
    }
  }
}

export function appendAppLog(message: string) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  cleanupLogs();
  const time = new Date().toISOString();
  const lines = redactCredentials(String(message || ""))
    .split(/\r?\n/)
    .map((line) => `[${time}] ${line}`)
    .join("\n");
  fs.appendFileSync(path.join(LOG_DIR, logFileName()), `${lines}\n`, "utf8");
}

export function listAppLogs() {
  if (!fs.existsSync(LOG_DIR)) return [];
  return fs.readdirSync(LOG_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}\.log$/.test(entry.name))
    .map((entry) => entry.name.slice(0, -4))
    .sort().reverse();
}

export function readAppLog(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("无效的日志日期。");
  const filename = path.join(LOG_DIR, `${date}.log`);
  if (!fs.existsSync(filename)) return "";
  const file = fs.openSync(filename, "r");
  try {
    const size = fs.fstatSync(file).size;
    const start = Math.max(0, size - 512 * 1024);
    const buffer = Buffer.alloc(Math.min(size, 512 * 1024));
    fs.readSync(file, buffer, 0, buffer.length, start);
    const content = buffer.toString("utf8");
    // Skip an incomplete first line when reading the tail of a large log.
    return redactCredentials(start ? content.slice(content.indexOf("\n") + 1) : content);
  } finally { fs.closeSync(file); }
}

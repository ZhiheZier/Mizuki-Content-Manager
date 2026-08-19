import fs from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_RETENTION_DAYS = 14;
const LOG_MAX_FILES = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  const lines = String(message || "")
    .split(/\r?\n/)
    .map((line) => `[${time}] ${line}`)
    .join("\n");
  fs.appendFileSync(path.join(LOG_DIR, logFileName()), `${lines}\n`, "utf8");
}

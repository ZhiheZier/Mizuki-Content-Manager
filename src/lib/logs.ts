import fs from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "logs");

function logFileName(date = new Date()) {
  return `${date.toISOString().slice(0, 10)}.log`;
}

export function appendAppLog(message: string) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const time = new Date().toISOString();
  const lines = String(message || "")
    .split(/\r?\n/)
    .map((line) => `[${time}] ${line}`)
    .join("\n");
  fs.appendFileSync(path.join(LOG_DIR, logFileName()), `${lines}\n`, "utf8");
}

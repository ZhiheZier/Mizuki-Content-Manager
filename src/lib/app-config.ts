import fs from "node:fs";
import path from "node:path";

export interface AppConfig {
  codeRoot?: string;
}

const CONFIG_PATH = path.join(process.cwd(), ".mcm-config.json");

export function readAppConfig(): AppConfig {
  if (!fs.existsSync(CONFIG_PATH)) return {};

  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as AppConfig;
  } catch {
    return {};
  }
}

export function writeAppConfig(config: AppConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  return config;
}

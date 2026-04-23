import { getPreferenceValues, showHUD } from "@raycast/api";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename } from "node:path";

interface Prefs {
  helperPath: string;
}

export default async function main() {
  const { helperPath } = getPreferenceValues<Prefs>();

  if (!existsSync(helperPath)) {
    await showHUD(`❌ Water Reminder: helper not found at ${helperPath}`);
    return;
  }

  spawnSync("/usr/bin/pkill", ["-x", basename(helperPath)]);

  const child = spawn(helperPath, [], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

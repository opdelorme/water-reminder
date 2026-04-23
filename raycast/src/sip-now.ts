import { getPreferenceValues, showHUD } from "@raycast/api";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

interface Prefs {
  helperPath: string;
}

export default async function main() {
  const { helperPath } = getPreferenceValues<Prefs>();

  if (!existsSync(helperPath)) {
    await showHUD(`❌ Water Reminder: helper not found at ${helperPath}`);
    return;
  }

  const child = spawn(helperPath, [], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

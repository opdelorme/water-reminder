import { getPreferenceValues, showHUD } from "@raycast/api";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { detectMeeting } from "./lib/detection";
import { loadRules } from "./lib/storage";

interface Prefs {
  helperPath: string;
  skipWhenInMeeting: boolean;
}

export default async function main() {
  const { helperPath, skipWhenInMeeting } = getPreferenceValues<Prefs>();

  if (!existsSync(helperPath)) {
    await showHUD(`❌ Water Reminder: helper not found at ${helperPath}`);
    return;
  }

  if (skipWhenInMeeting) {
    const rules = await loadRules();
    const { inMeeting, reason } = await detectMeeting(rules, helperPath);
    if (inMeeting) {
      await showHUD(`🔕 Skipped — ${reason}`);
      return;
    }
  }

  spawnSync("/usr/bin/pkill", ["-x", basename(helperPath)]);

  const child = spawn(helperPath, [], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

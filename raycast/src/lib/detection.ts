import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { dirname } from "node:path";

const execFileAsync = promisify(execFile);

export type AppKind = "app" | "browser";

export interface MeetingAppRule {
  bundleId: string;
  name: string;
  kind: AppKind;
  enabled: boolean;
  browserDomains?: string[];
}

export const DEFAULT_RULES: MeetingAppRule[] = [
  { bundleId: "us.zoom.xos", name: "Zoom", kind: "app", enabled: true },
  { bundleId: "com.microsoft.teams2", name: "Microsoft Teams", kind: "app", enabled: true },
  { bundleId: "com.microsoft.teams", name: "Microsoft Teams (classic)", kind: "app", enabled: true },
  { bundleId: "com.tinyspeck.slackmacgap", name: "Slack", kind: "app", enabled: true },
  { bundleId: "com.apple.FaceTime", name: "FaceTime", kind: "app", enabled: true },
  { bundleId: "com.hnc.Discord", name: "Discord", kind: "app", enabled: false },
  { bundleId: "Cisco-Systems.Spark", name: "Webex", kind: "app", enabled: true },
  {
    bundleId: "com.google.Chrome",
    name: "Google Chrome",
    kind: "browser",
    enabled: true,
    browserDomains: ["meet.google.com", "zoom.us/j/", "teams.microsoft.com/l/meetup-join", "teams.live.com/meet"],
  },
  {
    bundleId: "company.thebrowser.Browser",
    name: "Arc",
    kind: "browser",
    enabled: true,
    browserDomains: ["meet.google.com", "zoom.us/j/", "teams.microsoft.com/l/meetup-join", "teams.live.com/meet"],
  },
  {
    bundleId: "com.apple.Safari",
    name: "Safari",
    kind: "browser",
    enabled: false,
    browserDomains: ["meet.google.com", "zoom.us/j/", "teams.microsoft.com/l/meetup-join"],
  },
  {
    bundleId: "com.brave.Browser",
    name: "Brave",
    kind: "browser",
    enabled: false,
    browserDomains: ["meet.google.com", "zoom.us/j/", "teams.microsoft.com/l/meetup-join"],
  },
];

export function micActive(helperPath: string): boolean {
  const probe = `${dirname(helperPath)}/mic-active`;
  const res = spawnSync(probe, [], { timeout: 3000 });
  return res.status === 0;
}

export async function runningAppBundleIds(): Promise<Set<string>> {
  const script = `
    set output to ""
    tell application "System Events"
      repeat with p in (every process whose background only is false)
        try
          set bid to bundle identifier of p
          if bid is not missing value then
            set output to output & bid & linefeed
          end if
        end try
      end repeat
    end tell
    return output
  `;
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], { timeout: 5000 });
    return new Set(
      stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

export async function browserActiveUrls(bundleId: string): Promise<string[]> {
  const appMap: Record<string, string> = {
    "com.google.Chrome": "Google Chrome",
    "company.thebrowser.Browser": "Arc",
    "com.apple.Safari": "Safari",
    "com.brave.Browser": "Brave Browser",
  };
  const appName = appMap[bundleId];
  if (!appName) return [];

  let script: string;
  if (bundleId === "com.apple.Safari") {
    script = `
      set urls to ""
      tell application "Safari"
        repeat with w in windows
          try
            set urls to urls & (URL of current tab of w) & linefeed
          end try
        end repeat
      end tell
      return urls
    `;
  } else {
    script = `
      set urls to ""
      tell application "${appName}"
        repeat with w in windows
          repeat with t in tabs of w
            try
              set urls to urls & (URL of t) & linefeed
            end try
          end repeat
        end repeat
      end tell
      return urls
    `;
  }

  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], { timeout: 5000 });
    return stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function detectMeeting(
  rules: MeetingAppRule[],
  helperPath: string,
): Promise<{ inMeeting: boolean; reason: string }> {
  const enabled = rules.filter((r) => r.enabled);
  if (enabled.length === 0) return { inMeeting: false, reason: "" };

  const running = await runningAppBundleIds();
  const activeRules = enabled.filter((r) => running.has(r.bundleId));
  if (activeRules.length === 0) return { inMeeting: false, reason: "" };

  const micOn = micActive(helperPath);

  for (const rule of activeRules) {
    if (rule.kind === "app") {
      if (micOn) return { inMeeting: true, reason: `${rule.name} active + mic on` };
    } else {
      const urls = await browserActiveUrls(rule.bundleId);
      const domains = rule.browserDomains ?? [];
      const hit = urls.find((u) => domains.some((d) => u.includes(d)));
      if (hit) return { inMeeting: true, reason: `${rule.name} tab on meeting URL` };
      if (micOn && urls.some((u) => domains.some((d) => u.includes(d)))) {
        return { inMeeting: true, reason: `${rule.name} + mic on` };
      }
    }
  }

  return { inMeeting: false, reason: "" };
}

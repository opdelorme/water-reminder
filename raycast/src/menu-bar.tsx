import {
  Icon,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import {
  DEFAULT_INTERVAL_MINUTES,
  INTERVAL_CHOICES,
  formatCountdown,
  getIntervalMinutes,
  getLastFireAt,
  isPaused,
  recordFire,
  setIntervalMinutes,
  setPaused,
} from "./lib/state";
import { detectMeeting } from "./lib/detection";
import { loadRules } from "./lib/storage";

interface Prefs {
  helperPath: string;
  skipWhenInMeeting: boolean;
}

export default function MenuBar() {
  const { helperPath, skipWhenInMeeting } = getPreferenceValues<Prefs>();
  const [lastFireAt, setLastFireAt] = useState<number | null>(null);
  const [paused, setPausedState] = useState(false);
  const [intervalMin, setIntervalMinState] = useState(DEFAULT_INTERVAL_MINUTES);
  const [meetingReason, setMeetingReason] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [last, p, ival, rules] = await Promise.all([
        getLastFireAt(),
        isPaused(),
        getIntervalMinutes(),
        loadRules(),
      ]);
      if (cancelled) return;
      setLastFireAt(last);
      setPausedState(p);
      setIntervalMinState(ival);
      if (skipWhenInMeeting && !p) {
        try {
          const { inMeeting, reason } = await detectMeeting(rules, helperPath);
          if (!cancelled) setMeetingReason(inMeeting ? reason : null);
        } catch {
          if (!cancelled) setMeetingReason(null);
        }
      }
    })();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [helperPath, skipWhenInMeeting]);

  const intervalMs = intervalMin * 60 * 1000;
  const msUntil = lastFireAt != null ? lastFireAt + intervalMs - now : 0;

  let title: string;
  if (paused) title = "paused";
  else if (meetingReason) title = `pause · ${formatCountdown(msUntil)}`;
  else if (lastFireAt == null) title = `${intervalMin}m`;
  else title = formatCountdown(msUntil);

  async function sipNow() {
    if (!existsSync(helperPath)) {
      await showHUD(`❌ Helper not found at ${helperPath}`);
      return;
    }
    spawnSync("/usr/bin/pkill", ["-x", basename(helperPath)]);
    spawn(helperPath, [], { detached: true, stdio: "ignore" }).unref();
    await recordFire();
    setLastFireAt(Date.now());
  }

  async function togglePaused() {
    const next = !paused;
    await setPaused(next);
    setPausedState(next);
  }

  async function chooseInterval(min: number) {
    await setIntervalMinutes(min);
    setIntervalMinState(min);
  }

  return (
    <MenuBarExtra icon="💧" title={title} tooltip="Water Reminder">
      <MenuBarExtra.Section
        title={
          paused
            ? "Reminders paused"
            : meetingReason
              ? `Paused — ${meetingReason}`
              : lastFireAt
                ? `Next in ${formatCountdown(msUntil)}`
                : `Every ${intervalMin}m`
        }
      />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon="💧"
          title="Sip Now"
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={sipNow}
        />
        <MenuBarExtra.Item
          icon={paused ? Icon.Play : Icon.Pause}
          title={paused ? "Resume Reminders" : "Pause Reminders"}
          onAction={togglePaused}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Submenu icon={Icon.Clock} title={`Interval — every ${intervalMin}m`}>
        {INTERVAL_CHOICES.map((m) => (
          <MenuBarExtra.Item
            key={m}
            icon={m === intervalMin ? Icon.CheckCircle : Icon.Circle}
            title={`Every ${m} minute${m === 1 ? "" : "s"}`}
            onAction={() => chooseInterval(m)}
          />
        ))}
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title="Configure Meeting Detection"
          onAction={() => launchCommand({ name: "configure", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.MagnifyingGlass}
          title="Debug Meeting Detection"
          onAction={() => launchCommand({ name: "debug", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open Repo on GitHub"
          onAction={() => open("https://github.com/opdelorme/water-reminder")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

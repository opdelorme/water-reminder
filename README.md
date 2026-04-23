# Water Reminder

Raycast extension + native macOS helper that nudges you to drink water on a custom interval. A blue border pulses around every display and a big "💧 Take a sip" message flashes in the middle for 3 seconds, then disappears on its own. Auto-skips while you're in a meeting (mic on + known meeting app or browser tab).

![menu bar countdown](docs/menu-bar.png)

---

## Features

- Pulsing blue border across all displays + centered "Take a sip" message, 3s auto-dismiss.
- Menu bar item with live countdown to next reminder.
- Pause / resume from the menu bar.
- Interval picker in the menu bar: 1, 5, 10, 15, 20, 30, 45, 60, 90, 120 minutes.
- Meeting detection: Zoom, Teams, Slack, FaceTime, Webex, Google Chrome (meet.google.com, zoom.us/j/, teams.microsoft.com), Arc. Configurable and extensible via a Raycast view.
- Debug view that dumps the current mic state, every running app's bundle id, every browser tab URL, and why the reminder did or didn't skip.
- Manual trigger command that bypasses meeting detection.

---

## Install with Claude Code

If you have [Claude Code](https://claude.com/claude-code) installed, this is the fastest path. Clone the repo and ask Claude to install the extension for you — it will run the exact commands shown in the manual section below and answer permission questions as they come up.

### 1. Clone

```bash
git clone https://github.com/opdelorme/water-reminder.git
cd water-reminder
```

### 2. Launch Claude Code in the repo

```bash
claude
```

### 3. Paste this prompt into Claude Code

```
Install this Raycast extension on my machine. Steps:

1. Verify prerequisites:
   - macOS with Xcode Command Line Tools (swiftc available)
   - Node 22.14+ (node -v)
   - Raycast installed (ls /Applications/Raycast.app) — if missing,
     offer to run `brew install --cask raycast` and stop for me to
     launch Raycast once before continuing.

2. Build the native Swift helpers:
   cd helper && ./build.sh
   Confirm all three binaries exist: water-pulse, mic-active, list-apps.

3. Install Raycast extension dependencies and start the dev import:
   cd ../raycast && npm install
   Run `npm run dev` in the background and wait for
   "ready - built extension successfully" in the log.

4. Tell me the Helper Binary Path to paste into the extension
   preferences (absolute path to water-pulse in this repo).

5. Open macOS System Settings → Privacy & Security → Automation so I
   can grant Raycast permission to control Arc / Google Chrome (used
   to read tab URLs for browser-based meeting detection).

6. Open macOS System Settings → Privacy & Security → Accessibility so
   I can enable the water-pulse helper (required for the overlay to
   float above other apps).

7. Print a final checklist telling me to:
   a. Run "Water Reminder Menu Bar" in Raycast once to activate it.
   b. Click the 💧 in the menu bar and set my preferred interval.
   c. Run "Trigger Water Reminder Now" to smoke-test the overlay.
   d. Run "Debug Meeting Detection" during a real call to confirm
      the skip logic.

Do not ship-test by running water-pulse at random — it covers the
screen for 3 seconds and I want to choose the moment.
```

Claude Code will execute each step, stop at the two steps that need my click (permissions + launching the menu bar command), and resume when I confirm.

---

## Manual install (no Claude Code)

### Prerequisites

- macOS 13+
- Xcode Command Line Tools: `xcode-select --install`
- Node 22.14+ — `brew install node` or use `nvm`
- Raycast: `brew install --cask raycast`, then open it once to finish onboarding.

### 1. Clone and build the helpers

```bash
git clone https://github.com/opdelorme/water-reminder.git
cd water-reminder/helper
./build.sh
```

Produces three binaries in `helper/`:

- `water-pulse` — the overlay (pulsing border + "Take a sip" label)
- `mic-active` — one-shot probe, exits 0 if the default input device is active, 1 otherwise
- `list-apps` — prints bundle ids of every user-visible running app via `NSWorkspace`

Smoke-test if you want (covers the screen for 3s):

```bash
./water-pulse
./mic-active; echo $?   # 0 = mic is in use right now, 1 = idle
./list-apps | head
```

### 2. Install the Raycast extension

```bash
cd ../raycast
npm install
npm run dev
```

Wait for `ready - built extension successfully`. Raycast has now imported the extension — you can `Ctrl+C` the watcher, the extension stays registered.

### 3. Configure preferences

Open Raycast (`⌘ Space`) → highlight any Water Reminder command → `⌘ ⇧ ,` → set:

- **Helper Binary Path** = absolute path to `water-pulse` in your clone, for example `/Users/you/github/water-reminder/helper/water-pulse`. The extension finds `mic-active` and `list-apps` in the same directory.
- **Skip reminders during meetings** = on (default).

### 4. Activate the menu bar

In Raycast, search `Water Reminder Menu Bar` and run it. A 💧 appears in the macOS menu bar with a live countdown. Click it:

- **Sip Now** — fire the overlay immediately
- **Pause / Resume Reminders**
- **Interval** submenu — pick 1, 5, 10, 15, 20, 30, 45, 60, 90, or 120 minutes
- **Configure Meeting Detection**
- **Debug Meeting Detection**

### 5. Grant macOS permissions

On first overlay, macOS will prompt:

- **Privacy & Security → Accessibility**: enable `water-pulse`. Required for the overlay to float above full-screen apps.

On first meeting-detection run, for each browser you want to include (Chrome, Arc, Safari, Brave):

- **Privacy & Security → Automation**: enable Raycast → control <browser>. Required so the extension can read active tab URLs.

Open the Automation pane directly: `open "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"`.

### 6. Smoke-test

1. Run `Trigger Water Reminder Now` from Raycast — expect a 3-second pulsing border + "💧 Take a sip" label, then auto-dismiss.
2. Run `Debug Meeting Detection` — check `Running visible apps` shows your running apps. If empty, `list-apps` isn't being found at the path you set, or the helper didn't build.
3. Start a Google Meet (https://meet.new), turn mic on, re-run the debug — verdict should flip to `🔕 IN MEETING — Google Chrome tab on meeting URL` (or Arc, etc.).

---

## How meeting detection works

Every 1 minute Raycast wakes the background command. It:

1. Reads `paused`, `lastFireAt`, and `intervalMinutes` from `LocalStorage`. Returns early if paused, or if less than `intervalMinutes` have passed since the last real fire.
2. Runs `helper/list-apps` — bundle ids of every user-visible process via `NSWorkspace.shared.runningApplications`. No TCC permission required.
3. For enabled rules whose bundle id is currently running:
   - **App rule** — if `helper/mic-active` returns 0 (mic in use), flag as meeting.
   - **Browser rule** — runs an AppleScript against the browser to collect active tab URLs. If any tab URL contains a configured meeting substring (e.g. `meet.google.com`), flag as meeting regardless of mic. If the mic is also on and any configured substring matches, also flag.
4. If flagged → silently returns. If clear → spawns `water-pulse`.

All detection is best-effort; `Debug Meeting Detection` shows exactly what it found at any moment.

## Architecture

```
water-reminder/
├── helper/
│   ├── WaterPulse.swift      # overlay (borderless NSWindow per display + HUD label)
│   ├── MicActive.swift       # CoreAudio probe, exit code = mic state
│   ├── ListApps.swift        # NSWorkspace running apps → bundle ids on stdout
│   └── build.sh              # swiftc all three → water-pulse, mic-active, list-apps
└── raycast/
    ├── package.json          # 5 commands: remind, sip-now, configure, debug, menu-bar
    └── src/
        ├── remind.ts         # background tick, gates fires by interval + meeting + pause
        ├── sip-now.ts        # manual trigger, bypasses detection
        ├── configure.tsx     # list view: toggle apps/browsers, edit URL substrings
        ├── debug.tsx         # detail view: dump probes + verdict
        ├── menu-bar.tsx      # MenuBarExtra with countdown + actions
        └── lib/
            ├── detection.ts  # rules, probes, osascript for browser URLs
            ├── storage.ts    # Raycast LocalStorage rule persistence
            └── state.ts      # lastFireAt, paused, intervalMinutes, formatCountdown
```

Raycast extensions can't draw overlays or read raw mic state, so everything native is shelled out to the three Swift binaries. The extension is pure TypeScript.

## Customize

- **Overlay color / line width / pulse speed / label text** — `helper/WaterPulse.swift`, then `helper/build.sh`.
- **Overlay duration** — the `DispatchQueue.main.asyncAfter(deadline: .now() + 3.0)` line in `WaterPulse.swift`.
- **Default meeting apps** — `DEFAULT_RULES` in `raycast/src/lib/detection.ts`.
- **Interval choices in the menu bar** — `INTERVAL_CHOICES` in `raycast/src/lib/state.ts`.

Helper edits need a rebuild (`helper/build.sh`). Extension edits hot-reload automatically if `npm run dev` is running.

## Codesigning (sharing with teammates)

Unsigned binaries work for the builder, but Gatekeeper blocks them elsewhere:

```bash
codesign --force --sign - helper/water-pulse helper/mic-active helper/list-apps         # ad-hoc
# with a Developer ID:
codesign --force --sign "Developer ID Application: YOUR NAME (TEAMID)" \
         --options runtime helper/water-pulse helper/mic-active helper/list-apps
```

## Uninstall

1. Raycast → Settings → Extensions → Water Reminder → **Remove**.
2. `rm -rf /path/to/water-reminder` (the repo clone).
3. System Settings → Privacy & Security → Accessibility / Automation — revoke permissions if you want.

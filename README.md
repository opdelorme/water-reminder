# Water Reminder

Raycast extension + native macOS helper. Every 15 minutes the whole screen contour pulses blue until you click **Sip taken**.

## Architecture

Raycast cannot draw screen overlays from inside its own process, so this repo ships two pieces:

- `raycast/` — Raycast extension. Three commands:
  - **Water Reminder (Background)** — `no-view`, `interval: 15m`. Runs meeting detection, spawns the helper if clear.
  - **Trigger Water Reminder Now** — manual override, bypasses detection.
  - **Configure Meeting Detection** — view command. Toggle which apps / browsers suppress the reminder while active; edit meeting URL substrings for browsers.
- `helper/` — Two Swift binaries:
  - `water-pulse` — transparent borderless `NSWindow` per display at `.screenSaver` level, pulsing `CAShapeLayer` border, single **Sip taken ✓** HUD panel centered on the primary display.
  - `mic-active` — one-shot probe; exits 0 if the default input device is in use anywhere on the system, 1 otherwise. Used as a cheap proxy for "call in progress."

## Meeting detection

On every scheduled fire, the background command:

1. Loads rules from Raycast `LocalStorage` (defaults include Zoom, Teams, Slack, FaceTime, Webex, Chrome, Arc).
2. Queries running apps via `osascript` → `System Events` → bundle identifiers of visible processes.
3. Calls the `mic-active` probe.
4. For any enabled rule whose bundle id is running:
   - `kind: "app"` → skip if mic is active.
   - `kind: "browser"` → AppleScript to the browser, collect tab URLs, skip if any contains a configured substring (e.g. `meet.google.com`, `zoom.us/j/`). If no URL hit but mic is active and the browser has any configured-domain tab open, also skip.
5. On skip, `showHUD("🔕 Skipped — <reason>")` instead of spawning the pulse.

Toggle the feature off globally via the extension preference **Skip reminders during meetings**.

## Setup

### 1. Build the helper

```bash
cd helper
./build.sh
```

Produces two binaries: `helper/water-pulse` and `helper/mic-active`. Test them:

```bash
./water-pulse          # expect pulsing blue border + Sip taken button
./mic-active; echo $?  # 0 = mic in use, 1 = idle
```

Both binaries must live in the same directory — the extension reads the `helperPath` preference and finds `mic-active` next to `water-pulse`.

### 2. Install the Raycast extension

```bash
cd raycast
npm install
# Drop a 512×512 PNG at raycast/assets/icon.png (required by Raycast)
npm run dev
```

`ray develop` imports the extension into Raycast in dev mode. Open Raycast → **Water Reminder** appears. Run it once to trigger the overlay.

### 3. Verify the schedule

In Raycast → Extensions → Water Reminder → **Water Reminder (Background)** → confirm *Interval* = 15 min. Extension preferences hold the absolute path to `water-pulse` (default is set to this repo's location).

## Permissions

First run may prompt for:
- **Accessibility** — so the overlay floats above other apps on all Spaces.
- **Screen Recording** — only if macOS demands it for `.screenSaver`-level windows; usually not required.

Grant via *System Settings → Privacy & Security*.

## Ship as signed binary (optional)

For a teammate or public release:

```bash
codesign --force --sign - helper/water-pulse      # ad-hoc
# or with a Developer ID:
codesign --force --sign "Developer ID Application: YOUR NAME (TEAMID)" \
         --options runtime helper/water-pulse
```

Unsigned binaries work locally; Gatekeeper blocks them on other machines.

## Customize

Edit `helper/WaterPulse.swift`:
- Color → `strokeColor` / `shadowColor` in `makeOverlay`.
- Line width → `border.lineWidth`.
- Pulse speed → `pulse.duration`.
- Button copy → `NSButton(title: ...)` in `makeButtonPanel`.

Edit `raycast/package.json`:
- Interval → `commands[0].interval` (e.g. `"10m"`, `"30m"`, `"1h"`).

Rebuild helper after edits: `helper/build.sh`.

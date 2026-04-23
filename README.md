# Water Reminder

Raycast extension + native macOS helper. Every 15 minutes the whole screen contour pulses blue until you click **Sip taken**.

## Architecture

Raycast cannot draw screen overlays from inside its own process, so this repo ships two pieces:

- `raycast/` — Raycast extension. A `no-view` background command runs every 15 min and spawns the helper. A second command triggers it manually.
- `helper/` — Single-file Swift app. Transparent borderless `NSWindow` per display at `.screenSaver` level draws a pulsing `CAShapeLayer` border. A small HUD panel with a **Sip taken ✓** button dismisses all windows.

The extension just shells out to the helper binary — no IPC, no daemon.

## Setup

### 1. Build the helper

```bash
cd helper
./build.sh
```

Produces `helper/water-pulse`. Test it:

```bash
./water-pulse
```

Screen border should pulse blue. Click **Sip taken ✓** to dismiss.

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

## LazyFrog — your Reddit game automation companion

LazyFrog is a browser extension that adds an in-page control panel and a convenient popup to help you automate supported Reddit game experiences. It focuses on a smooth, user-friendly flow with clear status, control, and safety features.

### Highlights
- **One‑click automation**: Start/stop from the page or the toolbar popup.
- **Live status & controls**: See what the bot is doing and pause/resume anytime.
- **Missions management**: Enable/disable available automations from the Options page.
- **Configurable behavior**: Adjust pacing, logging, and other preferences.
- **Data export**: Export mission/game data to share or analyze.
- **No cloud account**: Everything runs locally in your browser.

### Quick start (Chrome/Brave/Edge)
1. **Get the extension**
   - Use a prebuilt file from `extension/artifacts/` (look for the latest `lazyfrog-*.crx` or `lazyfrog-*.zip`).
   - Or load the development build from `extension/dist/`.
2. **Install**
   - Go to `chrome://extensions`, enable Developer mode.
   - Either drag the `.crx` onto the page, or click “Load unpacked” and select the extracted folder (or `extension/dist/`).
3. **Use it**
   - Open Reddit and navigate to a supported game page.
   - Click the LazyFrog toolbar icon or use the in-page control panel.
   - Press “Start” to begin automation.

### What you’ll see
- **Popup**: Quick controls and live stats.
- **On‑page panel**: Status text and controls embedded on Reddit pages.
- **Options page**: Tabs for Missions, Settings, and About.

### Privacy & permissions
- Runs entirely in your browser; mission data and logs are stored locally.
- Requires site permissions only to interact with the relevant Reddit pages.

### Troubleshooting
- If something looks off, enable logging in the Settings tab and retry.
- For help and deeper visibility, see the Debug Server section below.

## Website (WIP)
The public website lives in `website/` and is a work‑in‑progress. If you’re curious, you can browse the sources there; production hosting is separate and may differ.

## Debug server (optional)
For advanced troubleshooting and richer logs, a local debug server is included.
- Start with the docs: [docs/DEBUGGING.md](docs/DEBUGGING.md)
- Chrome setup tips: [extension/CHROME_DEBUGGING_SETUP.md](extension/CHROME_DEBUGGING_SETUP.md)

## More docs (for power users)
- Mission automation overview: [docs/MISSION_AUTOMATION_GUIDE.md](docs/MISSION_AUTOMATION_GUIDE.md)
- Message flow between parts of the extension: [docs/MESSAGE_FLOW.md](docs/MESSAGE_FLOW.md)
- Logger usage: [docs/LOGGER_USAGE.md](docs/LOGGER_USAGE.md)
- Initialization patterns: [docs/INITIALIZATION_PATTERNS.md](docs/INITIALIZATION_PATTERNS.md)

If you run into issues or have suggestions, please open an issue in this repository. We’d love your feedback.
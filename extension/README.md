# LazyFrog - Sword & Supper Game Bot

A browser extension that automates the Sword & Supper Reddit game.

## Features

- **Mission scanning**: Automatically scans Reddit posts for missions
- **Mission database**: Local storage of all missions with star difficulty
- **Auto-play**: Automated gameplay with configurable strategies
- **Smart navigation**: Finds and completes missions matching your filters

## Quick Start

### Installation

```bash
pnpm install
pnpm build
```

### Load Extension

**Firefox:**
- `about:debugging` → Load Temporary Add-on → Select `dist/manifest.json`

**Chrome:**
- `chrome://extensions/` → Developer mode → Load unpacked → Select `dist/` folder

### Usage

1. Navigate to [r/SwordAndSupperGame](https://www.reddit.com/r/SwordAndSupperGame/)
2. Scroll to scan missions (they're saved automatically)
3. Click extension icon → Configure filters → Start Bot

## Development

```bash
# Development with watch mode
pnpm run dev

# Production build
pnpm run build

# Type checking
pnpm run type-check
```

## Architecture

```
Background Service Worker
├─ XState State Machine (orchestration)
├─ Mission Database (IndexedDB)
└─ Message Coordinator
    ↓
Reddit Content Script    Devvit Content Script
├─ Mission Scanning      ├─ Game Automation
└─ DOM Manipulation      └─ Button Clicking
```

State machine handles orchestration, content scripts handle DOM interaction.

## Project Structure

```
src/
├── automation/
│   ├── botStateMachine.ts          # XState v5 state machine
│   └── gameInstanceAutomation.ts   # Game automation engine
├── background/
│   └── index.ts                    # Service worker + state machine host
├── content/
│   ├── reddit/                     # Reddit page script
│   └── devvit/                     # Game iframe script
├── lib/storage/                    # Mission database (IndexedDB)
├── popup/                          # Extension popup UI
└── options/                        # Settings page
```

## Debugging

### Remote Logging

```bash
node debug-server.js

# View logs
curl -s http://localhost:7856/logs | jq

# Search logs
curl -s "http://localhost:7856/logs?limit=100&context=REDDIT" | jq
```

Logs are stored in SQLite (`debug-logs.db`) and survive restarts.

### Debug Contexts

1. Background: `chrome://extensions/` → Inspect background page
2. Reddit content: DevTools on Reddit page (F12)
3. Game iframe: DevTools → Find iframe → Inspect
4. Popup: Right-click extension icon → Inspect

## Tech Stack

- TypeScript + React 18
- XState v5 (state machine)
- IndexedDB (mission storage)
- Webpack 5 (bundling)

## License

MIT

## Disclaimer

Educational purposes only. Ensure compliance with Reddit's Terms of Service.

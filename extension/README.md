# LazyFrog - Sword & Supper Game Bot

A modern Firefox/Chrome browser extension built with **TypeScript** and **React** that automates level filtering and completion for the Sword & Supper Reddit game.

## 🎮 Features

- **TypeScript**: Full type safety and IntelliSense
- **React Components**: Injected control panel directly on Reddit pages and game iframe
- **Smart Mission Scanning**: Automatic detection and storage of Reddit mission posts
- **Star Difficulty Detection**: Deep shadow DOM navigation to extract 1-5 star ratings from Devvit previews
- **Mission Database**: Local storage of all scanned missions with metadata
- **Automated Gameplay**: Full mission automation with configurable strategies
- **Visual UI**: Beautiful React-based popup and in-game control panel
- **Real-time Updates**: Live mission scanning as you scroll
- **Cross-Browser**: Works on Firefox and Chrome
- **Modern Build System**: Webpack-based build with hot reload support
- **Remote Logging**: HTTP-based logging server for easy debugging
- **State Machine Architecture**: XState v5 state machine in background service worker for reliable state management

## 🏗️ Architecture

LazyFrog uses a **centralized state machine architecture** with XState v5 running in the background service worker:

```
Background Service Worker (Persists)
├─ XState State Machine (botActor)
├─ State Persistence (chrome.storage.local)
└─ Message Coordinator
    ↓ Commands                ↑ Events
Reddit Content Script         Devvit Content Script
(Sensor & Actuator)           (Game Automation)
├─ MutationObserver           ├─ GameInstanceAutomationEngine
├─ DOM Manipulation           └─ Button Clicking Logic
└─ Mission Scanning
```

**Key Benefits:**
- **State persists across page navigations** - Background service worker never reloads
- **Centralized control** - Single source of truth for bot state
- **Clear event flow** - Content scripts report events, background coordinates actions
- **No race conditions** - State machine enforces valid transitions only

See [docs/state-machine.md](./docs/state-machine.md) for detailed architecture documentation.

## 🚀 Development Setup

### Prerequisites

- Node.js 20+ and pnpm
- Firefox or Chrome browser

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd AutoSupper
   pnpm install
   ```

2. **Build the extension:**
   ```bash
   # Production build
   pnpm run build

   # Development build with watch mode
   pnpm run dev
   ```

3. **Load in Firefox:**
   - Open `about:debugging`
   - Click "This Firefox" → "Load Temporary Add-on"
   - Navigate to `dist/` folder and select `manifest.json`

4. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

## 📁 Project Structure

```
AutoSupper/
├── src/
│   ├── api/
│   │   ├── reddit.ts              # Reddit JSON API module
│   │   └── levelParser.ts         # Parse Reddit posts to Levels
│   ├── automation/
│   │   ├── botStateMachine.ts          # XState v5 state machine definition
│   │   └── gameInstanceAutomation.ts   # Game instance automation engine (GIAE)
│   ├── background/
│   │   └── index.ts               # Background service worker (hosts state machine)
│   ├── content/
│   │   ├── reddit/
│   │   │   ├── reddit.tsx         # Reddit content script (sensor & actuator)
│   │   │   └── utils/reddit.ts    # Reddit utility functions
│   │   └── devvit/
│   │       ├── devvit.tsx         # Game iframe script (automation)
│   │       └── utils/dom.ts       # Game DOM utilities
│   ├── popup/
│   │   ├── index.tsx              # Popup entry point
│   │   ├── PopupApp.tsx           # Main popup React component
│   │   ├── popup.html             # Popup HTML template
│   │   └── popup.css              # Popup styles
│   ├── missions/
│   │   └── MissionsPage.tsx       # Missions database viewer
│   ├── components/
│   │   ├── BotControlPanel.tsx    # Bot control UI component
│   │   └── GameControlPanel.tsx   # Game control UI component
│   ├── utils/
│   │   ├── storage.ts             # Mission database utilities
│   │   └── logger.ts              # Logging utilities
│   ├── data/
│   │   ├── abilities.ts           # Game ability data
│   │   ├── enemies.ts             # Enemy type data
│   │   └── maps.ts                # Map/environment data
│   └── types/
│       └── index.ts               # TypeScript type definitions
├── docs/
│   ├── state-machine.md           # State machine architecture (READ THIS!)
│   ├── MESSAGE_FLOW.md            # Message flow documentation
│   ├── INITIALIZATION_PATTERNS.md # Handling async initialization & race conditions
│   ├── DEBUGGING.md               # Troubleshooting guide
│   ├── AUTOMATION_USAGE.md        # How to use automation
│   └── REDDIT_API_USAGE.md        # Reddit API integration
├── public/
│   ├── manifest.json              # Extension manifest
│   └── icons/                     # Extension icons
├── dist/                          # Built extension (generated)
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## 🎯 Usage

### Mission Scanning

1. **Navigate** to [r/SwordAndSupperGame](https://www.reddit.com/r/SwordAndSupperGame/) with a level filter (e.g., Level 1-5)

2. **Scroll the page** - The extension automatically scans and saves all mission posts as you scroll
   - Missions are saved to local database immediately
   - Star difficulty is detected from Devvit preview images (takes 10+ seconds to load)
   - All missions are saved, even those without star data yet

3. **View missions** in the extension popup:
   - Click the extension icon
   - Go to "Missions" tab
   - See all scanned missions with their metadata

### Auto-Play

1. **Configure automation** in the Options tab:
   - Set ability tier list (drag to reorder)
   - Set blessing stat priority
   - Enable debug mode for step-by-step testing

2. **Start automation**:
   - Use debug controls to test each step individually, OR
   - Use "Start Bot" to begin full automation
   - The bot will navigate to uncompleted missions and play them automatically
   - Only missions with detected star difficulty will be played

## 🛠️ Development

### Available Scripts

```bash
# Development build with watch mode
pnpm run dev

# Production build
pnpm run build

# Type checking
pnpm run type-check

# Clean build artifacts
pnpm run clean
```

### Tech Stack

- **TypeScript** - Type safety
- **React 18** - UI components
- **Webpack 5** - Module bundling
- **Chrome Extension APIs** - Browser integration

### Key Components

#### LevelControlPanel (React Component)
The main control panel injected into Reddit pages. Features:
- Real-time level filtering
- Interactive UI with filters
- Click-to-open levels
- Collapsible design

#### Content Script
- Scans Reddit posts for levels
- Parses level information (title, rank, difficulty, completion)
- Injects React components into the page
- Communicates with background script

#### Popup
- React-based extension popup
- Filter configuration
- Start/Stop controls
- Results display

### Customization

**Parsing Logic** (`src/content/index.tsx`):
```typescript
function parseLevelFromPost(post: Element): Level | null {
  // Customize patterns to match your game's format
  const levelMatch = title.match(/level\s+(\d+)/i);
  const rankMatch = title.match(/rank\s+(\d+)/i);
  // ...
}
```

**Styling** (`src/components/LevelControlPanel.tsx`):
- All styles are inline for easy modification
- Change colors, sizing, positioning as needed

## 🔧 Build Process

The extension uses Webpack to:
1. Compile TypeScript to JavaScript
2. Bundle React components
3. Process CSS with style-loader
4. Copy static assets (manifest, icons)
5. Generate optimized builds for production

## 🐛 Debugging

**See [docs/DEBUGGING.md](docs/DEBUGGING.md) for the complete debugging guide.**

### Remote Logging Server

The extension uses an HTTP-based logging server with **SQLite3 persistent storage** for easy debugging:

```bash
# Start the server
node debug-server.js

# Access logs at:
http://localhost:7856/logs

# Or use curl with jq:
curl -s http://localhost:7856/logs | jq

# Search logs:
curl -s "http://localhost:7856/logs/search?q=mission" | jq

# Get summary:
curl -s http://localhost:7856/logs/summary | jq

# Export all logs:
curl http://localhost:7856/logs/export -o logs.json

# Clear logs:
curl -X POST http://localhost:7856/logs/clear
```

**Features:**
- ✅ **Persistent storage** - Logs survive server restarts
- ✅ **Unlimited logs** - SQLite database can store millions of log entries
- ✅ **Fast search** - Full-text search across messages and data
- ✅ **Export capability** - Download all logs as JSON
- ✅ **Indexed queries** - Fast filtering by context, level, and time

All logs from the extension are sent here with timestamps, context, and structured data. Database stored at `debug-logs.db`.

### Remote Debugging with Claude Code

Launch Chrome with the extension and remote debugging:

```bash
./launch-chrome-debug.sh
```

This allows Claude Code to connect and debug your extension automatically!

See [CHROME_DEBUGGING_SETUP.md](CHROME_DEBUGGING_SETUP.md) for details.

### Debug Functions

Test directly in browser console (on Reddit page):

```javascript
// Get all scanned levels
window.autoSupperDebug.getAllLevels()

// Force a scan
window.autoSupperDebug.forceScan()

// Test selectors
window.autoSupperDebug.testSelectors()
```

### Contexts to Check

1. **Background Script**: `chrome://extensions/` → Inspect views → background page
2. **Content Script (Reddit)**: DevTools on Reddit page (F12)
3. **Content Script (Game)**: DevTools on Reddit page → Find iframe → Inspect iframe context
4. **Popup**: Right-click extension icon → Inspect Popup

### Understanding Star Detection

Star difficulty is extracted from nested shadow DOMs in Reddit's Devvit previews:

1. **DOM Path**: `post → loader → loader.shadowRoot → surface → surface.shadowRoot → renderer → renderer.shadowRoot`
2. **Image URL**: Filled stars use `https://i.redd.it/ap8a5ghsvyre1.png`
3. **Loading Time**: Previews take 10-15+ seconds to fully render star images
4. **Detection**: Extension counts `<img>` elements with the star image URL

See [docs/REDDIT_DATA_STRUCTURE.md](docs/REDDIT_DATA_STRUCTURE.md) for complete details on shadow DOM navigation.

### Common Issues

- **"No star difficulty detected"** → Preview hasn't loaded yet, scroll slowly or wait longer
- **"Skipping mission - missing data"** → Post missing postId or permalink
- **Extension not loading** → Check icons exist (not 0 bytes)
- **Script doesn't run** → Check URL matches manifest pattern
- **React not rendering** → Check console for errors
- **Automation not starting** → Check debug mode logs, ensure mission has star difficulty

## 📦 Building for Production

```bash
# Build optimized version
pnpm run build

# The dist/ folder contains the complete extension
# Ready to load in browsers or package for distribution
```

## 🤝 Contributing

The extension is built with modern tools for easy contribution:
1. Fork the repository
2. Make your changes
3. Build and test locally
4. Submit a pull request

## 📄 License

MIT

## ⚠️ Disclaimer

This bot is for educational purposes. Ensure compliance with Reddit's Terms of Service and game rules.

# AutoSupper - Sword & Supper Game Bot

A modern Firefox/Chrome browser extension built with **TypeScript** and **React** that automates level filtering and completion for the Sword & Supper Reddit game.

## 🎮 Features

- **TypeScript**: Full type safety and IntelliSense
- **React Components**: Injected control panel directly on Reddit pages
- **Smart Level Filtering**: Filter by difficulty, rank range, and completion status
- **Visual UI**: Beautiful React-based popup and on-page control panel
- **Real-time Updates**: Live filtering and level detection
- **Cross-Browser**: Works on Firefox and Chrome
- **Modern Build System**: Webpack-based build with hot reload support

## 🚀 Development Setup

### Prerequisites

- Node.js 18+ and pnpm
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
│   ├── background/
│   │   └── index.ts               # Background service worker
│   ├── content/
│   │   └── index.tsx              # Content script with React
│   ├── game/
│   │   └── index.tsx              # Game iframe script
│   ├── popup/
│   │   ├── index.tsx              # Popup entry point
│   │   ├── PopupApp.tsx           # Main popup React component
│   │   ├── popup.html             # Popup HTML template
│   │   └── popup.css              # Popup styles
│   ├── components/
│   │   ├── LevelControlPanel.tsx  # Injected React control panel
│   │   └── GameControlPanel.tsx   # Game iframe control panel
│   └── types/
│       └── index.ts               # TypeScript type definitions
├── docs/
│   ├── REDDIT_API_USAGE.md        # Reddit API integration guide
│   ├── REDDIT_DATA_STRUCTURE.md   # Available data documentation
│   └── DEBUGGING.md               # Troubleshooting guide
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

1. **Navigate** to [r/SwordAndSupperGame](https://www.reddit.com/r/SwordAndSupperGame/)

2. **Open extension** by clicking the toolbar icon

3. **Configure filters:**
   - Difficulty: Easy/Medium/Hard/Extreme
   - Rank Range: Min/Max
   - Only incomplete levels: ✓

4. **Start the bot** - A React control panel will appear on the page!

5. **Interact** with filtered levels directly in the control panel

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

### Quick Start

1. **Check console logs** on Reddit page (F12)
2. **Test selectors** in browser console:
   ```javascript
   document.querySelectorAll('shreddit-post').length
   ```
3. **Test debug functions**:
   ```javascript
   window.autoSupperDebug.getAllLevels()
   window.autoSupperDebug.testSelectors()
   ```

### Remote Debugging with Claude Code

Launch Chrome with the extension and remote debugging:

```bash
./launch-chrome-debug.sh
```

This allows Claude Code to connect and debug your extension automatically!

See [CHROME_DEBUGGING_SETUP.md](CHROME_DEBUGGING_SETUP.md) for details.

### Contexts to Check

1. **Background Script**: `chrome://extensions/` → Inspect views → background page
2. **Content Script**: DevTools on Reddit page (F12)
3. **Popup**: Right-click extension icon → Inspect Popup

### If Levels Aren't Being Detected

The extension now includes a **Reddit API module** that's more reliable than DOM scraping:

- See [docs/REDDIT_API_USAGE.md](docs/REDDIT_API_USAGE.md) for migration guide
- See [docs/REDDIT_DATA_STRUCTURE.md](docs/REDDIT_DATA_STRUCTURE.md) for available data

### Common Issues

- **"Levels found: []"** → Reddit changed their DOM or API is better
- **Extension not loading** → Check icons exist (not 0 bytes)
- **Script doesn't run** → Check URL matches manifest pattern
- **React not rendering** → Check console for errors

## 📝 Type Safety

Full TypeScript definitions for:
- Chrome Extension APIs (`@types/chrome`)
- React components
- Extension messages
- Level data structures
- Filters and state management

## 🔒 Privacy

- Runs only on `reddit.com`
- No external network requests
- All data stored locally
- No telemetry or tracking

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

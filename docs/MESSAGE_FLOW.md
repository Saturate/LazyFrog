# Message Flow Documentation

This document describes how messages flow between different components of the Sword & Supper Bot extension.

## Architecture Overview

The extension follows the standard Chrome Extension Manifest V3 architecture:

```
┌─────────┐          ┌────────────┐          ┌──────────────────┐
│  Popup  │─────────▶│ Background │─────────▶│ Content Scripts  │
│   UI    │◀─────────│  Service   │◀─────────│                  │
└─────────┘          │   Worker   │          │  ┌─────────────┐ │
                     └────────────┘          │  │   Reddit    │ │
                                             │  │  (reddit-   │ │
                                             │  │   content)  │ │
                                             │  └─────────────┘ │
                                             │                  │
                                             │  ┌─────────────┐ │
                                             │  │    Game     │ │
                                             │  │  (devvit-   │ │
                                             │  │   content)  │ │
                                             │  └─────────────┘ │
                                             └──────────────────┘
```

## Component Responsibilities

### Popup (`src/popup/`)
- **Purpose**: User interface for controlling the bot
- **Log Prefix**: `[POPUP]`
- **Communication**: Sends messages to Background via `chrome.runtime.sendMessage()`
- **State**: Manages UI state (filters, config, debug mode)

### Background (`src/background/`)
- **Purpose**: Central message router and state coordinator
- **Log Prefix**: `[EXT]`
- **Communication**:
  - Receives from: Popup, Content Scripts
  - Sends to: Content Scripts via `chrome.tabs.sendMessage()`
- **State**: Maintains global extension state (isRunning, filters, completedLevels)

### Reddit Content Script (`src/content/`)
- **Purpose**: Interacts with Reddit page, finds missions, navigates
- **Log Prefix**: `[REDDIT]`
- **Runs On**: `https://www.reddit.com/*`
- **Communication**:
  - Receives: Messages from Background
  - Sends: Messages to Background via `chrome.runtime.sendMessage()`
- **Utilities**: `src/content/utils/reddit.ts`
  - `findGameIframe()` - Locates game iframe in shadow DOM
  - `parseLevelFromPost()` - Extracts level info from Reddit posts
  - `getAllLevels()` - Scrapes all levels from page
  - `filterLevels()` - Filters levels by criteria
  - `clickLevel()` - Navigates to a level
  - `exploreGameLoader()` - Debug function

### Game Content Script (`src/game/`)
- **Purpose**: Runs inside game iframe, controls automation
- **Log Prefix**: `[DEVVIT]`
- **Runs On**: `https://*.devvit.net/*` (all frames)
- **Communication**:
  - Receives: Messages from Background (broadcast to all frames)
  - Sends: Messages to Background via `chrome.runtime.sendMessage()`
- **Automation**: Uses `MissionAutomationEngine` from `src/automation/missionAutomation.ts`
- **Utilities**: `src/game/utils/dom.ts`
  - `analyzeGamePage()` - Debug function to inspect DOM
  - `extractGameState()` - Reads game state from page
  - `clickButton()` - Clicks game buttons by text
  - `getClickableElements()` - Finds all clickable elements

## Message Types

### State Management
- `GET_STATE` - Request current bot state
- `UPDATE_STATE` - Update bot state
- `LEVEL_COMPLETED` - Notify level completion

### Bot Control
- `START_BOT` - Start level processing mode
- `STOP_BOT` - Stop bot
- `START_PROCESSING` - Begin processing levels
- `STOP_PROCESSING` - Stop processing

### Mission Navigation
- `NAVIGATE_TO_MISSION` - Navigate to a specific mission
- `OPEN_MISSION_IFRAME` - Open/click mission to load game
- `GET_LEVELS` - Get all levels from page

### Mission Automation
- `START_MISSION_AUTOMATION` - Start automating current mission
- `STOP_MISSION_AUTOMATION` - Stop automation
- `AUTOMATION_READY` - Game script reports automation initialized

### Legacy/Compatibility
- `PLAY_CURRENT_MISSION` - Older flow for starting missions

## Message Flow Scenarios

### Scenario 1: User Starts Automation (Debug Step 3)

```
1. User clicks "Auto play mission" in popup
   [POPUP] User action

2. Popup sends START_MISSION_AUTOMATION to Background
   [POPUP] → chrome.runtime.sendMessage({
     type: 'START_MISSION_AUTOMATION',
     config: { enabled: true, ... }
   })

3. Background broadcasts to ALL frames
   [EXT] → chrome.tabs.sendMessage(tabId, message, { frameId: undefined })

4. Game Content Script receives message
   [DEVVIT] ← Receives START_MISSION_AUTOMATION

5. Game initializes automation engine
   [DEVVIT] Creates MissionAutomationEngine
   [DEVVIT] Starts console monitoring
   [DEVVIT] Waits for mission metadata

6. Game sends ready notification
   [DEVVIT] → chrome.runtime.sendMessage({
     type: 'AUTOMATION_READY'
   })

7. Background receives confirmation
   [EXT] ← AUTOMATION_READY
   [EXT] ✅ Automation ready in game iframe
```

### Scenario 2: Navigation to Mission (Debug Step 1)

```
1. User clicks "Navigate to mission" in popup
   [POPUP] User action

2. Popup sends NAVIGATE_TO_MISSION to Background
   [POPUP] → chrome.runtime.sendMessage({
     type: 'NAVIGATE_TO_MISSION',
     filters: { stars: [1,2], ... }
   })

3. Background forwards to Reddit Content Script
   [EXT] → chrome.tabs.sendMessage(tabId, message)

4. Reddit Content Script processes navigation
   [REDDIT] ← Receives NAVIGATE_TO_MISSION
   [REDDIT] Calls getAllLevels()
   [REDDIT] Calls filterLevels()
   [REDDIT] Gets first matching mission
   [REDDIT] Navigates via window.location.href

5. Reddit sends response back through Background
   [REDDIT] → sendResponse({ success: true, message: ... })
   [EXT] ← Response
   [POPUP] ← Response via callback
```

### Scenario 3: Opening Game Iframe (Debug Step 2)

```
1. User clicks "Open iframe" in popup
   [POPUP] User action

2. Popup sends OPEN_MISSION_IFRAME to Background
   [POPUP] → chrome.runtime.sendMessage({
     type: 'OPEN_MISSION_IFRAME'
   })

3. Background forwards to Reddit Content Script
   [EXT] → chrome.tabs.sendMessage(tabId, message)

4. Reddit Content Script finds and clicks game button
   [REDDIT] ← Receives OPEN_MISSION_IFRAME
   [REDDIT] Calls findGameIframe()
   [REDDIT] If no iframe, searches for clickable game element
   [REDDIT] Clicks element to load game
   [REDDIT] Waits for iframe to appear

5. Game loads in iframe
   [DEVVIT] Script injected into iframe by manifest
   [DEVVIT] Initializes automation engine
   [DEVVIT] → Sends AUTOMATION_READY

6. Responses propagate back
   [REDDIT] → sendResponse({ success: true })
   [EXT] ← Response
   [POPUP] ← Response
```

### Scenario 4: Pending Automation After Navigation

```
1. Reddit Content Script detects pending automation
   [REDDIT] Page loads
   [REDDIT] Checks chrome.storage.local for pendingAutomation

2. Polls for iframe to load
   [REDDIT] setInterval every 500ms
   [REDDIT] Calls findGameIframe()

3. When iframe found, triggers automation
   [REDDIT] Iframe detected!
   [REDDIT] → chrome.runtime.sendMessage({
     type: 'START_MISSION_AUTOMATION',
     config: { ... }
   })

4. Automation starts (see Scenario 1)
   [EXT] → Broadcasts to all frames
   [DEVVIT] ← Receives and starts
```

## Key Technical Details

### Message Broadcasting to All Frames

Background uses `chrome.tabs.sendMessage()` with `{ frameId: undefined }` to broadcast messages to **all frames** in a tab, including iframes:

```typescript
chrome.tabs.sendMessage(
  tabId,
  { type: 'START_MISSION_AUTOMATION', config },
  { frameId: undefined }, // undefined = all frames
  (response) => { /* handle response */ }
);
```

This is crucial because:
- The game runs in an iframe (`*.devvit.net`)
- devvit-content.js is injected into that iframe via manifest.json
- Broadcasting ensures the message reaches the game iframe directly

### Content Script Injection

Content scripts are injected automatically by manifest.json:

```json
{
  "content_scripts": [
    {
      "matches": ["https://www.reddit.com/*"],
      "js": ["reddit-content.js"],
      "run_at": "document_end"
    },
    {
      "matches": ["https://*.devvit.net/*"],
      "js": ["devvit-content.js"],
      "run_at": "document_idle",
      "all_frames": true  // ← Runs in all iframes!
    }
  ]
}
```

The `"all_frames": true` setting ensures devvit-content.js runs in the game iframe.

### Shadow DOM Navigation

Reddit uses Shadow DOM to encapsulate the game:

```
document
  └── shreddit-devvit-ui-loader
        └── #shadow-root
              └── devvit-blocks-web-view
                    └── #shadow-root
                          └── iframe[src*="devvit.net"]
```

The `findGameIframe()` utility navigates through these shadow roots to locate the iframe.

### No postMessage Required

❌ **Old approach**: Inject script string, use `postMessage()` to communicate
✅ **Current approach**: Proper content script, use Chrome extension APIs

Because devvit-content.js is a proper content script injected by the manifest, it can directly use:
- `chrome.runtime.sendMessage()` - Send messages to background
- `chrome.runtime.onMessage.addListener()` - Receive messages from background
- `chrome.storage.local` - Access extension storage

No need for cross-origin `postMessage` workarounds!

## Debugging Tips

### Log Prefixes

All console logs use prefixes to identify the source:
- `[POPUP]` - Popup UI
- `[EXT]` - Background service worker
- `[REDDIT]` - Reddit content script
- `[DEVVIT]` - Game content script (in iframe)

### Inspecting Different Contexts

1. **Popup logs**: Right-click extension icon → Inspect
2. **Background logs**: chrome://extensions → Bot → Service Worker → Inspect
3. **Reddit logs**: Open Reddit page → DevTools → Console (filter by `[REDDIT]`)
4. **Game logs**: Open Reddit page → DevTools → Find iframe in Elements → Right-click → Inspect frame → Console (filter by `[DEVVIT]`)

### Message Tracing

To trace a message through the system, look for the pattern:
```
[POPUP] 📤 Sending START_MISSION_AUTOMATION via background...
[EXT] 📨 Received message: START_MISSION_AUTOMATION
[EXT] 📤 Broadcasting START_MISSION_AUTOMATION to all frames
[DEVVIT] 📨 Received Chrome message: {type: "START_MISSION_AUTOMATION", ...}
```

## Common Issues

### Issue: Message not reaching game iframe
**Cause**: Iframe not loaded yet or wrong frameId
**Solution**: Background broadcasts with `frameId: undefined` to reach all frames

### Issue: Content script not injecting
**Cause**: Missing host_permissions or wrong URL pattern
**Solution**: Check manifest.json has both:
```json
"host_permissions": [
  "https://www.reddit.com/*",
  "https://*.devvit.net/*"
]
```

### Issue: "Cannot find game iframe"
**Cause**: Game not loaded or wrong shadow DOM structure
**Solution**: Use `findGameIframe()` which searches multiple paths through shadow DOM

## Future Improvements

Potential optimizations:
1. **Direct iframe targeting**: Use `chrome.webNavigation` to get iframe ID for direct messaging
2. **Event-driven**: Replace polling with MutationObserver for iframe detection
3. **Bi-directional channels**: Use `chrome.runtime.Port` for persistent connections
4. **State synchronization**: Use `chrome.storage.sync` for cross-device state

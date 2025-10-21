# Message Flow Documentation

This document describes how messages flow between different components of the Sword & Supper Bot extension with the **XState background state machine architecture**.

## Architecture Overview

The extension follows Chrome Extension Manifest V3 architecture with a **centralized state machine** in the background service worker:

```
┌─────────┐          ┌────────────────────────┐          ┌──────────────────┐
│  Popup  │─────────▶│      Background        │─────────▶│ Content Scripts  │
│   UI    │          │   Service Worker       │          │                  │
└─────────┘          │                        │          │  ┌─────────────┐ │
                     │  ┌──────────────────┐  │          │  │   Reddit    │ │
                     │  │ XState Machine   │  │          │  │  (reddit-   │ │
                     │  │   (botActor)     │  │          │  │   content)  │ │
                     │  └──────────────────┘  │          │  └─────────────┘ │
                     │          ↓             │          │                  │
                     │  handleStateTransition │          │  ┌─────────────┐ │
                     │  - Commands →          │          │  │    Game     │ │
                     │  ← Events              │          │  │  (devvit-   │ │
                     └────────────────────────┘          │  │   content)  │ │
                                                         │  └─────────────┘ │
                                                         └──────────────────┘
```

## Component Responsibilities

### Popup (`src/popup/`)
- **Purpose**: User interface for controlling the bot
- **Log Prefix**: `[POPUP]`
- **Communication**: Sends messages to Background via `chrome.runtime.sendMessage()`
- **Messages Sent**:
  - `START_BOT` - User clicked Start
  - `STOP_BOT` - User clicked Stop
  - `GET_LEVELS` - Request mission list
  - `NAVIGATE_TO_MISSION` - Navigate to specific mission (legacy)

### Background (`src/background/`)
- **Purpose**: Hosts XState state machine, coordinates all bot actions
- **Log Prefix**: `[EXT]` or `[StateMachine]` or `[StateTransition]`
- **Communication**:
  - Receives from: Popup, Content Scripts
  - Sends to: Content Scripts via `chrome.tabs.sendMessage()`
- **State**: XState machine with persistence to `chrome.storage.local`
- **Key Functions**:
  - `botActor` - XState state machine actor
  - `handleStateTransition()` - Sends commands to content scripts based on state
  - `broadcastToReddit()` - Send message to all reddit.com tabs
  - `broadcastToAllFrames()` - Send message to all frames in active tab

### Reddit Content Script (`src/content/reddit/reddit.tsx`)
- **Purpose**: Sensor & Actuator - detects DOM changes, reports events, executes commands
- **Log Prefix**: `[REDDIT]`
- **Runs On**: `https://www.reddit.com/*` (at `document_start`)
- **Architecture**: Stateless view layer, no state machine
- **State Tracking**: Local copies (`currentBotState`, `currentBotContext`) for UI only
- **Communication**:
  - Receives: Commands from Background
  - Sends: Events to Background via `chrome.runtime.sendMessage()`
- **Commands Handled**:
  - `STATE_CHANGED` → Update UI (control panel)
  - `CHECK_FOR_GAME_LOADER` → Run `checkForExistingLoader()`
  - `CLICK_GAME_UI` → Run `clickGameUI()`
  - `FIND_NEXT_MISSION` → Run `getNextUnclearedMission()`, report results
  - `NAVIGATE_TO_URL` → Navigate to URL
- **Events Sent**:
  - `GAME_LOADER_DETECTED` (from MutationObserver)
  - `GAME_DIALOG_OPENED` (after clicking fullscreen)
  - `MISSION_FOUND` / `NO_MISSIONS_FOUND` (after scanning)
  - `MISSION_PAGE_LOADED` (on page load with active session)
  - `ERROR_OCCURRED` (on failures)

### Devvit Content Script (`src/content/devvit/devvit.tsx`)
- **Purpose**: Game automation - runs gameAutomation engine in game iframe
- **Log Prefix**: `[DEVVIT]`
- **Runs On**: `https://*.devvit.net/*` (all frames, at `document_start`)
- **Communication**:
  - Receives: Commands from Background (broadcast to all frames)
  - Sends: Events to Background via `chrome.runtime.sendMessage()`
- **Commands Handled**:
  - `START_MISSION_AUTOMATION` → Initialize and start `gameAutomation`
  - `STOP_MISSION_AUTOMATION` → Stop `gameAutomation`
- **Events Sent**:
  - `AUTOMATION_READY` (after initialization, ~2 seconds)
  - `MISSION_COMPLETED` (when Finish button clicked)

## Message Types

### Events (Content Scripts → Background → State Machine)

| Event | Source | Description |
|-------|--------|-------------|
| `START_BOT` | Popup | User clicked Start button |
| `STOP_BOT` | Popup | User clicked Stop button |
| `MISSION_PAGE_LOADED` | Reddit Content | On mission page with active bot session |
| `GAME_LOADER_DETECTED` | Reddit Content | MutationObserver found game loader |
| `GAME_DIALOG_OPENED` | Reddit Content | Game dialog opened successfully |
| `AUTOMATION_READY` | Devvit Content | Automation engine initialized (~2s delay) |
| `MISSION_COMPLETED` | Devvit Content | Finish button clicked |
| `MISSION_FOUND` | Reddit Content | Found mission matching filters |
| `NO_MISSIONS_FOUND` | Reddit Content | No missions match filters |
| `ERROR_OCCURRED` | Any Content | Something went wrong |

### Commands (Background → Content Scripts)

| Command | Target | Description |
|---------|--------|-------------|
| `STATE_CHANGED` | Reddit Content | Notify of state machine state change |
| `CHECK_FOR_GAME_LOADER` | Reddit Content | Check if game loader exists in DOM |
| `CLICK_GAME_UI` | Reddit Content | Click game to open dialog |
| `FIND_NEXT_MISSION` | Reddit Content | Find next uncompleted mission |
| `NAVIGATE_TO_URL` | Reddit Content | Navigate to specific URL |
| `START_MISSION_AUTOMATION` | All Frames | Start game automation |
| `STOP_MISSION_AUTOMATION` | All Frames | Stop game automation |

### Legacy Messages (Still Supported)

| Message | Description |
|---------|-------------|
| `GET_STATE` | Request current bot state |
| `UPDATE_STATE` | Update bot state (deprecated) |
| `LEVEL_COMPLETED` | Notify level completion (deprecated) |
| `START_PROCESSING` | Begin processing levels (deprecated) |
| `STOP_PROCESSING` | Stop processing (deprecated) |
| `NAVIGATE_TO_MISSION` | Old flow for navigation |
| `OPEN_MISSION_IFRAME` | Old flow for opening game |
| `PLAY_CURRENT_MISSION` | Old flow for starting missions |

## Message Flow Scenarios

### Scenario 1: User Starts Bot (Full Flow)

```
1. User clicks "Start" in popup
   [POPUP] User action
   [POPUP] → chrome.runtime.sendMessage({ type: 'START_BOT', filters })

2. Background receives START_BOT, sends to state machine
   [EXT] ← START_BOT event
   [StateMachine] State: idle → starting
   [StateMachine] State: starting → waitingForGame (or navigating)
   [StateMachine] State persisted to chrome.storage.local

3. State machine enters waitingForGame
   [StateTransition] Entered waitingForGame
   [StateTransition] Broadcasting CHECK_FOR_GAME_LOADER

4. Reddit content receives command
   [REDDIT] ← CHECK_FOR_GAME_LOADER
   [REDDIT] Running checkForExistingLoader()

5. MutationObserver (or check) finds loader
   [REDDIT] [MutationObserver] Game loader detected
   [REDDIT] → chrome.runtime.sendMessage({ type: 'GAME_LOADER_DETECTED' })

6. Background routes event to state machine
   [EXT] ← GAME_LOADER_DETECTED
   [StateMachine] State: waitingForGame → openingGame

7. State machine enters openingGame
   [StateTransition] Entered openingGame
   [StateTransition] Broadcasting CLICK_GAME_UI

8. Reddit content clicks game UI
   [REDDIT] ← CLICK_GAME_UI
   [REDDIT] Running clickGameUI()
   [REDDIT] Clicking game container
   [REDDIT] Waiting for fullscreen button...
   [REDDIT] Clicking fullscreen button
   [REDDIT] → chrome.runtime.sendMessage({ type: 'GAME_DIALOG_OPENED' })

9. Background routes event to state machine
   [EXT] ← GAME_DIALOG_OPENED
   [StateMachine] State: openingGame → gameReady

10. State machine enters gameReady
    [StateTransition] Entered gameReady
    [StateTransition] Broadcasting START_MISSION_AUTOMATION to all frames

11. Devvit content receives command
    [DEVVIT] ← START_MISSION_AUTOMATION (in iframe)
    [DEVVIT] Initializing GameInstanceAutomationEngine
    [DEVVIT] Waiting 2 seconds...

12. Devvit reports ready
    [DEVVIT] → chrome.runtime.sendMessage({ type: 'AUTOMATION_READY' })

13. Background routes event to state machine
    [EXT] ← AUTOMATION_READY
    [StateMachine] State: gameReady → running

14. Automation plays the game...
    [DEVVIT] [GIAE] Clicking buttons...

15. Mission completes
    [DEVVIT] [GIAE] Finish button clicked
    [DEVVIT] → chrome.runtime.sendMessage({ type: 'MISSION_COMPLETED', missionId })

16. Background routes event to state machine
    [EXT] ← MISSION_COMPLETED
    [StateMachine] State: running → completing

17. State machine enters completing
    [StateTransition] Entered completing
    [StateTransition] Broadcasting FIND_NEXT_MISSION

18. Reddit content finds next mission
    [REDDIT] ← FIND_NEXT_MISSION
    [REDDIT] Querying database for next mission...
    [REDDIT] → chrome.runtime.sendMessage({
        type: 'MISSION_FOUND',
        missionId,
        permalink,
        isCurrentPage: false
    })

19. Background routes to state machine
    [EXT] ← MISSION_FOUND (isCurrentPage: false)
    [StateMachine] State: completing → navigating

20. State machine enters navigating
    [StateTransition] Entered navigating
    [StateTransition] Broadcasting NAVIGATE_TO_URL

21. Reddit content navigates (page reload)
    [REDDIT] ← NAVIGATE_TO_URL
    [REDDIT] Navigating to: <permalink>
    [REDDIT] window.location.href = permalink

22. Page reloads, reddit-content loads again
    [REDDIT] Script loaded on new page
    [REDDIT] Checking chrome.storage for activeBotSession
    [REDDIT] Found active session!
    [REDDIT] → chrome.runtime.sendMessage({ type: 'MISSION_PAGE_LOADED', ... })

23. Background routes to state machine
    [EXT] ← MISSION_PAGE_LOADED
    [StateMachine] State: navigating → waitingForGame

24. Loop continues from step 3...
```

### Scenario 2: User Stops Bot

```
1. User clicks "Stop" in popup
   [POPUP] User action
   [POPUP] → chrome.runtime.sendMessage({ type: 'STOP_BOT' })

2. Background routes to state machine
   [EXT] ← STOP_BOT
   [StateMachine] State: <any> → idle
   [StateMachine] Context reset

3. State machine enters idle
   [StateTransition] Entered idle
   [StateTransition] Broadcasting STATE_CHANGED

4. Reddit content receives state change
   [REDDIT] ← STATE_CHANGED { state: 'idle', context: {...} }
   [REDDIT] Updating currentBotState = 'idle'
   [REDDIT] Rendering control panel

5. Automation stops (no more commands sent)
```

### Scenario 3: State Persistence Across Page Reload

```
1. Bot is running (state: 'running')
   [StateMachine] State: running
   [StateMachine] State persisted to chrome.storage.local

2. User navigates to different page (e.g., clicking link)
   [REDDIT] Page unloading...
   [REDDIT] Reddit content script destroyed

3. New page loads
   [REDDIT] Script injected on new page
   [REDDIT] Checking chrome.storage for activeBotSession

4. Reddit content finds active session
   [REDDIT] Found activeBotSession: true
   [REDDIT] Checking if on mission page...
   [REDDIT] On mission page! Extracting postId from URL

5. Reddit reports to background
   [REDDIT] → chrome.runtime.sendMessage({
       type: 'MISSION_PAGE_LOADED',
       missionId,
       permalink
   })

6. Background state machine receives event
   [EXT] ← MISSION_PAGE_LOADED
   [StateMachine] Current state restored from storage
   [StateMachine] State: navigating → waitingForGame

7. Automation continues from waitingForGame...
```

## Key Technical Details

### State Machine Persistence

The state machine automatically persists on every state change:

```typescript
botActor.subscribe((state) => {
  // Save to storage
  chrome.storage.local.set({
    botMachineState: {
      value: state.value,
      context: state.context,
    },
  });

  // Broadcast to tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.url?.includes('reddit.com')) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'STATE_CHANGED',
          state: state.value,
          context: state.context,
        });
      }
    });
  });

  // Execute actions
  handleStateTransition(state.value, state.context);
});
```

### Message Broadcasting to All Frames

Background uses `chrome.tabs.sendMessage()` with `{ frameId: undefined }` to broadcast to **all frames**:

```typescript
chrome.tabs.sendMessage(
  tabId,
  { type: 'START_MISSION_AUTOMATION', config },
  { frameId: undefined }, // undefined = all frames
  (response) => { /* handle response */ }
);
```

This ensures messages reach the game iframe directly.

### Content Script Injection

Manifest.json defines injection:

```json
{
  "content_scripts": [
    {
      "matches": ["https://www.reddit.com/*"],
      "js": ["reddit-content.js"],
      "run_at": "document_start"  // Early injection for MutationObserver
    },
    {
      "matches": ["https://*.devvit.net/*"],
      "js": ["devvit-content.js"],
      "run_at": "document_start",
      "all_frames": true  // Runs in iframes!
    }
  ]
}
```

### Shadow DOM Navigation

Reddit uses Shadow DOM to encapsulate the game:

```
document
  └── shreddit-devvit-ui-loader
        └── #shadow-root
              └── devvit-surface
                    └── #shadow-root
                          └── devvit-blocks-renderer
                                └── #shadow-root
                                      └── <clickable container>

document
  └── devvit-fullscreen-web-view-controls
        └── #shadow-root
              └── devvit-web-view-preview-size-controls
                    └── #shadow-root
                          └── button (fullscreen)
```

The `clickGameUI()` function navigates through these shadow roots.

## Debugging Tips

### Log Prefixes

All console logs use prefixes to identify the source:
- `[POPUP]` - Popup UI
- `[EXT]` - Background service worker (general)
- `[StateMachine]` - State machine state changes
- `[StateTransition]` - State transition actions
- `[REDDIT]` - Reddit content script
- `[DEVVIT]` - Game content script (in iframe)

### Inspecting Different Contexts

1. **Popup logs**: Right-click extension icon → Inspect
2. **Background logs**: chrome://extensions → Bot → "Service Worker" → Inspect
3. **Reddit logs**: Open Reddit page → DevTools → Console (filter by `[REDDIT]`)
4. **Game logs**: Open Reddit page → DevTools → Find iframe in Elements → Right-click → Inspect frame → Console (filter by `[DEVVIT]`)

### Tracing Messages Through System

Look for the pattern:
```
[POPUP] Sending START_BOT to background
[EXT] Received message: START_BOT
[StateMachine] State changed: idle → starting
[StateTransition] Entered starting
[StateTransition] Broadcasting FIND_NEXT_MISSION
[REDDIT] Received command: FIND_NEXT_MISSION
[REDDIT] Sending event: MISSION_FOUND
[EXT] Received message: MISSION_FOUND
[StateMachine] State changed: starting → navigating
```

### Debug State Machine

From Reddit page console:
```javascript
// Get current state (local copy)
window.autoSupperDebug.getState()

// Send event to background
window.autoSupperDebug.sendEvent({ type: 'GAME_LOADER_DETECTED' })
```

From Background console:
```javascript
// Access state machine directly (only in background context)
chrome.storage.local.get(['botMachineState', 'activeBotSession'], console.log)
```

## Common Issues

### Issue: Messages not reaching game iframe
**Cause**: Iframe not loaded yet or frameId mismatch
**Solution**: Background broadcasts with `frameId: undefined` to reach all frames

### Issue: State lost on page reload
**Cause**: State machine lived in reddit-content (OLD architecture)
**Solution**: State machine now in background service worker (persists)

### Issue: Bot doesn't resume after navigation
**Cause**: `activeBotSession` flag not set or MISSION_PAGE_LOADED not sent
**Check**: Look for `[REDDIT] Found activeBotSession` log on new page
**Fix**: Ensure background sets `activeBotSession: true` on START_BOT

### Issue: State machine not transitioning
**Cause**: Event not being sent or wrong state
**Check**: Look for `[EXT]` logs showing event received, and `[StateMachine]` logs showing state transition
**Fix**: Verify event is valid for current state in `botStateMachine.ts`

### Issue: UI not updating
**Cause**: STATE_CHANGED not reaching reddit-content
**Check**: Look for `[REDDIT] [STATE_CHANGED]` logs
**Fix**: Verify background is broadcasting to tabs with `reddit.com` in URL

## Migration from Old Architecture

### Old: Reddit-Content State Machine
- State machine lived in `reddit-content.tsx`
- State lost on navigation
- Direct `botActor.send()` calls
- `handleStateTransition()` in reddit-content

### New: Background State Machine
- State machine lives in `background.ts`
- State persists across navigation
- `chrome.runtime.sendMessage()` for events
- `handleStateTransition()` in background
- Reddit-content is stateless "sensor & actuator"

## See Also

- [State Machine Documentation](./state-machine.md) - Detailed state machine architecture
- [Debugging Guide](./DEBUGGING.md) - Debugging tips and tools
- [Automation Usage](./AUTOMATION_USAGE.md) - How to use the bot

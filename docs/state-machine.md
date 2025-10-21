# Bot State Machine Architecture

## Overview

The LazyFrog bot uses XState v5 to manage its automation flow through a state machine that lives in the **background service worker**. This architecture eliminates race conditions, provides clear state transitions, and ensures state persists across page navigations.

## Why Background Service Worker?

The state machine lives in `src/background/index.ts` because:

1. **Persistence**: Background service workers persist across page navigations and reloads
2. **Centralized Control**: Single source of truth for bot state across all tabs and frames
3. **Reliability**: Content scripts are destroyed and recreated on navigation, but the background persists
4. **Coordination**: Can coordinate actions across multiple content scripts (reddit-content, devvit-content)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   Background Service Worker                      │
│                      (Persists Forever)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           XState State Machine (botActor)              │    │
│  │                                                         │    │
│  │  States: idle → starting → waitingForGame →            │    │
│  │          openingGame → gameReady → running →           │    │
│  │          completing → navigating → (loop)              │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ↓                                       │
│              handleStateTransition(state)                       │
│              - Sends commands to content scripts                │
│              - Persists state to chrome.storage                 │
│              - Broadcasts STATE_CHANGED to tabs                 │
└─────────────────────────────────────────────────────────────────┘
                          ↓ Commands                ↑ Events
                          ↓                         ↑
┌─────────────────────────────────────────────────────────────────┐
│                   Reddit Content Script                          │
│              (Recreated on Each Navigation)                      │
│                                                                  │
│  Role: "Sensor & Actuator" - Reports events, executes commands  │
│                                                                  │
│  Listens for Commands:                                          │
│    - CHECK_FOR_GAME_LOADER → checkForExistingLoader()           │
│    - CLICK_GAME_UI → clickGameUI()                              │
│    - FIND_NEXT_MISSION → getNextUnclearedMission()              │
│    - NAVIGATE_TO_URL → window.location.href = url              │
│    - STATE_CHANGED → update UI (control panel)                  │
│                                                                  │
│  Sends Events:                                                   │
│    - GAME_LOADER_DETECTED (from MutationObserver)               │
│    - GAME_DIALOG_OPENED (after clicking fullscreen)             │
│    - MISSION_FOUND (after scanning missions)                    │
│    - MISSION_PAGE_LOADED (on page load with active session)     │
│    - NO_MISSIONS_FOUND                                          │
│    - ERROR_OCCURRED                                             │
└─────────────────────────────────────────────────────────────────┘
                                                    ↑ Events
                                                    ↑
┌─────────────────────────────────────────────────────────────────┐
│                   Devvit Content Script                          │
│                    (Game Iframe)                                 │
│                                                                  │
│  Role: "Game Automation" - Plays the game                       │
│                                                                  │
│  Listens for Commands:                                          │
│    - START_MISSION_AUTOMATION → start gameAutomation          │
│    - STOP_MISSION_AUTOMATION → stop gameAutomation            │
│                                                                  │
│  Sends Events:                                                   │
│    - AUTOMATION_READY (when gameAutomation initialized)       │
│    - MISSION_COMPLETED (when Finish button clicked)             │
└─────────────────────────────────────────────────────────────────┘
```

## State Machine Definition

### States

```typescript
idle
  └─> starting (user clicked Start)
       ├─> waitingForGame (on mission page, waiting for loader)
       │    └─> openingGame (loader detected, clicking UI)
       │         └─> gameReady (game dialog opened)
       │              └─> running (automation active)
       │                   └─> completing (mission finished)
       │                        ├─> navigating (found next mission)
       │                        │    └─> (page reload, back to waitingForGame)
       │                        └─> idle (no more missions)
       ├─> navigating (need to navigate to mission)
       │    └─> (page reload, back to waitingForGame)
       └─> idle (no missions found)

error (can transition from any state)
  ├─> idle (user clicked Stop)
  └─> starting (user clicked Retry)
```

### Events

| Event | Source | Target | Description |
|-------|--------|--------|-------------|
| `START_BOT` | Popup | Background | User clicked Start button |
| `STOP_BOT` | Popup | Background | User clicked Stop button |
| `MISSION_PAGE_LOADED` | Reddit Content | Background | On mission page with active session |
| `GAME_LOADER_DETECTED` | Reddit Content | Background | MutationObserver found game loader |
| `GAME_DIALOG_OPENED` | Reddit Content | Background | Game dialog successfully opened |
| `AUTOMATION_READY` | Devvit Content | Background | Automation engine initialized |
| `MISSION_COMPLETED` | Devvit Content | Background | Finish button clicked |
| `MISSION_FOUND` | Reddit Content | Background | Found mission matching filters |
| `NO_MISSIONS_FOUND` | Reddit Content | Background | No missions match filters |
| `ERROR_OCCURRED` | Any Content | Background | Something went wrong |
| `RETRY` | User/Popup | Background | Retry after error |
| `NAVIGATE_TO_MISSION` | Background | Background | Internal event to navigate |

### Commands (Background → Content Scripts)

| Command | Target | Description |
|---------|--------|-------------|
| `STATE_CHANGED` | Reddit Content | Notify UI of state change |
| `CHECK_FOR_GAME_LOADER` | Reddit Content | Check if game loader exists |
| `CLICK_GAME_UI` | Reddit Content | Click game to open dialog |
| `FIND_NEXT_MISSION` | Reddit Content | Find next uncompleted mission |
| `NAVIGATE_TO_URL` | Reddit Content | Navigate to specific URL |
| `START_MISSION_AUTOMATION` | All Frames | Start game automation |
| `STOP_MISSION_AUTOMATION` | All Frames | Stop game automation |

## State Transition Logic

Located in `src/background/index.ts`:

```typescript
function handleStateTransition(stateName: string, context: any): void {
  switch (stateName) {
    case 'waitingForGame':
      // Tell reddit-content to check for game loader
      broadcastToReddit({ type: 'CHECK_FOR_GAME_LOADER' });
      break;

    case 'openingGame':
      // Tell reddit-content to click game UI
      broadcastToReddit({ type: 'CLICK_GAME_UI' });
      break;

    case 'gameReady':
      // Broadcast to all frames to start automation
      broadcastToAllFrames({
        type: 'START_MISSION_AUTOMATION',
        config: context.automationConfig
      });
      break;

    case 'completing':
      // Tell reddit-content to find next mission
      broadcastToReddit({
        type: 'FIND_NEXT_MISSION',
        filters: context.filters,
      });
      break;

    case 'navigating':
      // Tell reddit-content to navigate to URL
      if (context.currentMissionPermalink) {
        broadcastToReddit({
          type: 'NAVIGATE_TO_URL',
          url: context.currentMissionPermalink,
        });
      }
      break;
  }
}
```

## Context Data

The state machine context stores:

```typescript
{
  filters: LevelFilters,           // Mission filter criteria
  currentMissionId: string | null, // Current mission being played
  currentMissionPermalink: string | null,
  errorMessage: string | null,     // Error details (if in ERROR state)
  retryCount: number,              // Number of retry attempts
  automationConfig: any,           // Automation configuration
}
```

## State Persistence

State is automatically persisted to `chrome.storage.local` on every state change:

```typescript
botActor.subscribe((state) => {
  // Persist to storage
  chrome.storage.local.set({
    botMachineState: {
      value: state.value,
      context: state.context,
    },
  });

  // Broadcast to all reddit tabs
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

  // Perform actions based on state
  handleStateTransition(state.value, state.context);
});
```

## Content Script Architecture

### Reddit Content Script (`src/content/reddit/reddit.tsx`)

**Role**: Sensor and Actuator - detects DOM changes, reports to background, executes commands

**State Tracking**:
```typescript
// Local copies of state for UI rendering
let currentBotState: string = 'idle';
let currentBotContext: any = null;
```

**MutationObserver Setup**:
```typescript
const observer = new MutationObserver((mutations) => {
  const loader = document.querySelector('shreddit-devvit-ui-loader');
  if (loader) {
    // Report to background, let it decide if it should act
    chrome.runtime.sendMessage({ type: 'GAME_LOADER_DETECTED' });
    observer.disconnect();
  }
});
```

**Command Handlers**:
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'STATE_CHANGED':
      currentBotState = message.state;
      currentBotContext = message.context;
      renderControlPanel(); // Update UI
      break;

    case 'CHECK_FOR_GAME_LOADER':
      checkForExistingLoader();
      break;

    case 'CLICK_GAME_UI':
      clickGameUI();
      break;

    case 'FIND_NEXT_MISSION':
      getNextUnclearedMission(message.filters).then(mission => {
        if (mission) {
          chrome.runtime.sendMessage({
            type: 'MISSION_FOUND',
            missionId: mission.postId,
            permalink: mission.permalink,
            isCurrentPage: window.location.href === mission.permalink,
          });
        } else {
          chrome.runtime.sendMessage({ type: 'NO_MISSIONS_FOUND' });
        }
      });
      break;

    case 'NAVIGATE_TO_URL':
      window.location.href = message.url;
      break;
  }
});
```

### Devvit Content Script (`src/content/devvit/devvit.tsx`)

**Role**: Game Automation - runs gameAutomation engine in game iframe

**Initialization**:
```typescript
function initializeAutomation(config: any): void {
  gameAutomation = new GameInstanceAutomationEngine(config);

  // Wait for initialization (takes ~2 seconds)
  setTimeout(() => {
    chrome.runtime.sendMessage({
      type: 'AUTOMATION_READY',
      config: simpleConfig,
    });
  }, 2000);
}
```

**Mission Completion**:
```typescript
// In gameAutomation.ts - when Finish button clicked
chrome.runtime.sendMessage({
  type: 'MISSION_COMPLETED',
  missionId: postId,
});
```

## Debugging

### Console Access

Debug the state machine from browser console:

```javascript
// From Reddit page console (shows local state copy)
window.autoSupperDebug.getState()

// Get state value
window.autoSupperDebug.getState().state

// Get context
window.autoSupperDebug.getState().context

// Send events to background
window.autoSupperDebug.sendEvent({ type: 'GAME_LOADER_DETECTED' })
```

### Background Service Worker Inspection

1. Go to `chrome://extensions`
2. Find "Sword & Supper Bot"
3. Click "Service Worker" under "Inspect views"
4. Check console for `[StateMachine]` and `[StateTransition]` logs

### Logging

All state transitions are logged:

```
[StateMachine] Actor started in service worker { initialState: 'idle' }
[StateMachine] State changed { state: 'waitingForGame', context: {...} }
[StateTransition] Entered state { state: 'waitingForGame' }
[StateTransition] Broadcasting CHECK_FOR_GAME_LOADER to reddit tabs
```

Content script events:

```
[REDDIT] [MutationObserver] Game loader detected, reporting to background
[REDDIT] [CHECK_FOR_GAME_LOADER] Checking for loader
[REDDIT] [CLICK_GAME_UI] Clicking game UI
[DEVVIT] [AUTOMATION_READY] Sending ready notification to background
```

## Visualization

### Stately Studio (Recommended)

The best way to visualize the state machine:

1. Go to https://stately.ai/registry/new
2. Copy the machine code from `src/automation/botStateMachine.ts`
3. Paste it into Stately Studio
4. View the interactive state diagram

### Export to JSON

```typescript
import { toJSON } from 'xstate';
console.log(JSON.stringify(toJSON(botMachine), null, 2));
```

## Troubleshooting

### Bot gets stuck in WAITING_FOR_GAME
- **Cause**: Game loader not detected by MutationObserver
- **Check**: Look for `[MutationObserver] Game loader detected` log in reddit content console
- **Fix**: Manually check if `document.querySelector('shreddit-devvit-ui-loader')` exists

### Bot gets stuck in OPENING_GAME
- **Cause**: Can't find clickable element or fullscreen button
- **Check**: Look for `[CLICK_GAME_UI]` logs in reddit content console
- **Fix**: Check shadow DOM structure hasn't changed with `exploreGameLoader()`

### State machine not starting on page reload
- **Cause**: `activeBotSession` flag not set or `botMachineState` not persisted
- **Check**: Run `chrome.storage.local.get(['botMachineState', 'activeBotSession'])` in background console
- **Fix**: Ensure background script sets both flags on START_BOT

### State changes not reflected in UI
- **Cause**: STATE_CHANGED messages not reaching reddit-content
- **Check**: Look for `[STATE_CHANGED]` logs in reddit content console
- **Fix**: Verify background is broadcasting to tabs with `reddit.com` in URL

## Migration Notes

### From Reddit-Content State Machine (Old)

**Old Architecture**:
- State machine lived in `reddit-content.tsx`
- State lost on page navigation
- `botActor.send()` called directly

**New Architecture**:
- State machine lives in `background.ts`
- State persists across navigation
- Events sent via `chrome.runtime.sendMessage()`

**Breaking Changes**:
- `botActor` no longer exists in reddit-content
- `handleStateTransition()` moved to background
- Content scripts must listen for commands and send events
- All `botActor.send()` → `chrome.runtime.sendMessage()`
- All `botActor.getSnapshot()` → use `currentBotState` and `currentBotContext`

## Best Practices

1. **Always send events to background**, never modify state directly
2. **Background coordinates all actions**, content scripts execute them
3. **Use STATE_CHANGED to update UI**, not local state machine
4. **Content scripts are stateless sensors**, all state lives in background
5. **Report ALL significant events**, let background decide if it should act

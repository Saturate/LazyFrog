# Initialization Patterns and Best Practices

This document describes patterns for handling asynchronous initialization and message queuing in the LazyFrog extension.

## Problem: Race Conditions During Initialization

When content scripts load, they often need time to initialize (loading from storage, creating instances, setting up DOM observers, etc.). However, messages from the background script or other components can arrive **before initialization completes**.

**Common symptoms:**
- "Not initialized" errors in logs
- Messages being ignored or dropped
- Features not starting when they should
- Intermittent failures that work on retry

## Solution: Message Queuing Pattern

### Pattern: Queue-Then-Process

**Always follow this pattern when handling messages during initialization:**

1. **Set up message listeners IMMEDIATELY** (before any async work)
2. **Queue messages** that arrive before initialization completes
3. **Process queued messages** after initialization finishes

### Implementation Template

```typescript
// ============================================================================
// 1. SET UP EARLY MESSAGE LISTENER (runs immediately)
// ============================================================================

// Queue for messages that arrive before we're ready
let pendingMessages: Array<{type: string, data: any}> = [];
let isInitialized = false;

// Set up listener FIRST, before any async initialization
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isInitialized) {
    // Not ready yet - queue the message
    console.log('Queuing message until initialization completes', { type: message.type });
    pendingMessages.push(message);
    sendResponse({ success: true, queued: true });
    return true;
  }

  // Ready - handle message normally
  handleMessage(message);
  sendResponse({ success: true });
  return true;
});

// ============================================================================
// 2. ASYNC INITIALIZATION
// ============================================================================

async function initialize() {
  // Load configuration
  const config = await chrome.storage.local.get(['config']);

  // Create instances
  const engine = new AutomationEngine(config);

  // Set up DOM observers
  setupObservers();

  // Mark as ready
  isInitialized = true;

  // ============================================================================
  // 3. PROCESS QUEUED MESSAGES
  // ============================================================================

  console.log(`Initialization complete, processing ${pendingMessages.length} queued messages`);

  for (const message of pendingMessages) {
    console.log('Processing queued message', { type: message.type });
    handleMessage(message);
  }

  // Clear the queue
  pendingMessages = [];

  // Notify that we're ready
  chrome.runtime.sendMessage({ type: 'READY' });
}

// Start initialization
initialize();
```

## Real Examples in Codebase

### Example 1: GIAE (Game Instance Automation Engine)

**File:** `src/content/devvit/devvit.tsx`

**Problem:** `START_MISSION_AUTOMATION` arrives before `gameAutomation` is created (2s delay)

**Solution:**
```typescript
// Queue for early messages
let pendingStartMessage: any = null;

// Message listener set up immediately
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_MISSION_AUTOMATION':
      if (!gameAutomation) {
        // Queue it
        pendingStartMessage = message;
        sendResponse({ success: true, queued: true });
      } else {
        // Process it
        startAutomation(message);
        sendResponse({ success: true });
      }
      break;
  }
});

// After initialization completes
function initializeAutomation() {
  gameAutomation = new GameInstanceAutomationEngine(config);

  // Process queued message
  if (pendingStartMessage) {
    startAutomation(pendingStartMessage);
    pendingStartMessage = null;
  }
}
```

### Example 2: Page Load Detection

**File:** `src/content/reddit/reddit.tsx`

**Problem:** Need to detect when mission page loads, but game preview takes time to render

**Solution:**
```typescript
// Check immediately when script loads
chrome.storage.local.get(['activeBotSession'], (result) => {
  if (result.activeBotSession && isOnMissionPage()) {
    // Check if loader already exists (fast case)
    const loader = document.querySelector('shreddit-devvit-ui-loader');
    if (loader) {
      notifyPageLoaded();
    } else {
      // Set up observer to wait for it
      const observer = new MutationObserver(() => {
        const loader = document.querySelector('shreddit-devvit-ui-loader');
        if (loader) {
          notifyPageLoaded();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
});
```

## Anti-Patterns (Don't Do This)

### ❌ Anti-Pattern 1: Late Listener Setup

```typescript
// BAD: Initialization happens first
async function initialize() {
  await loadConfig();
  engine = new Engine();

  // Listener set up AFTER async work - messages can be missed!
  chrome.runtime.onMessage.addListener((message) => {
    handleMessage(message);
  });
}
```

**Why bad:** Messages arriving during `loadConfig()` or `new Engine()` are lost forever.

### ❌ Anti-Pattern 2: Ignoring Early Messages

```typescript
// BAD: Just ignores messages if not ready
chrome.runtime.onMessage.addListener((message) => {
  if (!isReady) {
    console.log('Not ready, ignoring message');
    return; // Message is lost!
  }
  handleMessage(message);
});
```

**Why bad:** The message sender doesn't know to retry. The message is lost.

### ❌ Anti-Pattern 3: Arbitrary Delays

```typescript
// BAD: Hoping 1 second is enough
setTimeout(() => {
  chrome.runtime.onMessage.addListener((message) => {
    handleMessage(message);
  });
}, 1000);
```

**Why bad:**
- If initialization takes longer than 1s, messages are still missed
- If initialization finishes in 100ms, we're waiting unnecessarily
- Fragile and non-deterministic

## Pattern Checklist

When adding new message handlers or initialization code:

- [ ] Message listener is set up **synchronously** (no async/await before setup)
- [ ] Message listener is at the **top of the file** (runs first)
- [ ] Messages check if initialization is complete
- [ ] Early messages are **queued** (not ignored)
- [ ] Queued messages are **processed** after initialization
- [ ] Queued messages are **cleared** after processing
- [ ] "Ready" notification is sent to coordinator (if applicable)

## When to Use This Pattern

Use this pattern whenever:

1. **Content scripts** with async initialization
2. **Components** that need to load data before handling messages
3. **DOM-dependent code** that must wait for elements to appear
4. **Storage-dependent code** that must load config/state first
5. **Any initialization** that involves:
   - `chrome.storage.local.get()`
   - `new SomeClass()` with async constructor
   - DOM queries with MutationObserver
   - Waiting for other components to be ready

## Testing Initialization Race Conditions

To verify your code handles race conditions:

1. **Add artificial delay to initialization:**
   ```typescript
   async function initialize() {
     await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
     // ... rest of initialization
   }
   ```

2. **Trigger the feature immediately** (before 5s passes)

3. **Check logs** for:
   - "Queuing message" logs
   - "Processing queued message" logs
   - Feature working correctly after delay

4. **Remove artificial delay** once verified

## Related Patterns

### MutationObserver for DOM Elements

When waiting for DOM elements, always:
1. Check if element already exists (immediate case)
2. Set up MutationObserver to wait for it (delayed case)
3. Have a timeout to give up eventually

See `waitForElement()` helper in `src/content/reddit/reddit.tsx`

### Event-Driven Coordination

The state machine pattern in `src/automation/botStateMachine.ts` helps coordinate:
- Background service worker sends **commands** (do this)
- Content scripts send **events** (this happened)
- State machine decides what happens next

This prevents race conditions at the architectural level.

## Summary

**Golden Rule:** Set up listeners FIRST, initialize LATER, process queued messages AFTER.

This pattern ensures **deterministic behavior** regardless of timing, making the extension reliable and debuggable.

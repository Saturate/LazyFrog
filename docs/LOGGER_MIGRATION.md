# Logger Migration Guide

This guide shows how to migrate existing console.log statements to use the unified logger.

## Quick Reference

### Old Pattern → New Pattern

```typescript
// Before
console.log('[POPUP] Message');
console.log('[POPUP] Message:', data);
console.warn('[POPUP] Warning');
console.error('[POPUP] Error:', error);

// After
import { popupLogger } from '../utils/logger';

popupLogger.log('Message');
popupLogger.log('Message', data);
popupLogger.warn('Warning');
popupLogger.error('Error', error);
```

## Migration Examples by File

### Popup (`src/popup/PopupApp.tsx`)

```typescript
// Add import at top
import { popupLogger } from '../utils/logger';

// Replace all console.log
- console.log('[POPUP] 🔵 PopupApp component loaded');
+ popupLogger.log('PopupApp component loaded');

- console.log('[POPUP] 🔵 Debug Step 1: Navigate to mission');
+ popupLogger.log('Debug Step 1: Navigate to mission');

- console.log('[POPUP] 📤 Sending START_MISSION_AUTOMATION via background...');
+ popupLogger.log('Sending START_MISSION_AUTOMATION via background');

- console.log('[POPUP] ✅ Message sent, response:', response);
+ popupLogger.log('Message sent', { response });

- console.error('[POPUP] ❌ Error:', chrome.runtime.lastError.message);
+ popupLogger.error('Error', { message: chrome.runtime.lastError.message });
```

### Background (`src/background/index.ts`)

```typescript
// Add import at top
import { extensionLogger } from '../utils/logger';

// Replace all console.log
- console.log('[EXT] Background service worker started');
+ extensionLogger.log('Background service worker started');

- console.log('[EXT] 📨 Received message:', message);
+ extensionLogger.log('Received message', { message });

- console.log('[EXT] 📤 Broadcasting START_MISSION_AUTOMATION to all frames');
+ extensionLogger.log('Broadcasting START_MISSION_AUTOMATION to all frames');

- console.log('[EXT] ✅ Message delivered, response:', response);
+ extensionLogger.log('Message delivered', { response });

- console.log('[EXT] ⚠️ Message error:', chrome.runtime.lastError.message);
+ extensionLogger.warn('Message error', { error: chrome.runtime.lastError.message });
```

### Reddit Content Script (`src/content/reddit/reddit.tsx`)

```typescript
// Add import at top
import { redditLogger } from '../../utils/logger';

// Replace all console.log
- console.log('[REDDIT] Sword & Supper Bot content script loaded');
+ redditLogger.log('Content script loaded');

- console.log('[REDDIT] 📍 Current URL:', window.location.href);
+ redditLogger.log('Current URL', { url: window.location.href });

- console.log('[REDDIT] 📨 Received Chrome message:', message);
+ redditLogger.log('Received Chrome message', { message });

- console.log('[REDDIT] Found loader:', loader);
+ redditLogger.log('Found loader', { loader });

- console.log('[REDDIT] Iframe src:', gameIframe?.src);
+ redditLogger.log('Iframe src', { src: gameIframe?.src });

- console.warn('[REDDIT] Post has no title:', post);
+ redditLogger.warn('Post has no title', { post });
```

### Devvit Content Script (`src/content/devvit/devvit.tsx`)

```typescript
// Add import at top
import { devvitLogger } from '../../utils/logger';

// Replace all console.log
- console.log('[DEVVIT] Script loaded:', window.location.href);
+ devvitLogger.log('Script loaded', { url: window.location.href });

- console.log('[DEVVIT] 💉 Injecting control panel...');
+ devvitLogger.log('Injecting control panel');

- console.log('[DEVVIT] 🤖 Initializing mission automation engine...');
+ devvitLogger.log('Initializing mission automation engine');

- console.log('[DEVVIT] ⚙️ Config:', config);
+ devvitLogger.log('Config', { config });

- console.log('[DEVVIT] 📨 Received Chrome message:', message);
+ devvitLogger.log('Received Chrome message', { message });

- console.error('[DEVVIT] ❌ Automation engine not initialized');
+ devvitLogger.error('Automation engine not initialized');
```

## Benefits of Migration

1. **Consistent Format**: All logs follow the same structure
2. **Remote Debugging**: Logs sent to debug server (when enabled)
3. **Proper Log Levels**: Uses console.log, console.warn, console.error appropriately
4. **Clean Messages**: No manual emoji or prefix management
5. **Type Safety**: TypeScript ensures correct usage
6. **Easy Toggle**: Remote logging can be enabled/disabled from Options

## Notes

- Emojis are removed - the logger uses appropriate console methods instead
- Prefixes ([POPUP], [EXT], [REDDIT], [DEVVIT]) are automatically added
- Data should be passed as second parameter, not concatenated into message string
- The logger will handle JSON serialization and circular reference cleanup

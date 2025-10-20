# Logger Usage Guide

The unified logger provides consistent logging across all extension contexts with optional remote debugging support.

## Features

- **Context-aware prefixes**: Automatically adds [POPUP], [EXT], [REDDIT], or [DEVVIT] prefix
- **Proper log levels**: Uses appropriate console methods (console.log, console.warn, console.error)
- **Remote logging**: Sends logs to http://localhost:7856/log for debugging and AI integration
- **Graceful degradation**: Silent failure if remote server is unavailable
- **JSON serialization**: Safely handles circular references and complex objects
- **Console output**: Still prints to browser console for immediate feedback

## Basic Usage

### In Popup (`src/popup/`)

```typescript
import { popupLogger } from '../utils/logger';

// Simple log
popupLogger.log('PopupApp component loaded');

// Log with data
popupLogger.info('User clicked button', { buttonId: 'start' });

// Warning
popupLogger.warn('No missions found', { filters });

// Error
popupLogger.error('Failed to send message', { error: err.message });

// Debug
popupLogger.debug('State updated', { oldState, newState });
```

### In Background (`src/background/`)

```typescript
import { extensionLogger } from '../utils/logger';

extensionLogger.log('Background service worker started');
extensionLogger.info('Received message', { type: message.type });
extensionLogger.error('Failed to broadcast message', { error });
```

### In Reddit Content Script (`src/content/reddit/`)

```typescript
import { redditLogger } from '../../utils/logger';

redditLogger.log('Reddit content script loaded');
redditLogger.info('Found missions', { count: levels.length });
redditLogger.warn('No game iframe found yet');
```

### In Devvit Content Script (`src/content/devvit/`)

```typescript
import { devvitLogger } from '../../utils/logger';

devvitLogger.log('Devvit content script loaded');
devvitLogger.info('Automation engine initialized', { config });
devvitLogger.debug('Game state extracted', { state: gameState });
```

## Advanced Usage

### Creating Custom Logger

If you need a logger with custom configuration:

```typescript
import { createLogger } from '../utils/logger';

const customLogger = createLogger('POPUP', {
  remoteLogging: false, // Disable remote logging
  consoleLogging: true, // Keep console logging
  remoteUrl: 'http://localhost:8000/logs', // Custom URL
});
```

### Runtime Configuration

You can change logger settings at runtime:

```typescript
import { popupLogger } from '../utils/logger';

// Disable remote logging (e.g., in production)
popupLogger.setRemoteLogging(false);

// Disable console logging (e.g., reduce noise)
popupLogger.setConsoleLogging(false);

// Update multiple settings
popupLogger.setConfig({
  remoteLogging: true,
  remoteUrl: 'https://my-server.com/logs',
});
```

## Log Server Format

Logs are sent to the server as JSON with this structure:

```json
{
  "timestamp": "2025-10-20T12:34:56.789Z",
  "context": "REDDIT",
  "level": "info",
  "message": "Found missions",
  "data": {
    "count": 5
  }
}
```

## Migration Guide

### Before (old manual logging):

```typescript
console.log('[REDDIT] 📨 Received message:', message);
console.error('[POPUP] ❌ Failed to load:', error);
```

### After (using logger):

```typescript
import { redditLogger, popupLogger } from '../../utils/logger';

redditLogger.log('Received message', message);
popupLogger.error('Failed to load', error);
```

## Benefits

1. **Consistency**: All logs follow the same format across the extension
2. **Type safety**: TypeScript ensures correct usage
3. **Remote debugging**: View logs from all contexts in one place
4. **AI integration**: Structured logs are easier to analyze
5. **Flexible**: Easy to enable/disable features without changing code
6. **Safe**: Handles errors gracefully, never breaks the extension

## Simple Debug Server

Here's a minimal Node.js server to receive logs:

```javascript
// debug-server.js
const express = require('express');
const app = express();

app.use(express.json());

app.post('/log', (req, res) => {
  const { timestamp, context, level, message, data } = req.body;
  console.log(`[${timestamp}] [${context}] [${level}] ${message}`, data || '');
  res.status(200).send('OK');
});

app.listen(7856, () => {
  console.log('Debug server listening on http://localhost:7856');
});
```

Run with: `node debug-server.js`

## Best Practices

1. **Use appropriate log levels**:
   - `log`: General information
   - `info`: Important events (user actions, state changes)
   - `warn`: Potential issues (missing data, fallback behavior)
   - `error`: Actual errors (failed operations, exceptions)
   - `debug`: Detailed debugging info (state snapshots, flow traces)

2. **Include relevant data**:
   ```typescript
   // Good: Provides context
   logger.info('Mission started', { missionId, difficulty });

   // Bad: Too vague
   logger.info('Mission started');
   ```

3. **Keep messages concise**:
   ```typescript
   // Good: Short, clear message
   logger.error('Failed to fetch missions', { error: err.message });

   // Bad: Long, redundant message
   logger.error('An error occurred when trying to fetch missions from the server', { error: err.message });
   ```

4. **Use data parameter for objects**:
   ```typescript
   // Good: Structured data
   logger.log('Received message', { type: message.type, data: message.data });

   // Bad: Manual stringification
   logger.log(`Received message: ${JSON.stringify(message)}`);
   ```

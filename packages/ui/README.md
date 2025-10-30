# @lazyfrog/ui

Shared UI components for the LazyFrog monorepo.

## Components

### LogViewer

A performant log viewer component built with TanStack Table and virtualization.

**Features:**
- Virtualized rows for handling thousands of logs efficiently
- Global search across all log entries
- Filter by log level (log, info, warn, error, debug)
- Sortable columns
- Color-coded log levels
- Sticky header
- Empty state handling

**Usage:**

```tsx
import LogViewer, { type LogEntry } from '@lazyfrog/ui/LogViewer';

const logs: LogEntry[] = [
  {
    timestamp: '2024-10-30T20:00:00.000Z',
    context: 'REDDIT',
    level: 'info',
    message: 'Mission started',
    data: { missionId: '123' }
  }
];

<LogViewer
  logs={logs}
  height="600px"
  onClearFilter={() => console.log('Filters cleared')}
/>
```

**Props:**

- `logs: LogEntry[]` - Array of log entries to display
- `height?: string` - Height of the viewer (default: '500px')
- `onClearFilter?: () => void` - Optional callback when filters are cleared

## Development

This package uses:
- React 19.2.0
- TanStack Table v8
- TanStack Virtual
- Lucide React for icons

These are declared as peer dependencies and should be provided by the consuming application.

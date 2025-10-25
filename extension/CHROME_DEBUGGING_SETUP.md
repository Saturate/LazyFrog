# Chrome Remote Debugging Setup

## Overview

To use Chrome DevTools MCP with your extension loaded, you need to:
1. Launch Chrome with remote debugging enabled
2. Load your extension
3. Claude Code will connect to that Chrome instance

## Step 1: Launch Chrome with Remote Debugging

### macOS

Close all Chrome instances first, then run:

```bash
# For Chrome
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug \
  --load-extension=/Users/AKJ/code/AutoSupper/dist
```

### Explanation of Flags

- `--remote-debugging-port=9222` - Opens a debugging port
- `--user-data-dir=/tmp/chrome-debug` - Uses a temporary profile
- `--load-extension=/path/to/dist` - Loads your extension automatically

## Step 2: Verify Remote Debugging Works

Open a new terminal and run:

```bash
curl http://127.0.0.1:9222/json
```

You should see JSON with page information.

## Step 3: Use Claude Code

Now when you use Claude Code, the Chrome DevTools MCP will connect to your running Chrome instance with the extension loaded!

```javascript
// In Claude Code, you can now:
mcp__chrome-devtools__list_pages()  // Shows tabs in your Chrome
mcp__chrome-devtools__navigate_page()  // Navigate to Reddit
mcp__chrome-devtools__list_console_messages()  // See extension logs!
```

## Quick Start Script

Create a launch script:

```bash
#!/bin/bash
# launch-chrome-debug.sh

# Close existing Chrome
pkill -9 "Google Chrome" 2>/dev/null

# Wait a moment
sleep 1

# Launch with debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug-autosupper \
  --load-extension="$(pwd)/dist" \
  --new-window \
  "https://www.reddit.com/r/SwordAndSupperGame/" &

echo "🚀 Chrome launched with extension and remote debugging"
echo "📍 Port: 9222"
echo "🔗 Extension: $(pwd)/dist"
echo ""
echo "Now you can use Claude Code to debug!"
```

Save this as `launch-chrome-debug.sh` and run:

```bash
chmod +x launch-chrome-debug.sh
./launch-chrome-debug.sh
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 9222
lsof -i :9222

# Kill it
kill -9 <PID>
```

### Chrome Won't Close

```bash
# Force quit all Chrome processes
pkill -9 "Google Chrome"
pkill -9 "chrome"
```

### Extension Not Loading

Make sure:
1. Extension is built: `npm run build`
2. `dist/` folder exists
3. Path in `--load-extension` is correct (use absolute path)

### Can't Connect from Claude Code

Check:
1. Chrome is running with `--remote-debugging-port=9222`
2. Port is accessible: `curl http://127.0.0.1:9222/json`
3. Claude Code config has correct URL

## MCP Configuration

The MCP config in `~/.claude.json` should look like:

```json
{
  "projects": {
    "/Users/AKJ/code/AutoSupper": {
      "mcpServers": {
        "chrome-devtools": {
          "type": "stdio",
          "command": "npx",
          "args": [
            "chrome-devtools-mcp@latest",
            "--browserUrl",
            "http://127.0.0.1:9222"
          ],
          "env": {}
        }
      }
    }
  }
}
```

## What You Can Debug

Once connected, you can:

✅ See console logs from your extension
✅ Navigate between Reddit pages
✅ Test selectors on live pages
✅ Verify `window.autoSupperDebug` works
✅ Check if posts are being detected
✅ Monitor network requests
✅ Take screenshots

## Example Session

```bash
# Terminal 1: Launch Chrome
./launch-chrome-debug.sh

# Terminal 2: Use Claude Code
# Now in Claude Code conversation:
# "Use Chrome DevTools MCP to check if my extension detects levels on Reddit"
```

Claude Code will:
1. Connect to your Chrome instance
2. Navigate to Reddit (if needed)
3. Check console logs
4. Run test functions
5. Report results

## Clean Up

When done:

```bash
# Close Chrome
pkill "Google Chrome"

# Remove temporary profile
rm -rf /tmp/chrome-debug-autosupper
```

## Alternative: Use Existing Chrome Profile

If you want to use your regular Chrome profile:

```bash
# Find your Chrome profile path
# macOS: ~/Library/Application Support/Google/Chrome/

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/Library/Application Support/Google/Chrome" \
  --load-extension="$(pwd)/dist"
```

⚠️ **Warning**: This will restart Chrome and close all existing tabs.

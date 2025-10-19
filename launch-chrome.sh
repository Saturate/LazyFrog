#!/bin/bash
# Launch Chrome with remote debugging and extension loaded

echo "🔧 AutoSupper Chrome Launcher"
echo "=============================="
echo ""

PORT=56744
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIST_PATH="$SCRIPT_DIR/dist"
USER_DATA_DIR="$HOME/.autosupper-chrome-profile"

# Check if dist folder exists
if [ ! -d "$DIST_PATH" ]; then
    echo "❌ Error: dist/ folder not found!"
    echo "   Run 'npm run build' first"
    exit 1
fi

echo "📦 Extension path: $DIST_PATH"
echo "👤 User data dir: $USER_DATA_DIR"
echo "🔌 Debug port: $PORT"
echo ""

# Kill Chrome completely
echo "1️⃣  Stopping Chrome..."
pkill -9 "Google Chrome" 2>/dev/null
pkill -9 "Chrome" 2>/dev/null
sleep 2
echo "   ✅ Chrome stopped"
echo ""

# Create user data directory if it doesn't exist
mkdir -p "$USER_DATA_DIR"

# Launch Chrome with debugging
echo "2️⃣  Launching Chrome..."
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=$PORT \
  --user-data-dir="$USER_DATA_DIR" \
  --load-extension="$DIST_PATH" \
  --new-window \
  "https://www.reddit.com/r/SwordAndSupperGame/" \
  > /dev/null 2>&1 &

echo "   ⏳ Waiting for Chrome to start..."
sleep 4

# Verify port is open
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "   ✅ Port $PORT is open"
else
    echo "   ❌ Port $PORT is NOT open"
    exit 1
fi
echo ""

# Test connection
echo "3️⃣  Testing remote debugging..."
if curl -s http://127.0.0.1:$PORT/json/version > /dev/null 2>&1; then
    echo "   ✅ Remote debugging works!"
    echo ""
    echo "📊 Chrome info:"
    curl -s http://127.0.0.1:$PORT/json/version | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"   Browser: {d['Browser']}\")"
else
    echo "   ❌ Cannot connect"
    exit 1
fi
echo ""

echo "✨ Chrome is ready!"
echo ""
echo "📝 Next steps:"
echo "   1. Chrome should have opened with Reddit"
echo "   2. Go to chrome://extensions/ to verify extension loaded"
echo "   3. Open DevTools (F12) on Reddit page"
echo "   4. Check console for: 🤖 Sword & Supper Bot content script loaded"
echo ""
echo "💡 Claude Code can now connect to debug!"
echo "   Just say: 'check the extension console logs'"

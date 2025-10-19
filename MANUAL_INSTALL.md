# Manual Extension Installation

The `--load-extension` flag doesn't always work reliably. Manual installation is more reliable.

## Steps

### 1. Run the launch script (Chrome with debugging)
```bash
./launch-chrome.sh
```

Chrome will open but the extension might not load automatically.

### 2. Manually load the extension

1. In the Chrome window that opened, go to:
   ```
   chrome://extensions/
   ```

2. **Enable "Developer mode"** (toggle in top-right corner)

3. Click **"Load unpacked"**

4. Navigate to and select:
   ```
   /Users/AKJ/code/AutoSupper/dist
   ```

5. Click **"Select"**

### 3. Verify it loaded

You should see **"Sword & Supper Bot"** listed with:
- ✅ Enabled toggle is ON
- ✅ No errors shown
- ✅ Version 2.0.0

### 4. Test on Reddit

1. Go to: https://www.reddit.com/r/SwordAndSupperGame/

2. Open DevTools (F12)

3. Check Console - you should see:
   ```
   🤖 Sword & Supper Bot content script loaded
   📍 Current URL: https://www.reddit.com/r/SwordAndSupperGame/
   💡 Debug functions available: window.autoSupperDebug
   ⏰ Initial page scan starting...
   ✅ Found X posts using selector: "shreddit-post"
   ```

### 5. Test debug functions

In the Console, run:
```javascript
window.autoSupperDebug.getAllLevels()
window.autoSupperDebug.testSelectors()
```

You should see the detected levels!

## Why Manual Loading?

- Chrome's `--load-extension` flag is unreliable with temporary profiles
- Manifest V3 extensions sometimes don't load via command line
- Manual loading always works and persists in the profile

## After Manual Installation

Once manually loaded, the extension will:
- ✅ Stay loaded in the `~/.autosupper-chrome-profile`
- ✅ Work every time you run `./launch-chrome.sh`
- ✅ Be debuggable via Claude Code MCP

You only need to manually load it **once**!

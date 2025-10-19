# Debugging Guide - AutoSupper Extension

## Why Levels Aren't Being Detected

There are several reasons why the extension might not detect levels on Reddit:

### 1. **Reddit's New UI Uses Different Selectors**

Reddit frequently updates their UI, which changes the DOM structure. Your extension uses these selectors:

```typescript
// Current selectors in src/content/index.tsx
const posts = document.querySelectorAll('[data-testid="post-container"]');
const titleElement = post.querySelector('h3');
const linkElement = post.querySelector('a[data-click-id="body"]');
const flairElement = post.querySelector('[data-test-id="post-flair"]');
```

**Problem**: Reddit may have changed these `data-testid` or `data-click-id` attributes.

**Solution**: Use the Reddit API instead of DOM scraping (see `docs/REDDIT_API_USAGE.md`).

### 2. **Script Runs Before Page Loads**

The content script might run before Reddit's JavaScript renders the posts.

**Current behavior**:
```typescript
// In src/content/index.tsx
setTimeout(() => {
  console.log('Initial page scan...');
  const levels = getAllLevels();
  console.log('Levels found:', levels);
}, 2000);
```

**Problem**: 2 seconds might not be enough for Reddit to render.

**Solution**: Use a MutationObserver or the Reddit API.

### 3. **Reddit Uses Shadow DOM or Iframes**

Some Reddit UI elements are in Shadow DOM, which requires special access.

**Check**: Your code already has `exploreGameLoader()` which tries to access shadow DOM for the game iframe.

### 4. **Extension Permissions**

Check that the extension has the right permissions:

```json
// public/manifest.json
"host_permissions": [
  "https://www.reddit.com/*"
],
"content_scripts": [
  {
    "matches": ["https://www.reddit.com/r/SwordAndSupperGame/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }
]
```

## How to Debug

### Step 1: Check Console Logs

1. **Load the extension** in your browser
2. **Navigate** to https://www.reddit.com/r/SwordAndSupperGame/
3. **Open DevTools** (F12)
4. **Check for these logs**:

```
Sword & Supper Bot content script loaded
Initial page scan...
Levels found: [...]
```

**If you DON'T see these logs**: The content script isn't running.
- Check if the extension is enabled
- Check if the URL matches the pattern in manifest
- Reload the extension

**If logs show "Levels found: []"**: The script runs but can't find posts.
- Continue to Step 2

### Step 2: Inspect DOM Structure

In the browser console, manually check if the selectors work:

```javascript
// Check if post containers exist
const posts = document.querySelectorAll('[data-testid="post-container"]');
console.log('Found posts:', posts.length);

// Check first post structure
if (posts.length > 0) {
  const first = posts[0];
  console.log('First post:', first);
  console.log('Title:', first.querySelector('h3')?.textContent);
  console.log('Link:', first.querySelector('a[data-click-id="body"]')?.href);
  console.log('Flair:', first.querySelector('[data-test-id="post-flair"]')?.textContent);
}

// Check all attributes on first post
if (posts.length > 0) {
  const attrs = Array.from(posts[0].attributes);
  console.log('Post attributes:', attrs.map(a => `${a.name}="${a.value}"`));
}
```

**If `posts.length === 0`**: Reddit changed their DOM structure.
- Solution: Switch to Reddit API (see docs/REDDIT_API_USAGE.md)

**If posts exist but title/link/flair selectors fail**: Selectors are outdated.
- Solution: Update selectors or use Reddit API

### Step 3: Test Reddit API

The extension now includes a Reddit API module. Test it in the console:

```javascript
// In the browser console on Reddit
fetch('https://www.reddit.com/r/SwordAndSupperGame/new.json?limit=5')
  .then(r => r.json())
  .then(data => {
    console.log('Reddit API Response:', data);
    console.log('Posts:', data.data.children);
  });
```

**Expected**: You should see an object with `data.children` array containing posts.

**If it works**: The API is the reliable way to get posts.

### Step 4: Enable the Extension's API Functions

Add this to `src/content/index.tsx` temporarily for debugging:

```typescript
// At the bottom of the file
(window as any).autoSupperDebug = {
  getAllLevels,
  parseLevelFromPost,
  processLevels,
  filters,
  isRunning
};
```

Rebuild and reload the extension, then in console:

```javascript
// Test functions
const levels = window.autoSupperDebug.getAllLevels();
console.log('Levels:', levels);

// Test parsing a specific post
const posts = document.querySelectorAll('[data-testid="post-container"]');
if (posts[0]) {
  const level = window.autoSupperDebug.parseLevelFromPost(posts[0]);
  console.log('Parsed level:', level);
}
```

### Step 5: Check Webpack Build

Make sure the extension builds successfully:

```bash
npm run build
```

Look for errors in the build output. Common issues:
- TypeScript errors
- Missing dependencies
- Import/export problems

### Step 6: Reload Extension After Changes

**Critical**: After ANY code change:
1. Rebuild: `npm run build`
2. Go to `chrome://extensions/` or `about:debugging`
3. Click "Reload" on your extension
4. Refresh the Reddit page

### Step 7: Check for Errors in Extension Pages

The extension has multiple contexts:

1. **Background Script**: Check in `chrome://extensions/` → Details → "Inspect views: background page"
2. **Content Script**: Check in DevTools on the Reddit page
3. **Popup**: Right-click extension icon → "Inspect Popup"

Check ALL three for errors.

## Common Issues and Solutions

### Issue: "Levels found: []"

**Cause**: DOM selectors don't match Reddit's current structure.

**Solutions**:
1. **Use Reddit API** (recommended):
   ```typescript
   import { fetchPosts } from '../api/reddit';
   import { parseLevelFromAPI } from '../api/levelParser';

   const posts = await fetchPosts({ sort: 'new', limit: 100 });
   const levels = posts.map(p => parseLevelFromAPI(p)).filter(Boolean);
   ```

2. **Update DOM selectors** by inspecting current Reddit HTML

3. **Wait longer for page load**:
   ```typescript
   // Increase timeout
   setTimeout(() => getAllLevels(), 5000);
   ```

### Issue: Extension Not Loading

**Symptoms**: Icon doesn't appear, no console logs

**Check**:
1. Icons exist: `ls public/icons/*.png` should show 4 files (16, 32, 48, 128)
2. Manifest is valid: `cat public/manifest.json | python3 -m json.tool`
3. Build succeeded: Check for webpack errors
4. Correct path: Load the `dist/` folder, not the root folder

### Issue: Content Script Doesn't Run

**Check**:
1. URL matches pattern in manifest
2. Permission granted to site
3. `run_at` setting (currently `document_idle`)
4. Check background script console for errors

### Issue: React Components Don't Render

**Check**:
1. Container element exists: `document.getElementById('ss-bot-react-root')`
2. React imported correctly
3. No JavaScript errors in console
4. CSS not blocking rendering

### Issue: Shadow DOM/Game Iframe Access

For the game (runs in `*.devvit.net` iframe):

1. Check `game.js` loads: Look for log "🎮 Sword & Supper Game script loaded in iframe"
2. Content scripts need `"all_frames": true` in manifest
3. Cross-origin restrictions may block iframe access

## Testing Checklist

- [ ] Extension builds without errors (`npm run build`)
- [ ] Icons copied to `dist/icons/` (4 files, not empty)
- [ ] Extension loads in browser (check `chrome://extensions/`)
- [ ] Content script logs appear on Reddit page
- [ ] DOM selectors find posts OR Reddit API works
- [ ] Levels parsed correctly (check console output)
- [ ] Filters apply correctly
- [ ] React UI renders when bot starts
- [ ] Can click on filtered levels
- [ ] Game script loads in iframe

## Recommended Fix: Switch to Reddit API

The most reliable solution is to use the Reddit API instead of DOM scraping:

### Before (DOM Scraping):
```typescript
function getAllLevels(): Level[] {
  // Fragile - breaks when Reddit updates UI
  const posts = document.querySelectorAll('[data-testid="post-container"]');
  const levels: Level[] = [];
  posts.forEach(post => {
    const level = parseLevelFromPost(post); // Uses DOM queries
    if (level) levels.push(level);
  });
  return levels;
}
```

### After (Reddit API):
```typescript
async function getAllLevels(): Promise<Level[]> {
  try {
    // Reliable - uses stable JSON API
    const posts = await fetchPosts({ sort: 'new', limit: 100 });
    return posts
      .map(post => parseLevelFromAPI(post))
      .filter((level): level is Level => level !== null);
  } catch (error) {
    console.error('API failed, falling back to DOM:', error);
    return getAllLevelsFromDOM(); // Keep DOM as fallback
  }
}
```

See `docs/REDDIT_API_USAGE.md` for complete migration guide.

## Debug Output Format

When debugging, log structured data:

```typescript
console.log('🔍 AutoSupper Debug Info:', {
  scriptLoaded: true,
  url: window.location.href,
  postsFound: posts.length,
  levelsFiltered: filteredLevels.length,
  filters: filters,
  sampleLevel: filteredLevels[0],
  timestamp: new Date().toISOString()
});
```

This helps identify exactly where the pipeline fails.

## Still Not Working?

1. **Check Reddit's HTML** - Right-click a post → Inspect
2. **Look for console errors** - Red text in DevTools console
3. **Test API directly** - Use `fetch()` in console to test Reddit API
4. **Verify permissions** - Check manifest `host_permissions`
5. **Try incognito** - Rules out conflicts with other extensions
6. **Check browser version** - Manifest V3 requires recent Chrome/Firefox

## Next Steps

1. Load the extension and check console for logs
2. Test if DOM selectors work (Step 2 above)
3. If DOM fails, migrate to Reddit API
4. Add debug exports for console testing
5. Test on a fresh browser profile

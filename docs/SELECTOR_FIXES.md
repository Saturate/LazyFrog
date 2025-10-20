# Reddit Selector Fixes - October 2025

## Problem
The extension wasn't detecting any levels on Reddit because the DOM selectors were outdated.

## Root Cause
Reddit's UI changed to use custom web components (`<shreddit-post>`) instead of the previous structure with `[data-testid="post-container"]`.

## Solution

### Working Selectors (as of Oct 2025)

#### Post Container
```javascript
// ✅ WORKS - Reddit's new custom element
document.querySelectorAll('shreddit-post')

// ❌ DOESN'T WORK - Old selector
document.querySelectorAll('[data-testid="post-container"]')
```

#### Post Data Extraction

Reddit now stores post data in **attributes** on the `<shreddit-post>` element:

```javascript
const post = document.querySelector('shreddit-post');

// Get title
const title = post.getAttribute('post-title');
// Example: "Please upvote. 5 star red map."

// Get permalink
const permalink = post.getAttribute('permalink');
// Example: "/r/SwordAndSupperGame/comments/1oasyxt/..."

// Get other metadata
const author = post.getAttribute('author');
const score = post.getAttribute('score');
const commentCount = post.getAttribute('comment-count');
```

#### Level Flair

Flair is now a **link element** inside the post:

```javascript
// ✅ WORKS - Flair link
const flairLink = post.querySelector('a[href*="flair_name"]');
const flair = flairLink ? flairLink.textContent.trim() : null;
// Example: "Level 21-40"

// ❌ DOESN'T WORK - Old selectors
post.querySelector('[data-test-id="post-flair"]')
post.querySelector('flair-text')
```

## Updated parseLevelFromPost Function

```typescript
function parseLevelFromPost(post: Element): Level | null {
  try {
    // Get data from attributes (not child elements!)
    const title = post.getAttribute('post-title') || '';
    const permalink = post.getAttribute('permalink') || '';

    if (!title) return null;

    // Get flair link
    const flairLink = post.querySelector('a[href*="flair_name"]');
    const levelRange = flairLink ? flairLink.textContent?.trim() || null : null;

    // Extract level number from title
    const levelMatch = title.match(/(?:level|mission)\s*(\d+)/i);
    const levelNumber = levelMatch ? parseInt(levelMatch[1]) : null;

    // Parse level range from flair (e.g., "Level 21-40")
    let levelRangeMin: number | null = null;
    let levelRangeMax: number | null = null;
    if (levelRange) {
      const rangeMatch = levelRange.match(/Level\s+(\d+)-(\d+)/i);
      if (rangeMatch) {
        levelRangeMin = parseInt(rangeMatch[1]);
        levelRangeMax = parseInt(rangeMatch[2]);
      }
    }

    // ⭐ NEW: Extract star difficulty from Devvit preview (shadow DOM)
    let starDifficulty = 0;
    const devvitLoader = post.querySelector('shreddit-devvit-ui-loader');
    if (devvitLoader?.shadowRoot) {
      const surface = devvitLoader.shadowRoot.querySelector('devvit-surface');
      if (surface?.shadowRoot) {
        const renderer = surface.shadowRoot.querySelector('devvit-blocks-renderer');
        if (renderer?.shadowRoot) {
          // Count filled star images
          const filledStars = renderer.shadowRoot.querySelectorAll('img[src*="ap8a5ghsvyre1.png"]');
          starDifficulty = filledStars.length;
        }
      }
    }

    const href = permalink ? `https://www.reddit.com${permalink}` : null;

    return {
      title,
      href,
      levelNumber,
      levelRange,
      levelRangeMin,
      levelRangeMax,
      stars: starDifficulty,
      isCompleted: false, // Can add logic for this
      element: post,
    };
  } catch (error) {
    console.error('Error parsing level:', error);
    return null;
  }
}
```

## Testing Results (Chrome DevTools MCP)

Tested on https://www.reddit.com/r/SwordAndSupperGame/ on Oct 19, 2025:

### Selector Test Results
| Selector | Count | Status |
|----------|-------|--------|
| `[data-testid="post-container"]` | 0 | ❌ Not found |
| `shreddit-post` | 4 | ✅ Works |
| `[data-click-id="background"]` | 0 | ❌ Not found |
| `article` | 4 | ⚠️ Works but less specific |
| `[id^="t3_"]` | 8 | ⚠️ Works but includes duplicates |

### Extracted Sample Data

```json
[
  {
    "id": "t3_1oasyxt",
    "title": "Please upvote. 5 star red map.",
    "permalink": "https://www.reddit.com/r/SwordAndSupperGame/comments/1oasyxt/...",
    "flair": "Level 21-40",
    "levelRangeMin": 21,
    "levelRangeMax": 40
  },
  {
    "id": "t3_1o5zuek",
    "title": "🕷️🎃🕷️ Halloween Mythic Map! Upvote Please🎃🕷️",
    "permalink": "https://www.reddit.com/r/SwordAndSupperGame/comments/1o5zuek/...",
    "flair": "Level 6-20",
    "levelRangeMin": 6,
    "levelRangeMax": 20
  }
]
```

## Key Changes Made

### Before (Broken)
```typescript
// ❌ Looking for h3 in child elements
const titleElement = post.querySelector('h3');
const title = titleElement.textContent?.trim() || '';

// ❌ Old selectors
const linkElement = post.querySelector('a[data-click-id="body"]');
const flairElement = post.querySelector('[data-test-id="post-flair"]');
```

### After (Fixed)
```typescript
// ✅ Reading from attributes
const title = post.getAttribute('post-title') || '';
const permalink = post.getAttribute('permalink') || '';

// ✅ New flair selector
const flairLink = post.querySelector('a[href*="flair_name"]');
const levelRange = flairLink ? flairLink.textContent?.trim() || null : null;
```

## Browser Compatibility

Tested and working on:
- ✅ Chrome (with Manifest V3)
- ⚠️ Firefox (not yet tested)

## Future-Proofing

To avoid breaking when Reddit updates their UI again:

1. **Use Reddit API** instead of DOM scraping (see `docs/REDDIT_API_USAGE.md`)
2. **Multiple fallback selectors** (already implemented in getAllLevels)
3. **Attribute-based data** is more stable than DOM structure
4. **Add tests** to detect when selectors break

## Migration Checklist

- [x] Update `parseLevelFromPost()` to use `post-title` attribute
- [x] Update flair selector to `a[href*="flair_name"]`
- [x] Add `shreddit-post` to selector list
- [x] Test on live Reddit page
- [x] Rebuild extension
- [ ] Test in actual browser with extension loaded
- [ ] Verify all features work (filtering, clicking, etc.)

## How to Test

1. **Load extension** in Chrome from `dist/` folder
2. **Navigate** to https://www.reddit.com/r/SwordAndSupperGame/
3. **Open DevTools** Console (F12)
4. **Check logs** for:
   ```
   🤖 Sword & Supper Bot content script loaded
   ✅ Found X posts using selector: "shreddit-post"
   📝 Level 1: {...}
   ```
5. **Test debug functions**:
   ```javascript
   window.autoSupperDebug.testSelectors()
   window.autoSupperDebug.getAllLevels()
   ```

## Star Difficulty Detection (Updated Method)

### OLD Method ❌ (Unreliable)
Previously, the extension tried to detect stars from:
- Unicode star symbols in title: `[★⭐✦✧]`
- Text patterns like "5 stars" in title

**Problem**: Most Reddit posts don't include stars in the title text.

### NEW Method ✅ (Accurate)

Star difficulty is now extracted from Devvit preview **images** rendered in nested shadow DOMs:

#### DOM Navigation Path (6 Levels Deep!)
```
post
  → shreddit-devvit-ui-loader
    → loader.shadowRoot
      → devvit-surface
        → surface.shadowRoot
          → devvit-blocks-renderer
            → renderer.shadowRoot
              → img[src*="ap8a5ghsvyre1.png"] ← COUNT THESE
```

#### Implementation
```typescript
const devvitLoader = post.querySelector('shreddit-devvit-ui-loader');
if (devvitLoader?.shadowRoot) {
  const surface = devvitLoader.shadowRoot.querySelector('devvit-surface');
  if (surface?.shadowRoot) {
    const renderer = surface.shadowRoot.querySelector('devvit-blocks-renderer');
    if (renderer?.shadowRoot) {
      const filledStars = renderer.shadowRoot.querySelectorAll('img[src*="ap8a5ghsvyre1.png"]');
      const starDifficulty = filledStars.length; // 1-5
    }
  }
}
```

#### Star Image URLs
- **Filled stars** (count these): `https://i.redd.it/ap8a5ghsvyre1.png`
- **Empty stars** (ignore): `https://i.redd.it/v9yitshsvyre1.png`

Example: A 3-star mission shows 3 filled + 2 empty star images = difficulty 3

#### Timing Challenge
Devvit previews take 10-15+ seconds to fully load star images:

1. Preview element appears immediately: `<shreddit-devvit-ui-loader>`
2. Initial content shows "Loading ..."
3. After 10-15 seconds, star images render

**Solution**: Extension scans on scroll (2-second debounce), catching stars as they become available. Missions are saved immediately even without star data (difficulty: 0), and updated on subsequent scans.

## Related Files Changed

- `src/content/reddit/reddit.tsx` - Scroll-based scanning
- `src/content/reddit/utils/reddit.ts` - Updated `parseLevelFromPost()` with shadow DOM navigation
- `src/utils/storage.ts` - Mission storage and filtering
- `docs/SELECTOR_FIXES.md` - This document
- `docs/REDDIT_DATA_STRUCTURE.md` - Complete shadow DOM documentation
- `docs/DEBUGGING.md` - Updated troubleshooting guide

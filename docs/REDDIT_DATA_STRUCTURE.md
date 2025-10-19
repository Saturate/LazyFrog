# Reddit Data Structure for Sword & Supper Automation

## Overview
This document outlines all data available from the Sword & Supper subreddit (https://www.reddit.com/r/SwordAndSupperGame/) that can be captured by the browser extension for game automation.

## Currently Captured Data (from content/index.tsx)

### Level Data Structure
Your extension already extracts the following data from each Reddit post:

```typescript
interface Level {
  // Basic post information
  title: string;                    // Post title (e.g., "Level 5: The Dark Cave")
  href: string | null;              // Full URL to the post

  // Level identification
  levelNumber: number | null;       // Extracted from title (e.g., 5 from "Level 5:")
  levelRange: string | null;        // From flair (e.g., "Level 1-5")
  levelRangeMin: number | null;     // Parsed minimum level from range
  levelRangeMax: number | null;     // Parsed maximum level from range

  // Difficulty & Progress
  stars: number;                    // Difficulty rating (1-5 stars)
  isCompleted: boolean;             // Whether level is marked as completed

  // DOM reference
  element: Element;                 // Reference to the post DOM element
}
```

### Data Extraction Methods

#### 1. **Post Elements**
- **Selector**: `[data-testid="post-container"]`
- **Contains**: All post information including title, flair, links

#### 2. **Title Parsing**
- **Selector**: `h3` within post
- **Patterns**:
  - `/(?:level|mission)\s*(\d+)/i` - Extracts level numbers
  - `/(\d+)\s*stars?/i` - Extracts star rating from text

#### 3. **Link Extraction**
- **Selector**: `a[data-click-id="body"]`
- **Attribute**: `href` - Provides relative link to post
- **Conversion**: Prepends `https://www.reddit.com` to make full URL

#### 4. **Flair Data**
- **Selector**: `[data-test-id="post-flair"]`
- **Pattern**: `/Level\s+(\d+)-(\d+)/i` - Extracts level range

#### 5. **Star Rating Detection**
- **Unicode Stars**: `[★⭐✦✧]` - Counts star symbols in post
- **Text Pattern**: `/(\d+)\s*stars?/i` - Finds "X stars" in text
- **Final Value**: `Math.max(unicode count, text number)` - Takes higher value

#### 6. **Completion Status**
- **Text Keywords**:
  - "completed" (case-insensitive)
  - "solved" (in title, case-insensitive)
- **Unicode Markers**: `✓`, `✔`, `[done]`

---

## Additional Data Available from Scrolling

### What Happens When Scrolling

When you scroll the subreddit page, Reddit's infinite scroll loads more posts dynamically. Here's what you can capture:

### 1. **Dynamic Post Loading**
```typescript
// Posts are progressively loaded as you scroll
// Monitor with MutationObserver
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node instanceof Element &&
          node.matches('[data-testid="post-container"]')) {
        // New post loaded!
        const level = parseLevelFromPost(node);
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### 2. **Post Metadata** (Additional fields available)
Each post container has more attributes you can extract:

```typescript
interface ExtendedLevel extends Level {
  // Author information
  author: string;                   // Username of poster
  authorFlair: string | null;       // Author's flair text

  // Engagement metrics
  score: number;                    // Upvotes/downvotes (may be fuzzy)
  commentCount: number;             // Number of comments

  // Timing
  timestamp: string;                // ISO timestamp of post
  relativeTime: string;             // "2 hours ago", etc.

  // Post type
  hasImage: boolean;                // Whether post contains image
  hasVideo: boolean;                // Whether post contains video
  hasLink: boolean;                 // Whether post is a link

  // Additional context
  isPinned: boolean;                // Moderator pinned post
  isLocked: boolean;                // Comments locked
  awards: Array<{                   // Reddit awards
    type: string;
    count: number;
  }>;
}
```

### 3. **Selectors for Extended Data**

```typescript
// Author
const author = post.querySelector('[slot="author"]')?.textContent?.trim() ||
               post.querySelector('a[href*="/user/"]')?.textContent?.trim();

// Score
const scoreElement = post.querySelector('[slot="score"]');
const score = parseInt(scoreElement?.textContent?.replace(/[^0-9]/g, '') || '0');

// Comment count
const commentsElement = post.querySelector('[slot="comments"]');
const commentCount = parseInt(commentsElement?.textContent?.match(/\d+/)?.[0] || '0');

// Timestamp
const timeElement = post.querySelector('time');
const timestamp = timeElement?.getAttribute('datetime');
const relativeTime = timeElement?.textContent?.trim();

// Author flair
const authorFlairElement = post.querySelector('[slot="author-flair"]');
const authorFlair = authorFlairElement?.textContent?.trim();

// Pin/Lock status
const isPinned = post.querySelector('[data-pin-id]') !== null;
const isLocked = post.textContent?.includes('🔒') ||
                 post.querySelector('[aria-label*="locked"]') !== null;
```

### 4. **Game Loader Data** (Already explored in your code)

Your `exploreGameLoader()` function investigates:

```typescript
// Shadow DOM inspection
const loader = document.querySelector('shreddit-devvit-ui-loader');
const shadowRoot = loader?.shadowRoot;

// Iframe detection
const iframes = shadowRoot?.querySelectorAll('iframe');
// Game loads in iframe with src like: https://*.devvit.net/*

// Attributes
const attributes = {
  bundleid: loader?.getAttribute('bundleid'),
  src: loader?.getAttribute('src'),
  // ... other attributes
};
```

---

## Data You CAN'T Get from Scrolling

### Limitations:

1. **Game Internal State**: Cannot access game state from the subreddit page
   - Game runs in cross-origin iframe (`*.devvit.net`)
   - Need to navigate INTO the game (handled by `game/index.tsx`)

2. **User Progress**: Reddit doesn't store your personal game progress
   - Need to track completion locally or via game API

3. **Real-time Updates**: Posts are static snapshots
   - Need to refresh/scroll to see new posts

---

## Recommended Enhancements

### 1. **Infinite Scroll Handler**
Add to your `content/index.tsx`:

```typescript
function setupInfiniteScrollMonitor(): void {
  let isLoadingMore = false;

  const observer = new MutationObserver(() => {
    if (!isLoadingMore && isRunning) {
      isLoadingMore = true;
      setTimeout(() => {
        processLevels(); // Re-process with new posts
        isLoadingMore = false;
      }, 1000);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
```

### 2. **Auto-Scroll Function**
```typescript
async function scrollToLoadAll(maxScrolls: number = 10): Promise<void> {
  for (let i = 0; i < maxScrolls; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for load

    // Check if we've reached the bottom
    const currentHeight = document.body.scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (currentHeight === document.body.scrollHeight) {
      console.log('Reached bottom of page');
      break;
    }
  }
}
```

### 3. **Enhanced Data Collection**
```typescript
function parseLevelFromPostEnhanced(post: Element): ExtendedLevel | null {
  const basicLevel = parseLevelFromPost(post); // Your existing function
  if (!basicLevel) return null;

  return {
    ...basicLevel,
    author: post.querySelector('a[href*="/user/"]')?.textContent?.trim() || 'unknown',
    score: parseInt(post.querySelector('[slot="score"]')?.textContent?.replace(/[^0-9]/g, '') || '0'),
    commentCount: parseInt(post.querySelector('[slot="comments"]')?.textContent?.match(/\d+/)?.[0] || '0'),
    timestamp: post.querySelector('time')?.getAttribute('datetime') || null,
    relativeTime: post.querySelector('time')?.textContent?.trim() || null,
  };
}
```

---

## Summary

### ✅ What You're Already Capturing:
- Level numbers and ranges
- Star difficulty ratings
- Completion status
- Post titles and links
- Flair data

### 🎯 What You Can Add from Scrolling:
- Author information
- Engagement metrics (score, comments)
- Timestamps
- More posts via infinite scroll
- Post metadata (pinned, locked, etc.)

### ❌ What Requires Game Access:
- Actual game state
- Game controls/buttons
- User progress within game
- Game-specific data

Your extension is well-architected with separate scripts for:
1. **Content script** (`content/index.tsx`) - Handles Reddit page
2. **Game script** (`game/index.tsx`) - Handles game iframe
3. **Background script** (`background/index.ts`) - Coordinates between them

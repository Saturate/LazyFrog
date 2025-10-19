# Reddit API Usage Guide

## Overview

Your extension now supports fetching Reddit posts via the **Reddit JSON API** instead of relying on DOM scraping and infinite scroll. This provides:

✅ **Faster** - Direct API calls instead of waiting for page loads
✅ **More reliable** - Structured JSON data instead of fragile DOM selectors
✅ **No scrolling needed** - Fetch all posts directly via pagination
✅ **Better data** - Access to metadata not visible in the DOM

## How to Use the Reddit API Module

### Basic Usage

```typescript
import { fetchPosts, getLevelPosts } from '../api/reddit';

// Fetch latest 100 posts
const posts = await fetchPosts({ sort: 'new', limit: 100 });

// Fetch only level posts
const levelPosts = await getLevelPosts({ sort: 'new', limit: 100 });

// Process level posts
levelPosts.forEach(post => {
  console.log(`Level: ${post.title}`);
  console.log(`Flair: ${post.link_flair_text}`);
  console.log(`URL: https://www.reddit.com${post.permalink}`);
});
```

### API Functions

#### `fetchPosts(options?)`
Fetch posts from the subreddit with optional sorting and pagination.

```typescript
const posts = await fetchPosts({
  sort: 'new',      // 'hot' | 'new' | 'top' | 'rising' | 'controversial'
  limit: 100,       // Max 100 per request
  after: 't3_xyz',  // Pagination token (for next page)
  t: 'week'         // Time filter for 'top' sort
});
```

#### `fetchAllPosts(options?, maxPosts?)`
Automatically paginate and fetch multiple pages of posts.

```typescript
// Fetch up to 500 posts
const allPosts = await fetchAllPosts({ sort: 'new' }, 500);
```

#### `searchPosts(query, options?)`
Search for specific posts in the subreddit.

```typescript
const results = await searchPosts('Level 1', {
  sort: 'new',
  limit: 50
});
```

#### `getPost(postId)`
Fetch a specific post by ID.

```typescript
const post = await getPost('abc123');
```

#### `getLevelPosts(options?)`
Convenience function that filters for level/mission posts.

```typescript
const levels = await getLevelPosts({ sort: 'new', limit: 100 });
```

## Reddit Post Data Structure

Each post returned by the API contains:

```typescript
interface RedditPost {
  // Basic info
  id: string;                       // "abc123"
  title: string;                    // "Level 5: The Dark Cave"
  permalink: string;                // "/r/SwordAndSupperGame/comments/abc123/..."
  url: string;                      // Full URL

  // Author
  author: string;                   // "username"
  author_flair_text: string | null; // Author flair

  // Engagement
  score: number;                    // Upvotes - downvotes
  num_comments: number;             // Comment count
  upvote_ratio: number;             // 0.0 - 1.0

  // Post metadata
  created_utc: number;              // Unix timestamp
  link_flair_text: string | null;   // "Level 1-5", etc.
  link_flair_css_class: string | null;

  // Content
  selftext: string;                 // Post body text
  thumbnail: string;                // Thumbnail URL

  // Status
  is_self: boolean;                 // Text post vs link
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  stickied: boolean;

  // Reddit API specific
  name: string;                     // Full ID "t3_abc123"
  subreddit: string;                // "SwordAndSupperGame"
}
```

## Converting API Posts to Levels

Use the level parser to convert Reddit posts to Level objects:

```typescript
import { fetchPosts } from '../api/reddit';
import { parseLevelFromAPI } from '../api/levelParser';

// Fetch posts
const posts = await fetchPosts({ sort: 'new', limit: 100 });

// Parse into Level objects
const levels = posts
  .map(post => parseLevelFromAPI(post))
  .filter(level => level !== null); // Remove invalid posts

// Now you have Level[] array to use with your existing filters
```

## Integration with Existing Code

### Option 1: Replace DOM Scanning Entirely

Replace the `getAllLevels()` function in `src/content/index.tsx`:

```typescript
import { fetchPosts } from '../api/reddit';
import { parseLevelFromAPI } from '../api/levelParser';

async function getAllLevels(): Promise<Level[]> {
  try {
    // Fetch from API instead of DOM
    const posts = await fetchPosts({ sort: 'new', limit: 100 });

    // Parse into levels
    const levels = posts
      .map(post => parseLevelFromAPI(post))
      .filter((level): level is Level => level !== null);

    console.log(`Found ${levels.length} levels from API`);
    return levels;
  } catch (error) {
    console.error('Error fetching from API:', error);
    // Fallback to DOM scraping
    return getAllLevelsFromDOM();
  }
}

// Keep the old function as fallback
function getAllLevelsFromDOM(): Level[] {
  const posts = document.querySelectorAll('[data-testid="post-container"]');
  // ... existing DOM scraping code
}
```

### Option 2: Hybrid Approach

Use API for initial load, DOM for updates:

```typescript
let cachedLevels: Level[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getAllLevels(): Promise<Level[]> {
  const now = Date.now();

  // Use cached data if recent
  if (cachedLevels.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    console.log('Using cached levels');
    return cachedLevels;
  }

  try {
    // Fetch from API
    const posts = await fetchPosts({ sort: 'new', limit: 100 });
    cachedLevels = posts
      .map(post => parseLevelFromAPI(post))
      .filter((level): level is Level => level !== null);

    lastFetchTime = now;
    return cachedLevels;
  } catch (error) {
    console.error('API fetch failed, using DOM:', error);
    return getAllLevelsFromDOM();
  }
}
```

## Rate Limiting

Reddit's API has rate limits:
- **Unauthenticated**: ~60 requests per minute
- **Browser context**: Usually no issues since you're not making many requests

Best practices:
1. Cache results for a few minutes
2. Don't fetch on every page interaction
3. Use `fetchAllPosts()` with reasonable `maxPosts` limit (100-500)

## Advantages Over DOM Scraping

| Feature | DOM Scraping | Reddit API |
|---------|-------------|------------|
| Speed | Slow (wait for render) | Fast (direct request) |
| Reliability | Breaks when Reddit updates UI | Stable JSON structure |
| Data completeness | Limited to visible info | Full post metadata |
| Pagination | Requires scrolling | Built-in with `after` token |
| Offline caching | Difficult | Easy (store JSON) |
| Code complexity | High (many selectors) | Low (simple parsing) |

## Example: Fetch and Filter Levels

Complete example showing how to fetch and filter levels:

```typescript
import { fetchPosts } from '../api/reddit';
import { parseLevelFromAPI } from '../api/levelParser';
import { filterLevels } from '../content/index'; // Your existing filter function

async function getFilteredLevels(filters: LevelFilters): Promise<Level[]> {
  // 1. Fetch from Reddit API
  console.log('Fetching posts from Reddit API...');
  const posts = await fetchPosts({
    sort: 'new',
    limit: 100
  });

  // 2. Parse into Level objects
  console.log(`Parsing ${posts.length} posts...`);
  const levels = posts
    .map(post => parseLevelFromAPI(post))
    .filter((level): level is Level => level !== null);

  console.log(`Found ${levels.length} valid levels`);

  // 3. Apply filters (your existing function)
  const filtered = filterLevels(levels, filters);

  console.log(`Filtered to ${filtered.length} levels`);

  return filtered;
}

// Usage
const levels = await getFilteredLevels({
  stars: [1, 2],
  minLevel: 1,
  maxLevel: 100,
  onlyIncomplete: true
});
```

## Debugging Reddit API Calls

### In Browser Console

```javascript
// Test fetching posts
fetch('https://www.reddit.com/r/SwordAndSupperGame/new.json?limit=5')
  .then(r => r.json())
  .then(data => console.log(data));

// Check rate limit headers
fetch('https://www.reddit.com/r/SwordAndSupperGame/new.json?limit=1')
  .then(r => {
    console.log('Rate limit remaining:', r.headers.get('x-ratelimit-remaining'));
    console.log('Rate limit reset:', r.headers.get('x-ratelimit-reset'));
    return r.json();
  })
  .then(data => console.log(data));
```

### In Extension Console

```typescript
// In your content script
import { fetchPosts } from '../api/reddit';

// Expose for debugging
(window as any).redditAPI = {
  fetchPosts,
  testFetch: async () => {
    const posts = await fetchPosts({ sort: 'new', limit: 5 });
    console.log('Fetched posts:', posts);
    return posts;
  }
};

// In browser console:
// await window.redditAPI.testFetch()
```

## Migration Checklist

- [x] Create `src/api/reddit.ts` - Reddit API module
- [x] Create `src/api/levelParser.ts` - Parse API data to Levels
- [ ] Update `src/content/index.tsx` to use API
- [ ] Add error handling and fallback to DOM
- [ ] Test in browser with console logging
- [ ] Add caching to avoid excessive API calls
- [ ] Update documentation

## Next Steps

1. **Test the API module** in your extension
2. **Update content script** to use `fetchPosts()` instead of DOM
3. **Add caching** to reduce API calls
4. **Keep DOM fallback** in case API fails
5. **Monitor performance** - API should be faster than scrolling

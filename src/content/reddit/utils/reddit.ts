/**
 * Reddit-specific utility functions
 * Functions for finding elements, parsing posts, and interacting with Reddit's DOM
 */

import { Level, LevelFilters } from '../../../types';

/**
 * Find game iframe in nested shadow DOMs
 */
export const findGameIframe = (): HTMLIFrameElement | null => {
  // Try direct search first
  let gameIframe = document.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
  if (gameIframe) return gameIframe;

  // Search in loader's shadow root
  const loader = document.querySelector('shreddit-devvit-ui-loader');
  if (loader?.shadowRoot) {
    gameIframe = loader.shadowRoot.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
    if (gameIframe) return gameIframe;

    // Search in nested shadow DOMs (devvit-blocks-web-view)
    const webView = loader.shadowRoot.querySelector('devvit-blocks-web-view');
    if (webView?.shadowRoot) {
      gameIframe = webView.shadowRoot.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
      if (gameIframe) return gameIframe;
    }
  }

  return null;
};

/**
 * Parse level information from a Reddit post
 * Reddit uses <shreddit-post> custom elements with attributes
 */
export function parseLevelFromPost(post: Element): Level | null {
  try {
    // Reddit's new UI uses shreddit-post elements with attributes
    const title = post.getAttribute('post-title') || '';
    const permalink = post.getAttribute('permalink') || '';

    if (!title) {
      console.warn('[REDDIT] Post has no title:', post);
      return null;
    }

    // Skip meta levels that aren't playable missions
    // "The Inn" is a utility level for when you have no lives left
    const metaLevels = ['The Inn'];
    if (metaLevels.some(meta => title === meta)) {
      console.log(`[REDDIT] ⏭️  Skipping meta level: "${title}"`);
      return null;
    }

    // Get flair link within the post
    const flairLink = post.querySelector('a[href*="flair_name"]');
    const levelRange = flairLink ? flairLink.textContent?.trim() || null : null;

    // Extract level number from title (e.g., "Level 5:", "Mission 42")
    const levelMatch = title.match(/(?:level|mission)\s*(\d+)/i);
    const levelNumber = levelMatch ? parseInt(levelMatch[1]) : null;

    // Parse level range from flair (e.g., "Level 1-5" -> min: 1, max: 5)
    let levelRangeMin: number | null = null;
    let levelRangeMax: number | null = null;
    if (levelRange) {
      const rangeMatch = levelRange.match(/Level\s+(\d+)-(\d+)/i);
      if (rangeMatch) {
        levelRangeMin = parseInt(rangeMatch[1]);
        levelRangeMax = parseInt(rangeMatch[2]);
      }
    }

    // Count stars (★ characters) in the title for difficulty
    const starMatch = title.match(/[★⭐✦✧]/g);
    const stars = starMatch ? Math.min(starMatch.length, 5) : 0;

    // Alternative: Look for "X stars" or "X star" text
    const starsTextMatch = title.match(/(\d+)\s*stars?/i);
    const starsFromText = starsTextMatch ? parseInt(starsTextMatch[1]) : 0;

    const finalStars = Math.max(stars, starsFromText);

    // Check for completion indicators in title
    const isCompleted =
      title.toLowerCase().includes('completed') ||
      title.includes('✓') ||
      title.includes('✔') ||
      title.includes('[done]') ||
      title.toLowerCase().includes('solved');

    const href = permalink ? `https://www.reddit.com${permalink}` : null;

    return {
      title,
      href,
      levelNumber,
      levelRange,
      levelRangeMin,
      levelRangeMax,
      stars: finalStars,
      isCompleted,
      element: post,
    };
  } catch (error) {
    console.error('[REDDIT] Error parsing level:', error);
    return null;
  }
}

/**
 * Get all level posts from the current Reddit page
 */
export function getAllLevels(): Level[] {
  const posts = document.querySelectorAll('shreddit-post');
  const levels: Level[] = [];

  posts.forEach((post) => {
    const level = parseLevelFromPost(post);
    if (level) {
      levels.push(level);
    }
  });

  console.log(`[REDDIT] Found ${levels.length} levels on page`);
  return levels;
}

/**
 * Filter levels based on criteria
 */
export function filterLevels(levels: Level[], filters: LevelFilters): Level[] {
  return levels.filter((level) => {
    // Star rating filter
    if (!filters.stars.includes(level.stars)) {
      return false;
    }

    // Level range filter (if we have level number)
    if (level.levelNumber !== null) {
      if (level.levelNumber < filters.minLevel || level.levelNumber > filters.maxLevel) {
        return false;
      }
    }

    // If we don't have specific level number but have range, use range max as proxy
    if (level.levelNumber === null && level.levelRangeMax !== null) {
      if (level.levelRangeMax < filters.minLevel || level.levelRangeMax > filters.maxLevel) {
        return false;
      }
    }

    // Completion filter
    if (filters.onlyIncomplete && level.isCompleted) {
      return false;
    }

    return true;
  });
}

/**
 * Click a level post to open it
 */
export function clickLevel(level: Level): void {
  if (level.href) {
    console.log('[REDDIT] Navigating to:', level.href);
    window.location.href = level.href;
  } else if (level.element) {
    console.log('[REDDIT] Clicking level element:', level.title);
    (level.element as HTMLElement).click();
  } else {
    console.error('[REDDIT] Cannot click level - no href or element');
  }
}

/**
 * Explore the shadow DOM of the game loader (debug function)
 */
export function exploreGameLoader(): void {
  const loader = document.querySelector('shreddit-devvit-ui-loader');

  if (!loader) {
    console.log('[REDDIT] No shreddit-devvit-ui-loader found on page');
    return;
  }

  console.log('[REDDIT] Found shreddit-devvit-ui-loader:', loader);

  // Access shadow root
  const shadowRoot = loader.shadowRoot;
  if (shadowRoot) {
    console.log('[REDDIT] Shadow DOM found!');
    console.log('[REDDIT] Shadow root innerHTML:', shadowRoot.innerHTML);

    // Look for iframes
    const iframes = shadowRoot.querySelectorAll('iframe');
    console.log('[REDDIT] Iframes in shadow DOM:', iframes.length);
    iframes.forEach((iframe, index) => {
      console.log(`[REDDIT] Iframe ${index}:`, iframe.src);

      // Try to access iframe contents
      try {
        if (iframe.contentDocument) {
          console.log(`[REDDIT] Iframe ${index} document:`, iframe.contentDocument.body.innerHTML.substring(0, 500));
        }
      } catch (e) {
        console.log(`[REDDIT] Cannot access iframe ${index} content (cross-origin)`, e);
      }
    });

    // List all elements
    const allElements = shadowRoot.querySelectorAll('*');
    console.log('[REDDIT] All elements in shadow DOM:', allElements.length);
    Array.from(allElements).slice(0, 10).forEach((el, index) => {
      if (index < 10) {
        console.log(`[REDDIT] Element ${index}:`, el.tagName, el.className, el.textContent?.substring(0, 100));
      }
    });
  } else {
    console.log('[REDDIT] No shadow root found');
  }

  console.log('[REDDIT] Loader attributes:', {
    id: loader.id,
    className: loader.className,
    tagName: loader.tagName,
  });
}

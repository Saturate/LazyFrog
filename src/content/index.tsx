/**
 * Content script for Sword & Supper Bot
 * Injects React components and handles game interaction
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import LevelControlPanel from '../components/LevelControlPanel';
import { Level, LevelFilters, ChromeMessage } from '../types';

console.log('🤖 Sword & Supper Bot content script loaded');
console.log('📍 Current URL:', window.location.href);
console.log('📅 Load time:', new Date().toISOString());

let root: Root | null = null;
let isRunning = false;
let filters: LevelFilters = {
  stars: [1, 2], // Default: 1-2 stars (easiest)
  minLevel: 1,
  maxLevel: 340,
  onlyIncomplete: true,
};

/**
 * Parse level information from a Reddit post
 * Reddit uses <shreddit-post> custom elements with attributes
 */
function parseLevelFromPost(post: Element): Level | null {
  try {
    // Reddit's new UI uses shreddit-post elements with attributes
    const title = post.getAttribute('post-title') || '';
    const permalink = post.getAttribute('permalink') || '';

    if (!title) {
      console.warn('Post has no title:', post);
      return null;
    }

    // Skip meta levels that aren't playable missions
    // "The Inn" is a utility level for when you have no lives left
    const metaLevels = ['The Inn'];
    if (metaLevels.some(meta => title === meta)) {
      console.log(`⏭️  Skipping meta level: "${title}"`);
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
    console.error('Error parsing level:', error);
    return null;
  }
}

/**
 * Explore the shadow DOM of the game loader
 */
function exploreGameLoader(): void {
  const loader = document.querySelector('shreddit-devvit-ui-loader');

  if (!loader) {
    console.log('No shreddit-devvit-ui-loader found on page');
    return;
  }

  console.log('Found shreddit-devvit-ui-loader:', loader);

  // Access shadow root
  const shadowRoot = loader.shadowRoot;

  if (shadowRoot) {
    console.log('Shadow DOM found!');
    console.log('Shadow root innerHTML:', shadowRoot.innerHTML);

    // Look for iframes
    const iframes = shadowRoot.querySelectorAll('iframe');
    console.log('Iframes in shadow DOM:', iframes.length);

    iframes.forEach((iframe, index) => {
      console.log(`Iframe ${index}:`, iframe.src);

      // Try to access iframe content
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          console.log(`Iframe ${index} document:`, iframeDoc.body.innerHTML.substring(0, 500));
        }
      } catch (e) {
        console.log(`Cannot access iframe ${index} content (cross-origin)`, e);
      }
    });

    // Log all elements in shadow DOM
    const allElements = shadowRoot.querySelectorAll('*');
    console.log('All elements in shadow DOM:', allElements.length);
    allElements.forEach((el, index) => {
      if (index < 20) { // Log first 20 elements
        console.log(`Element ${index}:`, el.tagName, el.className, el.textContent?.substring(0, 100));
      }
    });
  } else {
    console.log('No shadow root found');
  }

  // Log all attributes
  console.log('Loader attributes:', {
    class: loader.className,
    id: loader.id,
    src: loader.getAttribute('src'),
    bundleid: loader.getAttribute('bundleid'),
  });
}

/**
 * Get all level posts from the current page
 */
function getAllLevels(): Level[] {
  console.log('🔍 getAllLevels() called');

  // First, explore the game loader
  exploreGameLoader();

  // Try multiple selectors for Reddit's various layouts
  const selectors = [
    '[data-testid="post-container"]',
    'shreddit-post',
    '[data-click-id="background"]',
    'article',
    '[id^="t3_"]'
  ];

  let posts: NodeListOf<Element> | null = null;
  let usedSelector = '';

  for (const selector of selectors) {
    const found = document.querySelectorAll(selector);
    if (found.length > 0) {
      posts = found;
      usedSelector = selector;
      console.log(`✅ Found ${found.length} posts using selector: "${selector}"`);
      break;
    } else {
      console.log(`❌ No posts found with selector: "${selector}"`);
    }
  }

  if (!posts || posts.length === 0) {
    console.error('❌ No posts found with any selector!');
    console.log('📊 Page info:', {
      title: document.title,
      url: window.location.href,
      bodyLength: document.body.innerHTML.length,
      hasContent: document.body.textContent ? document.body.textContent.length > 1000 : false
    });
    return [];
  }

  const levels: Level[] = [];

  posts.forEach((post, index) => {
    const level = parseLevelFromPost(post);
    if (level) {
      levels.push(level);
      if (index < 3) {
        console.log(`📝 Level ${index + 1}:`, {
          title: level.title,
          levelNumber: level.levelNumber,
          stars: level.stars,
          href: level.href
        });
      }
    }
  });

  console.log(`✅ Found ${levels.length} levels on page (from ${posts.length} posts)`);
  return levels;
}

/**
 * Filter levels based on criteria
 */
function filterLevels(levels: Level[], filters: LevelFilters): Level[] {
  return levels.filter((level) => {
    // Filter by star rating
    if (filters.stars.length > 0 && level.stars > 0) {
      if (!filters.stars.includes(level.stars)) {
        return false;
      }
    }

    // Filter by level number or level range
    let levelInRange = true;
    if (level.levelNumber !== null) {
      // Use specific level number if available
      levelInRange = level.levelNumber >= filters.minLevel && level.levelNumber <= filters.maxLevel;
    } else if (level.levelRangeMin !== null && level.levelRangeMax !== null) {
      // Check if level range overlaps with filter range
      levelInRange =
        level.levelRangeMax >= filters.minLevel && level.levelRangeMin <= filters.maxLevel;
    }

    if (!levelInRange) {
      return false;
    }

    // Filter by completion status
    if (filters.onlyIncomplete && level.isCompleted) {
      return false;
    }

    return true;
  });
}

/**
 * Click on a level to open it
 */
function clickLevel(level: Level): void {
  if (!level.href) {
    console.error('Level has no link');
    return;
  }

  console.log(`Opening level: ${level.title}`);
  window.open(level.href, '_blank');

  // Notify background script
  chrome.runtime.sendMessage({
    type: 'LEVEL_COMPLETED',
    level: level.title,
  });
}

/**
 * Render the React control panel
 */
function renderControlPanel(levels: Level[]): void {
  // Remove existing container if any
  let container = document.getElementById('ss-bot-react-root');
  if (container) {
    container.remove();
  }

  // Create new container
  container = document.createElement('div');
  container.id = 'ss-bot-react-root';
  document.body.appendChild(container);

  // Create root and render
  root = createRoot(container);
  root.render(
    <LevelControlPanel
      levels={levels}
      filters={filters}
      isRunning={isRunning}
      onFilterChange={(newFilters) => {
        filters = newFilters;
        chrome.storage.local.set({ filters });
        processLevels();
      }}
      onStart={() => {
        isRunning = true;
        processLevels();
      }}
      onStop={() => {
        isRunning = false;
        unmountControlPanel();
      }}
      onLevelClick={clickLevel}
    />
  );
}

/**
 * Unmount the React control panel
 */
function unmountControlPanel(): void {
  const container = document.getElementById('ss-bot-react-root');
  if (container && root) {
    root.unmount();
    container.remove();
    root = null;
  }
}

/**
 * Main processing function
 */
function processLevels(): void {
  if (!isRunning) return;

  console.log('Processing levels with filters:', filters);

  // Get all levels
  const allLevels = getAllLevels();

  // Filter levels
  const filteredLevels = filterLevels(allLevels, filters);

  console.log(`Filtered to ${filteredLevels.length} levels`);

  // Render React component
  renderControlPanel(filteredLevels);

  // Send results to popup
  chrome.runtime.sendMessage({
    type: 'LEVELS_FOUND',
    levels: filteredLevels.map((l) => ({
      title: l.title,
      stars: l.stars,
      levelNumber: l.levelNumber,
      levelRange: l.levelRange,
      levelRangeMin: l.levelRangeMin,
      levelRangeMax: l.levelRangeMax,
      isCompleted: l.isCompleted,
      href: l.href,
    })),
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  console.log('Content script received message:', message);

  switch (message.type) {
    case 'START_PROCESSING':
      isRunning = true;
      filters = { ...filters, ...message.filters };
      processLevels();
      sendResponse({ success: true });
      break;

    case 'STOP_PROCESSING':
      isRunning = false;
      unmountControlPanel();
      sendResponse({ success: true });
      break;

    case 'GET_LEVELS':
      const levels = getAllLevels();
      const filtered = filterLevels(levels, message.filters || filters);
      sendResponse({ levels: filtered });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true;
});

// Load saved filters
chrome.storage.local.get(['filters'], (result) => {
  if (result.filters) {
    filters = result.filters;
  }
});

// Expose debug functions to window for console testing
(window as any).autoSupperDebug = {
  getAllLevels,
  parseLevelFromPost,
  processLevels,
  filterLevels,
  filters,
  isRunning,
  testSelectors: () => {
    console.log('🧪 Testing selectors...');
    const selectors = [
      '[data-testid="post-container"]',
      'shreddit-post',
      '[data-click-id="background"]',
      'article',
      '[id^="t3_"]'
    ];
    selectors.forEach(sel => {
      const found = document.querySelectorAll(sel);
      console.log(`"${sel}": ${found.length} elements`);
    });
  }
};

console.log('💡 Debug functions available: window.autoSupperDebug');

// Initial scan when page loads
setTimeout(() => {
  console.log('⏰ Initial page scan starting...');
  const levels = getAllLevels();
  console.log('📊 Scan complete. Levels found:', levels.length);
  if (levels.length > 0) {
    console.log('🎯 First 3 levels:', levels.slice(0, 3));
  }
}, 3000); // Increased to 3 seconds

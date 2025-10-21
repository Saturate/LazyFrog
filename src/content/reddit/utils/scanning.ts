/**
 * Shadow DOM-based mission scanning utilities
 * Watches for Devvit previews to load, then scans individual posts
 */

import { redditLogger } from '../../../utils/logger';
import { parseLevelFromPost } from './reddit';

// Track scanned posts to avoid duplicates
export const scannedPostIds = new Set<string>();

// Active observers per post (for cleanup)
const postObservers = new Map<string, MutationObserver>();

/**
 * Check if a post's shadow DOM is ready for scanning
 */
function isPostShadowDOMReady(post: Element): boolean {
  const devvitLoader = post.querySelector("shreddit-devvit-ui-loader");
  if (!devvitLoader) return false;

  // Check if still showing "Loading" text
  if (devvitLoader.textContent?.includes("Loading")) return false;

  // Check if shadow DOM hierarchy exists
  if (!devvitLoader.shadowRoot) return false;

  const surface = devvitLoader.shadowRoot.querySelector("devvit-surface");
  if (!surface?.shadowRoot) return false;

  const renderer = surface.shadowRoot.querySelector("devvit-blocks-renderer");
  if (!renderer?.shadowRoot) return false;

  // Check if stars are rendered
  const stars = renderer.shadowRoot.querySelectorAll('img[src*="ap8a5ghsvyre1.png"]');
  return stars.length > 0;
}

/**
 * Add visual "SCANNED" flair to a post
 */
function addScannedFlair(post: Element, stars: number): void {
  // Find or create the flair container
  let flairContainer = post.querySelector("shreddit-post-flair");

  if (!flairContainer) {
    // Create flair container if it doesn't exist
    flairContainer = document.createElement("shreddit-post-flair");

    // Try to insert after the title
    const titleSlot = post.querySelector('[slot="title"]');
    if (titleSlot) {
      titleSlot.after(flairContainer);
    } else {
      // Fallback: prepend to post
      post.prepend(flairContainer);
    }
  }

  // Check if we already added the scanned badge
  if (flairContainer.querySelector('.autosupper-scanned-badge')) {
    return;
  }

  // Create the scanned badge
  const badge = document.createElement("span");
  badge.className = "autosupper-scanned-badge";
  badge.style.cssText = `
    display: inline-block;
    padding: 2px 6px;
    margin-left: 4px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    font-size: 10px;
    font-weight: 700;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  `;
  badge.textContent = `✓ ${stars}★`;
  badge.title = "Scanned by AutoSupper";

  flairContainer.appendChild(badge);
}

/**
 * Scan a single post when its shadow DOM is ready
 */
async function scanPost(post: Element): Promise<void> {
  const postId = post.getAttribute("id");
  if (!postId) return;

  // Skip if already scanned
  if (scannedPostIds.has(postId)) return;

  // Check if shadow DOM is ready
  if (!isPostShadowDOMReady(post)) {
    redditLogger.log("Shadow DOM not ready yet", { postId });
    return;
  }

  redditLogger.log("Scanning post (shadow DOM ready)", { postId });

  // Parse the mission data
  const level = await parseLevelFromPost(post);

  if (level && level.stars > 0) {
    // Mark as scanned
    scannedPostIds.add(postId);

    // Add visual indicator
    addScannedFlair(post, level.stars);

    redditLogger.log("Post scanned successfully", {
      postId,
      title: level.title.substring(0, 50),
      stars: level.stars,
    });

    // Stop observing this post
    const observer = postObservers.get(postId);
    if (observer) {
      observer.disconnect();
      postObservers.delete(postId);
    }
  } else if (level && level.stars === 0) {
    redditLogger.warn("Post shadow DOM ready but no stars found", { postId });
  }
}

/**
 * Watch a post for shadow DOM changes and scan when ready
 */
function observePost(post: Element): void {
  const postId = post.getAttribute("id");
  if (!postId) return;

  // Skip if already scanning/scanned
  if (scannedPostIds.has(postId) || postObservers.has(postId)) {
    return;
  }

  // Try immediate scan first
  scanPost(post);

  // Set up mutation observer to watch for shadow DOM changes
  const observer = new MutationObserver((mutations) => {
    // Check if shadow DOM is now ready
    scanPost(post);
  });

  // Observe the post and its devvit loader
  observer.observe(post, {
    childList: true,
    subtree: true,
  });

  postObservers.set(postId, observer);

  redditLogger.log("Started observing post", { postId });
}

/**
 * Scan all visible posts on the page
 */
function scanVisiblePosts(): void {
  const posts = document.querySelectorAll("shreddit-post");
  redditLogger.log("Scanning visible posts", { count: posts.length });

  posts.forEach((post) => {
    observePost(post);
  });
}

/**
 * Initialize mutation-based scanning
 * Watches for new posts to appear and scans them when shadow DOM is ready
 */
export function initializeScrollScanning(): void {
  // Scan initial posts
  scanVisiblePosts();

  // Watch for new posts being added to the page
  const pageObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          // Check if the added node is a post
          if (node.tagName === "SHREDDIT-POST") {
            observePost(node);
          }

          // Check if the added node contains posts
          const posts = node.querySelectorAll?.("shreddit-post");
          posts?.forEach((post) => observePost(post));
        }
      }
    }
  });

  // Observe the entire document for new posts
  pageObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also re-scan on scroll (to catch posts that were off-screen)
  let scrollTimeout: number | null = null;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimeout !== null) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = window.setTimeout(() => {
        scanVisiblePosts();
        scrollTimeout = null;
      }, 1000);
    },
    { passive: true }
  );

  redditLogger.log("Shadow DOM-based scanning initialized");
}

/**
 * Manual scan trigger (for debug/force rescan)
 */
export function scanForNewMissions(reason: string = "manual"): void {
  redditLogger.log(`Manual scan triggered: ${reason}`);
  scanVisiblePosts();
}

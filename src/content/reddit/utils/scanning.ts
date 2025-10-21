/**
 * Scroll-based mission scanning utilities
 */

import { redditLogger } from '../../../utils/logger';
import { getAllLevels } from './reddit';

// Track scanned posts to avoid duplicates
export const scannedPostIds = new Set<string>();

// Debounced scroll handler configuration
let scrollTimeout: number | null = null;
let lastScrollScan = 0;
const SCROLL_SCAN_DELAY = 2000; // Wait 2 seconds after scrolling stops
const SCROLL_SCAN_COOLDOWN = 5000; // Don't scan more than once every 5 seconds

/**
 * Scan for new missions (triggered by scroll or other events)
 */
export function scanForNewMissions(reason: string = "scroll"): void {
  const now = Date.now();

  // Cooldown check - don't scan too frequently
  if (now - lastScrollScan < SCROLL_SCAN_COOLDOWN) {
    redditLogger.log("Skipping scan - too soon since last scan", { reason });
    return;
  }

  lastScrollScan = now;
  redditLogger.log(`Scan triggered: ${reason}`);

  const levels = getAllLevels();
  redditLogger.log("Scan complete", { levelsFound: levels.length, reason });
}

/**
 * Initialize scroll-based scanning
 */
export function initializeScrollScanning(): void {
  window.addEventListener(
    "scroll",
    () => {
      // Clear existing timeout
      if (scrollTimeout !== null) {
        clearTimeout(scrollTimeout);
      }

      // Set new timeout - scan when user stops scrolling
      scrollTimeout = window.setTimeout(() => {
        scanForNewMissions("scroll");
        scrollTimeout = null;
      }, SCROLL_SCAN_DELAY);
    },
    { passive: true }
  );

  redditLogger.log("Scroll-based scanning enabled");
}

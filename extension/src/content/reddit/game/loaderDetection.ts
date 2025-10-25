/**
 * Game loader detection using MutationObserver
 * Acts as sensor for state machine
 */

import { redditLogger } from '../../../utils/logger';
import { safeSendMessage } from '../utils/messaging';

// MutationObserver for detecting game loader appearance
const observer = new MutationObserver((mutations) => {
  // Check if game loader has appeared
  const loader = document.querySelector("shreddit-devvit-ui-loader");

  if (loader) {
    // Always report to background, let background decide if it should act
    redditLogger.log(
      "[MutationObserver] Game loader detected, reporting to background"
    );
    safeSendMessage({ type: "GAME_LOADER_DETECTED" });

    // Disconnect observer after sending event to avoid spam
    observer.disconnect();
  }
});

/**
 * Check for existing game loader and report to background
 */
export function checkForExistingLoader(currentBotState: string): boolean {
  const existingLoader = document.querySelector("shreddit-devvit-ui-loader");
  if (existingLoader) {
    redditLogger.log("[checkForExistingLoader] Game loader found in DOM", {
      state: currentBotState,
    });
    safeSendMessage({ type: "GAME_LOADER_DETECTED" });
    return true;
  }

  // Loader not found yet, make sure observer is active
  redditLogger.log(
    "[checkForExistingLoader] Loader not found, ensuring observer is active"
  );
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
  return false;
}

/**
 * Start observing for game loader when body is available
 */
export function startObserving(currentBotState: string): void {
  if (document.body) {
    redditLogger.log(
      "[MutationObserver] Starting to observe DOM for game loader"
    );
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Check immediately in case the loader is already there
    checkForExistingLoader(currentBotState);
  } else {
    // Body not ready yet, wait for DOMContentLoaded
    document.addEventListener("DOMContentLoaded", () => {
      redditLogger.log("[MutationObserver] DOM ready, starting to observe");
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      checkForExistingLoader(currentBotState);
    });
  }
}

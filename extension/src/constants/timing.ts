/**
 * Timing constants used throughout the application
 * Centralized to improve maintainability and clarity
 */

// DOM update delays
export const DOM_UPDATE_DELAY = 500; // Wait for DOM to update after navigation/changes

// Storage propagation delays
export const STORAGE_PROPAGATION_DELAY = 500; // Wait for chrome.storage.local writes to propagate

// Retry and backoff
export const INITIAL_RETRY_DELAY = 2000; // Base delay for first retry attempt
export const RETRY_BACKOFF_BASE = 2; // Exponential backoff multiplier

// Timeouts
export const GAME_LOADER_CHECK_INTERVAL = 500; // How often to check if game loader appeared
export const GAME_LOADER_MAX_WAIT = 10000; // Max time to wait for game loader to appear
export const STATE_TIMEOUT = 10000; // Timeout for state machine states (e.g., starting state)

// UI interaction delays
export const CLICK_DELAY_AFTER_OPEN = 1000; // Wait after opening game before clicking fullscreen
export const NOTIFICATION_DURATION = 300; // How long to show notifications before removing

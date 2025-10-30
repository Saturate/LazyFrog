/**
 * Game loader detection using MutationObserver
 * Acts as sensor for state machine
 */

import { redditLogger } from '../../../utils/logger';
import { safeSendMessage } from '../utils/messaging';
import { extractPostIdFromUrl } from '../../devvit/utils/extractPostIdFromUrl';

/**
 * Check if the current post is deleted
 */
function isPostDeleted(): boolean {
	const deletedBanner = document.querySelector('[slot="post-removed-banner"]');
	return !!deletedBanner;
}

/**
 * Handle deleted post detection
 */
function handleDeletedPost(): void {
	const postId = extractPostIdFromUrl(window.location.href);
	if (!postId) {
		redditLogger.warn('[loaderDetection] Cannot extract postId from deleted post');
		return;
	}

	redditLogger.warn('[loaderDetection] Deleted post detected, sending to background', {
		postId,
		url: window.location.href,
	});

	// Send MISSION_DELETED event
	// Background script will handle disabling the mission
	safeSendMessage({
		type: 'MISSION_DELETED',
		missionId: postId,
	});
}

// MutationObserver for detecting game loader appearance
const observer = new MutationObserver((mutations) => {
	// Check if post is deleted first
	if (isPostDeleted()) {
		redditLogger.warn('[MutationObserver] Deleted post detected, handling...');
		handleDeletedPost();
		observer.disconnect();
		return;
	}

	// Check if game loader has appeared
	const loader = document.querySelector('shreddit-devvit-ui-loader');

	if (loader) {
		// Always report to background, let background decide if it should act
		redditLogger.log('[MutationObserver] Game loader detected, reporting to background');
		safeSendMessage({ type: 'GAME_LOADER_DETECTED' });

		// Disconnect observer after sending event to avoid spam
		observer.disconnect();
	}
});

/**
 * Check for existing game loader and report to background
 */
export function checkForExistingLoader(currentBotState: string): boolean {
	// Check if post is deleted first
	if (isPostDeleted()) {
		redditLogger.warn('[checkForExistingLoader] Deleted post detected, handling...');
		handleDeletedPost();
		return false;
	}

	// Check for inn detection (mission already completed) before looking for loader
	const { shouldSkipGameDueToInn } = require('../utils/innDetection');
	if (shouldSkipGameDueToInn()) {
		redditLogger.log(
			'[checkForExistingLoader] Mission already completed detected, skipping loader check',
		);
		return false;
	}

	const existingLoader = document.querySelector('shreddit-devvit-ui-loader');
	if (existingLoader) {
		redditLogger.log('[checkForExistingLoader] Game loader found in DOM', {
			state: currentBotState,
		});
		safeSendMessage({ type: 'GAME_LOADER_DETECTED' });
		return true;
	}

	// Loader not found yet, make sure observer is active
	redditLogger.log('[checkForExistingLoader] Loader not found, ensuring observer is active');
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
		redditLogger.log('[MutationObserver] Starting to observe DOM for game loader');
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		// Check immediately in case the loader is already there
		checkForExistingLoader(currentBotState);
	} else {
		// Body not ready yet, wait for DOMContentLoaded
		document.addEventListener('DOMContentLoaded', () => {
			redditLogger.log('[MutationObserver] DOM ready, starting to observe');
			observer.observe(document.body, {
				childList: true,
				subtree: true,
			});
			checkForExistingLoader(currentBotState);
		});
	}
}

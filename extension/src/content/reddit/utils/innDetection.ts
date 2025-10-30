/**
 * Fallback mission completion detection via Devvit preview
 * Primary detection is handled in missionDataHandler.ts
 */

import { redditLogger } from '../../../utils/logger';
import { safeSendMessage } from './messaging';
import { extractPostIdFromUrl } from '../../devvit/utils/extractPostIdFromUrl';

/**
 * Check for cleared banner in Devvit preview
 */
export function isMissionCompletedInReddit(): boolean {
	try {
		// Check for cleared banner in Devvit preview
		const devvitLoader = document.querySelector('shreddit-devvit-ui-loader');
		if (devvitLoader) {
			// Navigate through shadow DOM to find cleared indicators
			const renderer = devvitLoader.shadowRoot
				?.querySelector('shreddit-devvit-ui-surface')
				?.shadowRoot?.querySelector('shreddit-devvit-ui-renderer');
			if (renderer?.shadowRoot) {
				// Check for cleared banner (cleared/done image)
				const clearedImages = renderer.shadowRoot.querySelectorAll('img[src*="fxlui9egtgbf1.png"]');
				if (clearedImages.length > 0) {
					redditLogger.log(
						'[innDetection] Cleared banner detected in Devvit preview (fallback method)',
					);
					return true;
				}
			}
		}
		return false;
	} catch (error) {
		redditLogger.error('[innDetection] Error checking for completion status', {
			error: String(error),
		});
		return false;
	}
}

/**
 * Handle mission completion via fallback detection
 */
async function handleMissionCompletion(): Promise<void> {
	const postId = extractPostIdFromUrl(window.location.href);
	if (!postId) {
		redditLogger.warn('[innDetection] Cannot extract postId for completion detection');
		return;
	}

	redditLogger.log('[innDetection] Mission completion detected via fallback method', {
		postId,
		url: window.location.href,
	});

	// Notify background script - it will handle marking as cleared
	safeSendMessage({
		type: 'MISSION_COMPLETED',
		postId,
		source: 'reddit-fallback-detection',
	});
}

/**
 * Check if game should be skipped due to inn state
 */
export function shouldSkipGameDueToInn(): boolean {
	if (isMissionCompletedInReddit()) {
		handleMissionCompletion();
		return true;
	}
	return false;
}

/**
 * DEPRECATED: DOM-based star rating detection
 *
 * This file contains deprecated DOM-based detection logic for star ratings.
 * We now use better methods via PostRenderContent API (parseMissionData.ts).
 *
 * Kept for reference only - DO NOT USE in production code.
 */

import { redditLogger } from '../../../utils/logger';

/**
 * @deprecated Use PostRenderContent API detection instead (parseMissionData.ts)
 *
 * Parse star difficulty from Devvit preview by scanning shadow DOM
 * This method is fragile and depends on Reddit's shadow DOM structure
 */
export function parseStarDifficultyFromDOM_DEPRECATED(
	post: Element,
	title: string,
	postId: string,
): { starDifficulty: number; isInnPost: boolean } {
	let starDifficulty = 0;
	let isInnPost = false;

	const devvitLoader = post.querySelector('shreddit-devvit-ui-loader');
	if (devvitLoader) {
		// Check if preview is still loading
		const isLoading = devvitLoader.textContent?.includes('Loading');

		// Navigate through nested shadow DOMs to find the renderer
		if (devvitLoader.shadowRoot) {
			const surface = devvitLoader.shadowRoot.querySelector('devvit-surface');
			if (surface?.shadowRoot) {
				const renderer = surface.shadowRoot.querySelector('devvit-blocks-renderer');
				if (renderer?.shadowRoot) {
					// Count filled star images (ap8a5ghsvyre1.png)
					const filledStars = renderer.shadowRoot.querySelectorAll(
						'img[src*="ap8a5ghsvyre1.png"]',
					);
					starDifficulty = filledStars.length;

					// Check for Inn image (fxlui9egtgbf1.png) - indicates Inn post, not a playable mission
					const innImages = renderer.shadowRoot.querySelectorAll(
						'img[src*="fxlui9egtgbf1.png"]',
					);
					if (innImages.length > 0) {
						isInnPost = true;
						redditLogger.log('Inn post detected (fxlui9egtgbf1.png image found)', {
							title: title.substring(0, 50),
							postId,
						});
					}

					// DEBUG: Log successful parse
					if (starDifficulty > 0) {
						redditLogger.log('Parsed star difficulty', {
							title: title.substring(0, 50),
							postId,
							stars: starDifficulty,
						});
					}
				}
			}
		}

		// Warn if preview loaded but star detection failed (and it's not an Inn post)
		if (starDifficulty === 0 && !isLoading && !isInnPost) {
			redditLogger.warn('Preview loaded but no stars detected', {
				title: title.substring(0, 50),
				postId,
				isLoading,
			});
		}
	}

	return { starDifficulty, isInnPost };
}

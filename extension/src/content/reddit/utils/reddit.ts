/**
 * Reddit-specific utility functions
 * Functions for finding elements, parsing posts, and interacting with Reddit's DOM
 */

import { Level, LevelFilters } from '../../../types';
import { saveMission } from '../../../lib/storage/missions';
import { MissionRecord } from '@lazyfrog/types';
import { redditLogger } from '../../../utils/logger';
import { querySelectorDeep } from 'query-selector-shadow-dom';

/**
 * Find game iframe in nested shadow DOMs
 * Uses querySelectorDeep to pierce through shadow roots automatically
 */
export const findGameIframe = (): HTMLIFrameElement | null => {
	// Use querySelectorDeep to find iframe anywhere in shadow DOMs
	const gameIframe = querySelectorDeep('iframe[src*="devvit.net"]') as HTMLIFrameElement | null;
	return gameIframe;
};

/**
 * Check if game dialog/iframe is currently open and active
 * Returns true if the game modal is visible and the iframe is loaded
 */
export const isGameDialogOpen = (): boolean => {
	// Check if iframe exists and is visible
	const gameIframe = findGameIframe();
	if (!gameIframe) return false;

	// Check if iframe has loaded content (not just empty)
	const iframeLoaded = !!(gameIframe.src && gameIframe.src.includes('devvit.net'));

	redditLogger.log('Game dialog status check', {
		hasIframe: !!gameIframe,
		iframeLoaded,
		isOpen: iframeLoaded,
	});

	return iframeLoaded;
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
		const postId = post.getAttribute('id') || ''; // e.g., "t3_1obdqvw"
		const author = post.getAttribute('author') || '';

		if (!title) {
			redditLogger.warn('Post has no title', { post });
			return null;
		}

		// Skip meta levels that aren't playable missions
		const metaLevels = ['The Inn'];
		if (metaLevels.some((meta) => title === meta)) {
			redditLogger.log(`Skipping meta level: "${title}"`);
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

		// Parse star difficulty from Devvit preview (if loaded)
		// Stars are deep in nested shadow DOMs:
		// post -> loader -> loader.shadowRoot -> surface -> surface.shadowRoot -> renderer -> renderer.shadowRoot
		let starDifficulty = 0;
		let isCleared = false;

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

						// Check for cleared banner (cleared/done image)
						const clearedImages = renderer.shadowRoot.querySelectorAll(
							'img[src*="fxlui9egtgbf1.png"]',
						);
						if (clearedImages.length > 0) {
							isCleared = true;
							redditLogger.log('Mission marked as cleared (cleared banner detected)', {
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

			// Warn if preview loaded but star detection failed
			if (starDifficulty === 0 && !isLoading) {
				redditLogger.warn('Preview loaded but no stars detected', {
					title: title.substring(0, 50),
					postId,
					isLoading,
				});
			}
		}

		// Cleared check is already done above in the shadow DOM parsing (isCleared variable)
		// Also check for cleared indicators in title as fallback
		const isTitleCleared =
			title.toLowerCase().includes('cleared') ||
			title.toLowerCase().includes('completed') ||
			title.includes('✓') ||
			title.includes('✔') ||
			title.includes('[done]') ||
			title.toLowerCase().includes('solved');

		const finalCleared = isCleared || isTitleCleared;

		const href = permalink ? `https://www.reddit.com${permalink}` : null;

		return {
			title,
			href,
			postId,
			author,
			levelNumber,
			levelRange,
			levelRangeMin,
			levelRangeMax,
			stars: starDifficulty,
			cleared: finalCleared,
			element: post,
		};
	} catch (error) {
		redditLogger.error('Error parsing level', { error: String(error) });
		return null;
	}
}

/**
 * Process scanned level - check for cleared status
 * NOTE: We no longer save partial mission data from scanning.
 * Complete missions are saved via RenderPostContent API or gameplay capture.
 */
async function saveScannedMission(level: Level): Promise<void> {
	if (!level.postId || !level.href) {
		return;
	}

	// Skip missions with no difficulty rating (0 stars = preview not loaded yet)
	if (!level.stars || level.stars === 0) {
		return;
	}

	// Skip missions with missing level data
	if (!level.levelRangeMin || !level.levelRangeMax) {
		return;
	}

	// Sanity check: maxLevel should be >= minLevel
	if (level.levelRangeMax < level.levelRangeMin) {
		return;
	}

	try {
		// Check if cleared status changed
		if (level.cleared) {
			const { isMissionCleared } = await import('../../../lib/storage/userProgress');
			const isCleared = await isMissionCleared(level.postId);

			if (!isCleared) {
				redditLogger.log('Mission cleared status detected - updating user progress', {
					postId: level.postId,
					title: level.title.substring(0, 50),
				});

				// Mark as cleared in user progress
				const { markMissionCleared } = await import('../../../lib/storage/missions');
				await markMissionCleared(level.postId);
			}
		}

		// Log that we found a mission (for debugging)
		redditLogger.log(`Found mission: ${level.postId}`, {
			title: level.title.substring(0, 50),
			starDifficulty: level.stars,
			levelRange: level.levelRange,
			author: level.author,
			cleared: level.cleared,
		});
	} catch (error) {
		// ERROR LOG: Show full object
		redditLogger.error('Failed to save mission', {
			error: error instanceof Error ? error.message : String(error),
			errorStack: error instanceof Error ? error.stack : undefined,
			level: {
				title: level.title,
				postId: level.postId,
				starDifficulty: level.stars,
				href: level.href,
				author: level.author,
			},
		});
	}
}

/**
 * Get all level posts from the current Reddit page
 */
export function getAllLevels(): Level[] {
	const posts = document.querySelectorAll('shreddit-post');
	const levels: Level[] = [];
	let savedCount = 0;
	let skippedCount = 0;
	let parseFailedCount = 0;
	let missingDataCount = 0;

	redditLogger.log('Found posts on page, parsing...', {
		postsCount: posts.length,
	});

	posts.forEach((post, index) => {
		const level = parseLevelFromPost(post);
		if (level) {
			// Check if level has required data
			if (!level.postId || !level.href) {
				missingDataCount++;
				redditLogger.warn(`Post ${index + 1} missing data`, {
					title: level.title.substring(0, 50),
					hasPostId: !!level.postId,
					hasHref: !!level.href,
				});
				return;
			}

			levels.push(level);

			// Save basic mission info to database
			saveScannedMission(level)
				.then(() => {
					savedCount++;
				})
				.catch((err) => {
					redditLogger.error('Failed to save mission', {
						error: err instanceof Error ? err.message : String(err),
						postId: level.postId,
					});
					skippedCount++;
				});
		} else {
			parseFailedCount++;
		}
	});

	redditLogger.log('Parsed valid missions from posts', {
		validMissions: levels.length,
		totalPosts: posts.length,
	});
	redditLogger.log('Parse stats', {
		parseFailedCount,
		missingDataCount,
	});

	// Log summary after a delay to let saves complete
	setTimeout(() => {
		redditLogger.log('Save summary', {
			savedCount,
			skippedCount,
		});
	}, 2000); // Increased timeout to 2 seconds

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

		// Always skip cleared missions
		if (level.cleared) {
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
		redditLogger.log('[REDDIT] Navigating to:', level.href);
		window.location.href = level.href;
	} else if (level.element) {
		redditLogger.log('[REDDIT] Clicking level element:', level.title);
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
		redditLogger.log('[REDDIT] No shreddit-devvit-ui-loader found on page');
		return;
	}

	redditLogger.log('[REDDIT] Found shreddit-devvit-ui-loader:', loader);

	// Access shadow root
	const shadowRoot = loader.shadowRoot;
	if (shadowRoot) {
		redditLogger.log('[REDDIT] Shadow DOM found!');
		redditLogger.log('[REDDIT] Shadow root innerHTML:', shadowRoot.innerHTML);

		// Look for iframes
		const iframes = shadowRoot.querySelectorAll('iframe');
		redditLogger.log('[REDDIT] Iframes in shadow DOM:', iframes.length);
		iframes.forEach((iframe, index) => {
			redditLogger.log(`[REDDIT] Iframe ${index}:`, iframe.src);

			// Try to access iframe contents
			try {
				if (iframe.contentDocument) {
					redditLogger.log(
						`[REDDIT] Iframe ${index} document:`,
						iframe.contentDocument.body.innerHTML.substring(0, 500),
					);
				}
			} catch (e) {
				redditLogger.log(`[REDDIT] Cannot access iframe ${index} content (cross-origin)`, e);
			}
		});

		// List all elements
		const allElements = shadowRoot.querySelectorAll('*');
		redditLogger.log('[REDDIT] All elements in shadow DOM:', allElements.length);
		Array.from(allElements)
			.slice(0, 10)
			.forEach((el, index) => {
				if (index < 10) {
					console.log(
						`[REDDIT] Element ${index}:`,
						el.tagName,
						el.className,
						el.textContent?.substring(0, 100),
					);
				}
			});
	} else {
		redditLogger.log('[REDDIT] No shadow root found');
	}

	redditLogger.log('[REDDIT] Loader attributes:', {
		id: loader.id,
		className: loader.className,
		tagName: loader.tagName,
	});
}

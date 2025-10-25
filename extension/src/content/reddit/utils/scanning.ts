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
 * Check if a post's Devvit UI is ready for scanning
 * The UI can be in shadow DOM OR regular DOM
 */
function isPostShadowDOMReady(post: Element): boolean {
	const postId = post.getAttribute('id');
	const devvitLoader = post.querySelector('shreddit-devvit-ui-loader');
	if (!devvitLoader) {
		redditLogger.log('No devvit loader', { postId });
		return false; // No loader at all
	}

	// Check if showing "Loading ..." text WITHOUT actual content yet
	// (Sometimes "Loading" text stays even after content loads)
	const hasLoadingText = devvitLoader.textContent?.includes('Loading');
	const hasActualContent = devvitLoader.querySelector('div[class*="dark"]') !== null;

	if (hasLoadingText && !hasActualContent) {
		redditLogger.log('Still loading (no content yet)', { postId });
		return false; // Still loading
	}

	// Check shadow DOM path first
	if (devvitLoader.shadowRoot) {
		redditLogger.log('Found loader shadowRoot', { postId });
		const surface = devvitLoader.shadowRoot.querySelector('devvit-surface');
		if (surface) {
			redditLogger.log('Found devvit-surface', { postId, hasShadowRoot: !!surface.shadowRoot });
			if (surface.shadowRoot) {
				const renderer = surface.shadowRoot.querySelector('devvit-blocks-renderer');
				if (renderer) {
					redditLogger.log('Found devvit-blocks-renderer', {
						postId,
						hasShadowRoot: !!renderer.shadowRoot,
					});
					if (renderer.shadowRoot) {
						const stars = renderer.shadowRoot.querySelectorAll('img[src*="ap8a5ghsvyre1.png"]');
						redditLogger.log('Checked for stars', { postId, starCount: stars.length });
						if (stars.length > 0) {
							redditLogger.log('✓ Ready to scan (shadow DOM with stars)', {
								postId,
								stars: stars.length,
							});
							return true;
						}
					}
				} else {
					redditLogger.log('No devvit-blocks-renderer found', { postId });
				}
			}
		} else {
			redditLogger.log('No devvit-surface found', { postId });
		}
	} else {
		redditLogger.log('No loader shadowRoot', { postId });
	}

	// No fallback - we MUST have shadow DOM with stars
	return false;
}

/**
 * Add visual "SCANNED" flair to a post
 */
function addScannedFlair(post: Element, stars: number): void {
	// Find or create the flair container
	let flairContainer = post.querySelector('shreddit-post-flair');

	if (!flairContainer) {
		// Create flair container if it doesn't exist
		flairContainer = document.createElement('shreddit-post-flair');

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
	if (flairContainer.querySelector('.lazyfrog-scanned-badge')) {
		return;
	}

	// Create the scanned badge
	const badge = document.createElement('span');
	badge.className = 'lazyfrog-scanned-badge';
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
	badge.title = 'Scanned by LazyFrog';

	flairContainer.appendChild(badge);
}

/**
 * Scan a single post when its shadow DOM is ready
 */
async function scanPost(post: Element): Promise<void> {
	const postId = post.getAttribute('id');
	if (!postId) return;

	// Skip if already scanned
	if (scannedPostIds.has(postId)) return;

	// Check if shadow DOM is ready
	if (!isPostShadowDOMReady(post)) {
		redditLogger.log('Shadow DOM not ready yet', { postId });
		return;
	}

	redditLogger.log('Scanning post (shadow DOM ready)', { postId });

	// Parse the mission data
	const level = await parseLevelFromPost(post);

	if (level && level.stars > 0) {
		// Mark as scanned
		scannedPostIds.add(postId);

		// Add visual indicator
		addScannedFlair(post, level.stars);

		redditLogger.log('Post scanned successfully', {
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
		redditLogger.warn('Post shadow DOM ready but no stars found', { postId });
	}
}

/**
 * Watch a post for shadow DOM changes and scan when ready
 */
function observePost(post: Element): void {
	const postId = post.getAttribute('id');
	if (!postId) return;

	// Skip if already scanning/scanned
	if (scannedPostIds.has(postId) || postObservers.has(postId)) {
		return;
	}

	// Try immediate scan first
	scanPost(post);

	// Use polling to check for shadow DOM readiness
	// MutationObserver can't see inside shadow roots, so we poll
	let attempts = 0;
	const maxAttempts = 20; // Try for ~10 seconds
	const checkInterval = 500; // Check every 500ms

	const intervalId = setInterval(() => {
		attempts++;

		// Try to scan
		scanPost(post);

		// Stop if scanned successfully or max attempts reached
		if (scannedPostIds.has(postId) || attempts >= maxAttempts) {
			clearInterval(intervalId);
			postObservers.delete(postId);

			if (attempts >= maxAttempts && !scannedPostIds.has(postId)) {
				redditLogger.warn('Gave up scanning post after max attempts', { postId, attempts });
			}
		}
	}, checkInterval);

	// Store the interval ID so we can clean it up
	postObservers.set(postId, { disconnect: () => clearInterval(intervalId) } as any);

	redditLogger.log('Started observing post', { postId });
}

/**
 * Scan all visible posts on the page
 */
function scanVisiblePosts(): void {
	const posts = document.querySelectorAll('shreddit-post');
	redditLogger.log('Scanning visible posts', { count: posts.length });

	posts.forEach((post) => {
		observePost(post);
	});
}

/**
 * Initialize mutation-based scanning
 * Watches for new posts to appear and scans them when shadow DOM is ready
 */
export function initializeScrollScanning(): void {
	// Wait for DOM to be ready, then scan initial posts
	const waitForPosts = () => {
		const posts = document.querySelectorAll('shreddit-post');
		if (posts.length > 0) {
			redditLogger.log('Initial posts found, starting scan', { count: posts.length });
			scanVisiblePosts();
		} else {
			redditLogger.log('No posts yet, will wait for MutationObserver');
		}
	};

	// Try immediate scan
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', waitForPosts);
	} else {
		waitForPosts();
	}

	// Watch for new posts being added to the page
	const pageObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node instanceof Element) {
					// Check if the added node is a post
					if (node.tagName === 'SHREDDIT-POST') {
						redditLogger.log('New post detected via mutation', { postId: node.getAttribute('id') });
						observePost(node);
					}

					// Check if the added node contains posts
					const posts = node.querySelectorAll?.('shreddit-post');
					if (posts && posts.length > 0) {
						redditLogger.log('Container with posts added', { postCount: posts.length });
						posts.forEach((post) => observePost(post));
					}
				}
			}
		}
	});

	// Observe the entire document for new posts (wait for body to exist)
	const startPageObserver = () => {
		if (document.body) {
			pageObserver.observe(document.body, {
				childList: true,
				subtree: true,
			});
			redditLogger.log('Page observer started');
		} else {
			redditLogger.warn('document.body not available yet, retrying...');
			setTimeout(startPageObserver, 100);
		}
	};

	startPageObserver();

	// Also re-scan on scroll (to catch posts that were off-screen)
	let scrollTimeout: number | null = null;
	window.addEventListener(
		'scroll',
		() => {
			if (scrollTimeout !== null) {
				clearTimeout(scrollTimeout);
			}
			scrollTimeout = window.setTimeout(() => {
				scanVisiblePosts();
				scrollTimeout = null;
			}, 1000);
		},
		{ passive: true },
	);

	redditLogger.log('Shadow DOM-based scanning initialized');
}

/**
 * Manual scan trigger (for debug/force rescan)
 */
export function scanForNewMissions(reason: string = 'manual'): void {
	redditLogger.log(`Manual scan triggered: ${reason}`);
	scanVisiblePosts();
}

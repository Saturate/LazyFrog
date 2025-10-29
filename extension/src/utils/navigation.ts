/**
 * SPA Navigation utilities for Reddit
 * Provides smooth navigation without full page reloads
 */

import { redditLogger } from './logger';

/**
 * Check if a URL is a Reddit URL (same origin)
 */
export function isRedditUrl(url: string): boolean {
	try {
		const urlObj = new URL(url, window.location.origin);
		return urlObj.hostname === window.location.hostname;
	} catch {
		return false;
	}
}

/**
 * Navigate to a URL using SPA navigation if possible, fallback to hard navigation
 * @param url - The URL to navigate to
 * @param forceReload - Force a full page reload instead of SPA navigation
 */
export function navigateToUrl(url: string, forceReload: boolean = false): void {
	// If forceReload is requested or it's not a Reddit URL, do hard navigation
	if (forceReload || !isRedditUrl(url)) {
		window.location.href = url;
		return;
	}

	// Use SPA navigation with pushState
	try {
		// Update the URL without reloading
		window.history.pushState({}, '', url);

		// Dispatch a custom event so our code can react to navigation
		window.dispatchEvent(
			new CustomEvent('spa-navigation', {
				detail: { url, timestamp: Date.now() },
			}),
		);
	} catch (error) {
		// If SPA navigation fails, fallback to hard navigation
		redditLogger.error('[Navigation] SPA navigation failed', { error: String(error) });
		window.location.href = url;
	}
}

/**
 * Setup listeners for URL changes (both SPA and hard navigations)
 * Calls the provided callback whenever the URL changes
 */
export function onUrlChange(callback: (url: string) => void): () => void {
	let lastUrl = window.location.href;

	// Listen for popstate (back/forward buttons)
	const popstateHandler = () => {
		const newUrl = window.location.href;
		if (newUrl !== lastUrl) {
			lastUrl = newUrl;
			callback(newUrl);
		}
	};

	// Listen for our custom SPA navigation events
	const spaNavHandler = ((e: CustomEvent) => {
		const newUrl = e.detail.url;
		if (newUrl !== lastUrl) {
			lastUrl = newUrl;
			callback(newUrl);
		}
	}) as EventListener;

	// Monitor DOM changes to detect URL changes we didn't trigger
	// (e.g., user clicking Reddit's native links)
	const observer = new MutationObserver(() => {
		const newUrl = window.location.href;
		if (newUrl !== lastUrl) {
			lastUrl = newUrl;
			callback(newUrl);
		}
	});

	// Start listening
	window.addEventListener('popstate', popstateHandler);
	window.addEventListener('spa-navigation', spaNavHandler);
	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	// Return cleanup function
	return () => {
		window.removeEventListener('popstate', popstateHandler);
		window.removeEventListener('spa-navigation', spaNavHandler);
		observer.disconnect();
	};
}

/**
 * Get the current page type based on URL
 */
export function getCurrentPageType(): 'listing' | 'comments' | 'other' {
	if (window.location.pathname.includes('/comments/')) {
		return 'comments';
	} else if (
		window.location.pathname.match(/^\/r\/[^/]+\/?$/) ||
		window.location.pathname === '/'
	) {
		return 'listing';
	}
	return 'other';
}

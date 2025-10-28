/**
 * Service Worker Keep-Alive via Ping
 *
 * Content script pings the background service worker every 20 seconds
 * to prevent Chrome from terminating it during long-running automation.
 */

import { redditLogger } from '../../../utils/logger';

let pingInterval: NodeJS.Timeout | null = null;

/**
 * Start pinging the service worker every 20 seconds
 * This keeps the service worker alive during automation
 */
export function startPinging(): void {
	// Clear any existing interval
	if (pingInterval) {
		clearInterval(pingInterval);
	}

	// Ping every 20 seconds to keep service worker alive
	pingInterval = setInterval(() => {
		chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
			if (chrome.runtime.lastError) {
				redditLogger.error('[Ping] Failed to ping service worker', {
					error: chrome.runtime.lastError.message,
				});
				// Service worker might have died, stop pinging
				stopPinging();
			} else if (response?.success) {
				redditLogger.log('[Ping] Service worker alive', {
					state: response.state,
					timestamp: response.timestamp,
				});
			}
		});
	}, 20000);

	redditLogger.log('[Ping] Started pinging service worker every 20s');
}

/**
 * Stop pinging the service worker
 * Called when bot goes idle or encounters an error
 */
export function stopPinging(): void {
	if (pingInterval) {
		clearInterval(pingInterval);
		pingInterval = null;
		redditLogger.log('[Ping] Stopped pinging service worker');
	}
}

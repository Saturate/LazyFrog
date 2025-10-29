/**
 * Reddit user detection with caching
 * Detects the currently logged-in Reddit user
 */

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'redditUserCache';

interface UserCache {
	username: string;
	timestamp: number;
}

/**
 * Get the currently logged-in Reddit username
 * Returns "default" if not logged in or on error
 * Uses cached value if available and fresh
 */
export async function getCurrentRedditUser(): Promise<string> {
	// Check cache first
	const cached = await getCachedUser();
	if (cached) {
		return cached;
	}

	// Fetch from Reddit API
	try {
		const response = await fetch('https://www.reddit.com/api/me.json', {
			credentials: 'include',
		});

		if (!response.ok) {
			// Not logged in or API error
			// DON'T cache "default" - just return it
			// This prevents popup from overwriting the real username cache
			return 'default';
		}

		const data = await response.json();
		const username = data?.data?.name;

		if (username && typeof username === 'string') {
			await cacheUser(username);
			return username;
		} else {
			// Invalid response format
			// DON'T cache "default" - just return it
			return 'default';
		}
	} catch (error) {
		console.error('[UserDetection] Failed to fetch Reddit user:', error);
		// On error, use default but DON'T cache it
		// This allows content scripts with Reddit access to set the real username
		return 'default';
	}
}

/**
 * Get cached username if available and fresh
 */
async function getCachedUser(): Promise<string | null> {
	return new Promise((resolve) => {
		chrome.storage.local.get([STORAGE_KEY], (result) => {
			if (chrome.runtime.lastError) {
				resolve(null);
				return;
			}

			const cache: UserCache | undefined = result[STORAGE_KEY];
			if (!cache) {
				resolve(null);
				return;
			}

			const age = Date.now() - cache.timestamp;
			if (age < CACHE_DURATION) {
				resolve(cache.username);
			} else {
				resolve(null);
			}
		});
	});
}

/**
 * Cache username with timestamp
 */
async function cacheUser(username: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const cache: UserCache = {
			username,
			timestamp: Date.now(),
		};

		chrome.storage.local.set({ [STORAGE_KEY]: cache }, () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

/**
 * Clear the user cache (useful for testing or forcing refresh)
 */
export async function clearUserCache(): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.remove(STORAGE_KEY, () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

/**
 * Force refresh the user from Reddit (bypasses cache)
 */
export async function refreshCurrentUser(): Promise<string> {
	await clearUserCache();
	return getCurrentRedditUser();
}

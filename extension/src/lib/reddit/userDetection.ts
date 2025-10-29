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
 * Uses cached value if available (even if expired) in contexts that can't fetch
 */
export async function getCurrentRedditUser(): Promise<string> {
	// Check cache first (including expired cache)
	const cachedUser = await getCachedUserIncludingExpired();
	const isCacheFresh = cachedUser ? (Date.now() - cachedUser.timestamp < CACHE_DURATION) : false;

	// If cache is fresh, use it
	if (isCacheFresh && cachedUser) {
		return cachedUser.username;
	}

	// Try to fetch from Reddit API (only works in content script context)
	try {
		const response = await fetch('https://www.reddit.com/api/me.json', {
			credentials: 'include',
		});

		if (!response.ok) {
			// Fetch failed - if we have expired cache, use it rather than "default"
			// This handles popup context where fetch always fails
			if (cachedUser) {
				return cachedUser.username;
			}
			return 'default';
		}

		const data = await response.json();
		const username = data?.data?.name;

		if (username && typeof username === 'string') {
			await cacheUser(username);
			return username;
		} else {
			// Invalid response - use expired cache if available
			if (cachedUser) {
				return cachedUser.username;
			}
			return 'default';
		}
	} catch (error) {
		// Fetch error (e.g., popup context) - use expired cache if available
		if (cachedUser) {
			return cachedUser.username;
		}
		return 'default';
	}
}

/**
 * Get cached user data including expired cache
 * Returns null only if no cache exists at all
 */
async function getCachedUserIncludingExpired(): Promise<UserCache | null> {
	return new Promise((resolve) => {
		chrome.storage.local.get([STORAGE_KEY], (result) => {
			if (chrome.runtime.lastError) {
				resolve(null);
				return;
			}

			const cache: UserCache | undefined = result[STORAGE_KEY];
			resolve(cache || null);
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

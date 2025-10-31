import { redditLogger } from './logger';
import { STORAGE_KEYS, RedditAPICache } from '../lib/storage/storageTypes';

/**
 * Fetch Reddit post JSON and extract level from flair
 * Fallback when protobuf parsing fails to extract minLevel/maxLevel
 * Caches results to avoid redundant API calls
 */
export async function fetchLevelFromRedditAPI(
	postId: string,
): Promise<{ minLevel?: number; maxLevel?: number; title?: string; author?: string } | null> {
	try {
		// Remove t3_ prefix if present
		const cleanPostId = postId.replace('t3_', '');

		// Check cache first
		const cache = await new Promise<Record<string, RedditAPICache>>((resolve) => {
			chrome.storage.local.get([STORAGE_KEYS.REDDIT_API_CACHE], (result) => {
				resolve(result[STORAGE_KEYS.REDDIT_API_CACHE] || {});
			});
		});

		const cached = cache[cleanPostId];
		if (cached) {
			redditLogger.log(`[fetchLevelFromRedditAPI] Using cached data for ${cleanPostId}`, cached);
			return {
				minLevel: cached.minLevel,
				maxLevel: cached.maxLevel,
				title: cached.title,
				author: cached.author,
			};
		}

		const url = `https://www.reddit.com/r/SwordAndSupperGame/comments/${cleanPostId}/.json`;

		redditLogger.log(`[fetchLevelFromRedditAPI] Fetching ${url}`);

		const response = await fetch(url);
		if (!response.ok) {
			redditLogger.error(`[fetchLevelFromRedditAPI] HTTP error: ${response.status}`);
			return null;
		}

		const data = await response.json();
		const post = data[0]?.data?.children?.[0]?.data;

		if (!post) {
			redditLogger.error('[fetchLevelFromRedditAPI] No post data found in response');
			return null;
		}

		const linkFlairText = post.link_flair_text;
		const title = post.title;
		const author = post.author;

		if (!linkFlairText) {
			redditLogger.log('[fetchLevelFromRedditAPI] No link_flair_text found');
			return null;
		}

		// Parse flair like "Levels 1-5" or "Level 10-15"
		const levelMatch = linkFlairText.match(/Levels?\s+(\d+)-(\d+)/i);
		if (levelMatch) {
			const minLevel = parseInt(levelMatch[1], 10);
			const maxLevel = parseInt(levelMatch[2], 10);

			redditLogger.log(`[fetchLevelFromRedditAPI] Parsed levels from flair`, {
				postId,
				linkFlairText,
				minLevel,
				maxLevel,
				title,
				author,
			});

			// Save to cache
			const cacheEntry: RedditAPICache = {
				postId: cleanPostId,
				minLevel,
				maxLevel,
				title,
				author,
				timestamp: Date.now(),
			};

			const updatedCache = { ...cache, [cleanPostId]: cacheEntry };
			await new Promise<void>((resolve) => {
				chrome.storage.local.set({ [STORAGE_KEYS.REDDIT_API_CACHE]: updatedCache }, () => {
					resolve();
				});
			});

			redditLogger.log(`[fetchLevelFromRedditAPI] Cached data for ${cleanPostId}`);

			return { minLevel, maxLevel, title, author };
		}

		redditLogger.log('[fetchLevelFromRedditAPI] Could not parse levels from flair', { linkFlairText });
		return null;
	} catch (error) {
		redditLogger.error('[fetchLevelFromRedditAPI] Error fetching Reddit API', {
			error: error instanceof Error ? error.message : String(error),
			postId,
		});
		return null;
	}
}

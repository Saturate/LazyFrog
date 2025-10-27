import { redditLogger } from './logger';

/**
 * Fetch Reddit post JSON and extract level from flair
 * Fallback when protobuf parsing fails to extract minLevel/maxLevel
 */
export async function fetchLevelFromRedditAPI(postId: string): Promise<{ minLevel?: number; maxLevel?: number } | null> {
	try {
		// Remove t3_ prefix if present
		const cleanPostId = postId.replace('t3_', '');
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
			});

			return { minLevel, maxLevel };
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

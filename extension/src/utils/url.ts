/**
 * Normalize a Reddit post ID to ensure it has the standard t3_ prefix.
 *
 * @param id - The post ID to normalize (with or without t3_ prefix)
 * @returns The normalized post ID with t3_ prefix, or null if invalid
 *
 * @example
 * ```typescript
 * normalizePostId('1od6q1h') // 't3_1od6q1h'
 * normalizePostId('t3_1od6q1h') // 't3_1od6q1h'
 * normalizePostId('invalid') // null
 * ```
 */
export function normalizePostId(id: string): string | null {
	if (!id || typeof id !== 'string') {
		return null;
	}

	// If already prefixed, validate and return
	if (id.startsWith('t3_')) {
		const postIdPart = id.slice(3);
		if (postIdPart && /^[a-z0-9]+$/i.test(postIdPart)) {
			return id;
		}
		return null;
	}

	// If not prefixed, validate and add prefix
	if (/^[a-z0-9]+$/i.test(id)) {
		return `t3_${id}`;
	}

	return null;
}

/**
 * Normalize a Reddit Sword & Supper mission permalink to the canonical format:
 * https://www.reddit.com/r/SwordAndSupperGame/comments/<postId>/
 *
 * Accepts either a URL or a postId (with or without t3_ prefix).
 * The postId parameter should be the raw post ID without t3_ prefix.
 */
export function normalizeRedditPermalink(input: string): string {
	const base = 'https://www.reddit.com';

	// Helper to strip t3_ prefix
	const stripT3 = (id: string) => (id?.startsWith('t3_') ? id.slice(3) : id);

	let postId = '';

	try {
		if (input?.startsWith('http')) {
			const url = new URL(input);
			// Try to extract id from /comments/<id>/ path
			const match = url.pathname.match(/\/comments\/([^/]+)/);
			if (match && match[1]) {
				postId = stripT3(match[1]);
			}
		} else if (input) {
			// Treat as postId
			postId = stripT3(input);
		}
	} catch {
		// Fallback to treating as postId
		postId = stripT3(input);
	}

	if (!postId) {
		return `${base}/r/SwordAndSupperGame/`;
	}

	return `${base}/r/SwordAndSupperGame/comments/${postId}/`;
}

/**
 * Normalize a Reddit Sword & Supper mission permalink to the canonical format:
 * https://www.reddit.com/r/SwordAndSupperGame/comments/<postId>/
 *
 * Accepts either a URL or a postId (with or without t3_ prefix).
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

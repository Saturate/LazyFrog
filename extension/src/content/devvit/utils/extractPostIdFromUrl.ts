/**
 * @fileoverview Utility for extracting postId from various URL formats
 *
 * This utility handles different URL structures:
 * - Devvit iframe URLs with context parameter
 * - Devvit iframe URLs with JWT tokens
 * - Legacy Reddit URLs
 */

import { normalizePostId } from '../../../utils/url';

/**
 * Extract postId from URL as fallback when initialData is missing
 *
 * @param url - The URL to extract the postId from
 * @returns The extracted postId (e.g., "t3_1od6q1h") or null if not found
 *
 * @example
 * ```typescript
 * const url = "https://cabbageidle-eimoap-0-0-50-webview.devvit.net/index.html?context=%7B%22postId%22%3A%22t3_1od6q1h%22%7D";
 * const postId = extractPostIdFromUrl(url);
 * console.log(postId); // "t3_1od6q1h"
 * ```
 *
 * @example
 * ```typescript
 * // JWT token extraction
 * const url = "https://example.devvit.net/index.html?webbit_token=eyJ...";
 * const postId = extractPostIdFromUrl(url);
 * console.log(postId); // "t3_1od6q1h"
 * ```
 */
export function extractPostIdFromUrl(url: string): string | null {
	try {
		// For Devvit iframe URLs, try to extract from context parameter
		// URL format: https://cabbageidle-eimoap-0-0-50-webview.devvit.net/index.html?context=%7B...%7D
		// Stop at & or # to avoid capturing hash fragments
		const contextMatch = url.match(/context=([^&#]+)/);
		if (contextMatch) {
			try {
				const contextJson = decodeURIComponent(contextMatch[1]);
				const context = JSON.parse(contextJson);
				if (context.postId) {
					console.log('[extractPostIdFromUrl] Extracted postId from context parameter', {
						postId: context.postId,
					});
					return context.postId;
				}
			} catch (parseError) {
				console.warn('[extractPostIdFromUrl] Failed to parse context parameter', {
					error: String(parseError),
				});
				// Try to extract postId directly from the context string as a fallback
				const postIdMatch = contextMatch[1].match(/%22postId%22%3A%22(t3_[^%]+)%22/);
				if (postIdMatch) {
					console.log('[extractPostIdFromUrl] Extracted postId from context string fallback', {
						postId: postIdMatch[1],
					});
					return postIdMatch[1];
				}
			}
		}

		// Fallback: try to extract from JWT token in webbit_token parameter
		// Stop at & or # to avoid capturing hash fragments
		const tokenMatch = url.match(/webbit_token=([^&#]+)/);
		if (tokenMatch) {
			try {
				// JWT tokens have 3 parts separated by dots
				const tokenParts = tokenMatch[1].split('.');
				if (tokenParts.length === 3) {
					// Decode the payload (second part)
					const payload = JSON.parse(atob(tokenParts[1]));
					if (payload['devvit-post-id']) {
						console.log('[extractPostIdFromUrl] Extracted postId from JWT token', {
							postId: payload['devvit-post-id'],
						});
						return payload['devvit-post-id'];
					}
				}
			} catch (tokenError) {
				console.warn('[extractPostIdFromUrl] Failed to parse JWT token', {
					error: String(tokenError),
				});
			}
		}

		// Legacy fallback for Reddit URLs (probably won't work in Devvit iframe)
		const redditMatch = url.match(/\/comments\/([a-zA-Z0-9]+)/);
		if (redditMatch && redditMatch[1]) {
			return normalizePostId(redditMatch[1]);
		}
	} catch (error) {
		console.warn('[extractPostIdFromUrl] Failed to extract postId from URL', {
			error: String(error),
		});
	}
	return null;
}

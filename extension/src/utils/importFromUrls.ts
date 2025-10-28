/**
 * Import missions from Reddit URLs
 * Creates basic mission records without calling Reddit API
 */

import { normalizeRedditPermalink, normalizePostId } from './url';
import { saveMissionsBatch, getMission } from '../lib/storage/missions';
import { MissionRecord } from '../lib/storage/types';

export interface ImportFromUrlsOptions {
	urls: string[];
	minLevel: number;
	maxLevel: number;
}

export interface ImportFromUrlsResult {
	imported: number;
	skipped: number;
	failed: number;
	errors: string[];
}

/**
 * Extract postId from a Reddit URL
 * Returns null if URL is invalid or not a Sword & Supper post
 */
function extractPostId(url: string): string | null {
	try {
		const trimmed = url.trim();
		if (!trimmed) return null;

		// Try to parse as URL
		if (trimmed.startsWith('http')) {
			const urlObj = new URL(trimmed);

			// Check if it's a Reddit URL
			if (!urlObj.hostname.includes('reddit.com')) {
				return null;
			}

			// Extract postId from /comments/<postId>/
			const match = urlObj.pathname.match(/\/comments\/([a-z0-9]+)/i);
			if (match && match[1]) {
				return normalizePostId(match[1]);
			}
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Import missions from a list of Reddit URLs
 * Skips existing missions and continues on errors
 * Uses batch operation for better performance
 */
export async function importFromUrls(options: ImportFromUrlsOptions): Promise<ImportFromUrlsResult> {
	const result: ImportFromUrlsResult = {
		imported: 0,
		skipped: 0,
		failed: 0,
		errors: [],
	};

	// Deduplicate URLs
	const uniqueUrls = Array.from(new Set(options.urls.map((u) => u.trim()).filter(Boolean)));

	// Collect missions to save in batch
	const missionsToSave: MissionRecord[] = [];

	for (const url of uniqueUrls) {
		try {
			// Extract postId from URL
			const postId = extractPostId(url);
			if (!postId) {
				result.failed++;
				result.errors.push(`Invalid URL: ${url}`);
				continue;
			}

			// Check if mission already exists
			const existing = await getMission(postId);
			if (existing) {
				result.skipped++;
				continue;
			}

			// Create mission record
			const mission: MissionRecord = {
				postId,
				username: 'unknown',
				timestamp: Date.now(),
				metadata: null,
				difficulty: undefined,
				minLevel: options.minLevel,
				maxLevel: options.maxLevel,
				foodName: `Mission ${postId.slice(3)}`,
				permalink: normalizeRedditPermalink(postId.slice(3)),
				cleared: false,
			};

			missionsToSave.push(mission);
			result.imported++;
		} catch (error) {
			result.failed++;
			result.errors.push(`Failed to import ${url}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	// Save all missions in a single batch operation
	if (missionsToSave.length > 0) {
		try {
			await saveMissionsBatch(missionsToSave);
		} catch (error) {
			result.errors.push(`Batch save failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	return result;
}

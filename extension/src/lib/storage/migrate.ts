/**
 * Migration script to split mission data from user progress
 * Run once to migrate from old structure to new structure
 * Migrates to per-user progress storage using current Reddit username
 */

import { STORAGE_KEYS } from './types';
import type { MissionRecord, UserProgressData, MultiUserProgressDatabase } from './types';

/**
 * Get cached Reddit username without trying to fetch
 * Used during migration to avoid fetch attempts from background context
 */
async function getCachedUsernameForMigration(): Promise<string> {
	return new Promise((resolve) => {
		chrome.storage.local.get(['redditUserCache'], (result) => {
			if (chrome.runtime.lastError || !result.redditUserCache) {
				resolve('default');
				return;
			}
			const cache = result.redditUserCache;
			// Use cached username regardless of age - migration is one-time
			resolve(cache.username || 'default');
		});
	});
}

/**
 * Request username from any active Reddit tabs
 * Sends a message to all tabs to fetch and cache the username
 * Waits a bit for the response before proceeding
 */
async function requestUsernameFromRedditTabs(): Promise<void> {
	return new Promise((resolve) => {
		// Query for Reddit tabs
		chrome.tabs.query({ url: '*://*.reddit.com/*' }, (tabs) => {
			if (chrome.runtime.lastError || !tabs.length) {
				console.log('[Migration] No Reddit tabs found to fetch username from');
				resolve();
				return;
			}

			console.log('[Migration] Found', tabs.length, 'Reddit tabs, requesting username...');

			// Send message to first Reddit tab to fetch username
			chrome.tabs.sendMessage(
				tabs[0].id!,
				{ type: 'FETCH_REDDIT_USERNAME' },
				(response) => {
					if (chrome.runtime.lastError) {
						console.log('[Migration] Could not communicate with Reddit tab:', chrome.runtime.lastError.message);
					} else {
						console.log('[Migration] Username fetch requested from Reddit tab');
					}
					// Resolve after a short delay to let the content script cache the username
					setTimeout(resolve, 500);
				}
			);
		});
	});
}

/**
 * Migrate existing missions to separate progress tracking
 *
 * Old structure: missions storage contains both data and progress
 * New structure: missions = data only, userProgress[username] = tracking only
 * All existing progress is migrated to the cached Reddit username, or "default" if not cached
 */
export async function migrateToSeparateProgress(): Promise<{
	migrated: number;
	skipped: number;
}> {
	// Try to get username from any active Reddit tabs first
	await requestUsernameFromRedditTabs();

	// Get cached Reddit username for migration (don't try to fetch from background context)
	const username = await getCachedUsernameForMigration();
	console.log('[Migration] Migrating progress to username:', username);

	return new Promise((resolve, reject) => {
		// Get existing missions
		chrome.storage.local.get([STORAGE_KEYS.MISSIONS, STORAGE_KEYS.USER_PROGRESS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			const oldMissions: Record<string, any> = result[STORAGE_KEYS.MISSIONS] || {};
			const existingUserProgress: any = result[STORAGE_KEYS.USER_PROGRESS] || {};

			// Helper to check if an object matches UserProgressData format (array-based)
			function isUserProgressData(val: any): boolean {
				return (
					val &&
					typeof val === 'object' &&
					(
						Array.isArray(val.cleared) ||
						Array.isArray(val.disabled) ||
						(typeof val.clearedAt === 'object' && val.clearedAt !== null) ||
						(typeof val.loot === 'object' && val.loot !== null)
					)
				);
			}

			// Check if already in multi-user format (nested structure)
			// Multi-user format: { username: UserProgressData }
			// Old flat format: { postId: {...} } where entries have 'postId' field
			const isAlreadyMultiUser = Object.values(existingUserProgress).some(isUserProgressData);

			// If it's flat format (has postId in entries), convert to multi-user
			let existingMultiUserProgress: MultiUserProgressDatabase;
			if (!isAlreadyMultiUser && Object.keys(existingUserProgress).length > 0) {
				// This is old flat format - convert to new array-based UserProgressData
				console.log('[Migration] Detected flat progress format, converting to array-based format');

				const convertedUserProgress: UserProgressData = {
					cleared: [],
					disabled: [],
					clearedAt: {},
					loot: {},
				};

				// Convert old object-based format to new array-based format
				for (const [postId, entry] of Object.entries(existingUserProgress)) {
					if (entry.cleared) {
						convertedUserProgress.cleared.push(postId);
					}
					if (entry.disabled) {
						convertedUserProgress.disabled.push(postId);
					}
					if (entry.clearedAt !== undefined) {
						convertedUserProgress.clearedAt[postId] = entry.clearedAt;
					}
					if (entry.totalLoot !== undefined && entry.totalLoot.length > 0) {
						convertedUserProgress.loot[postId] = entry.totalLoot;
					}
				}

				existingMultiUserProgress = {
					[username]: convertedUserProgress
				};
			} else {
				existingMultiUserProgress = existingUserProgress;
			}

			const cleanedMissions: Record<string, MissionRecord> = {};
			const multiUserProgress: MultiUserProgressDatabase = { ...existingMultiUserProgress };

			// Get or create current user's progress (new array-based format)
			const userProgress: UserProgressData = multiUserProgress[username] || {
				cleared: [],
				disabled: [],
				clearedAt: {},
				loot: {},
			};

			let migrated = 0;
			let skipped = 0;

			// Process each mission
			for (const postId in oldMissions) {
				const old = oldMissions[postId];

				// Extract user progress fields
				const hasProgress =
					old.cleared !== undefined ||
					old.clearedAt !== undefined ||
					old.disabled !== undefined ||
					old.totalLoot !== undefined;

				if (hasProgress) {
					// Add to cleared array if cleared
					if (old.cleared && !userProgress.cleared.includes(postId)) {
						userProgress.cleared.push(postId);
					}

					// Add to disabled array if disabled
					if (old.disabled && !userProgress.disabled.includes(postId)) {
						userProgress.disabled.push(postId);
					}

					// Add clearedAt timestamp
					if (old.clearedAt !== undefined) {
						userProgress.clearedAt[postId] = old.clearedAt;
					}

					// Add loot
					if (old.totalLoot !== undefined && old.totalLoot.length > 0) {
						userProgress.loot[postId] = old.totalLoot;
					}

					migrated++;
				} else {
					skipped++;
				}

				// Create clean mission record (remove progress fields)
				const { cleared, clearedAt, disabled, totalLoot, ...cleanMission } = old;
				cleanedMissions[postId] = cleanMission;
			}

			// Update multi-user progress with current user's data
			multiUserProgress[username] = userProgress;

			// Save both back to storage
			chrome.storage.local.set(
				{
					[STORAGE_KEYS.MISSIONS]: cleanedMissions,
					[STORAGE_KEYS.USER_PROGRESS]: multiUserProgress,
				},
				() => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						console.log('[Migration] Successfully migrated:', { migrated, skipped, username });
						resolve({ migrated, skipped });
					}
				},
			);
		});
	});
}

/**
 * Check if migration is needed
 */
export async function needsMigration(): Promise<boolean> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get([STORAGE_KEYS.MISSIONS, STORAGE_KEYS.USER_PROGRESS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			const missions: Record<string, any> = result[STORAGE_KEYS.MISSIONS] || {};
			const userProgress: MultiUserProgressDatabase = result[STORAGE_KEYS.USER_PROGRESS] || {};

			// If userProgress is empty and missions exist, likely needs migration
			if (Object.keys(userProgress).length === 0 && Object.keys(missions).length > 0) {
				// Check if any mission has progress fields
				const hasProgressFields = Object.values(missions).some(
					(m: any) =>
						m.cleared !== undefined ||
						m.clearedAt !== undefined ||
						m.disabled !== undefined ||
						m.totalLoot !== undefined,
				);
				resolve(hasProgressFields);
			} else {
				resolve(false);
			}
		});
	});
}

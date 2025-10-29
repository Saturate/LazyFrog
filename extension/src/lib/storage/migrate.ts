/**
 * Migration script to split mission data from user progress
 * Run once to migrate from old structure to new structure
 * Migrates to per-user progress storage using "default" user
 */

import { STORAGE_KEYS } from './types';
import type { MissionRecord, UserProgressDatabase, MultiUserProgressDatabase } from './types';

/**
 * Migrate existing missions to separate progress tracking
 *
 * Old structure: missions storage contains both data and progress
 * New structure: missions = data only, userProgress[username] = tracking only
 * All existing progress is migrated to the "default" user
 */
export async function migrateToSeparateProgress(): Promise<{
	migrated: number;
	skipped: number;
}> {
	return new Promise((resolve, reject) => {
		// Get existing missions
		chrome.storage.local.get([STORAGE_KEYS.MISSIONS, STORAGE_KEYS.USER_PROGRESS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			const oldMissions: Record<string, any> = result[STORAGE_KEYS.MISSIONS] || {};
			const existingMultiUserProgress: MultiUserProgressDatabase =
				result[STORAGE_KEYS.USER_PROGRESS] || {};

			// Check if already in multi-user format
			const isAlreadyMultiUser = Object.values(existingMultiUserProgress).some(
				(val) => val && typeof val === 'object' && !('postId' in val),
			);

			const cleanedMissions: Record<string, MissionRecord> = {};
			const multiUserProgress: MultiUserProgressDatabase = isAlreadyMultiUser
				? existingMultiUserProgress
				: {};

			// Get or create default user's progress
			const defaultUserProgress: UserProgressDatabase = multiUserProgress.default || {};

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
					// Create progress record for default user
					defaultUserProgress[postId] = {
						postId,
						...(old.cleared !== undefined && { cleared: old.cleared }),
						...(old.clearedAt !== undefined && { clearedAt: old.clearedAt }),
						...(old.disabled !== undefined && { disabled: old.disabled }),
						...(old.totalLoot !== undefined && { totalLoot: old.totalLoot }),
					};
					migrated++;
				} else {
					skipped++;
				}

				// Create clean mission record (remove progress fields)
				const { cleared, clearedAt, disabled, totalLoot, ...cleanMission } = old;
				cleanedMissions[postId] = cleanMission;
			}

			// Update multi-user progress with default user's data
			multiUserProgress.default = defaultUserProgress;

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
						console.log('[Migration] Successfully migrated:', { migrated, skipped });
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
			const userProgress: UserProgressDatabase = result[STORAGE_KEYS.USER_PROGRESS] || {};

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

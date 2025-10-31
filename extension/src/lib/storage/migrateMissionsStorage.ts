/**
 * One-time migration utility to convert all missions in storage from old nested format to new flat format
 * This permanently updates the storage, so the migration doesn't need to run every time missions are loaded
 */

import { MissionRecord } from '@lazyfrog/types';
import { STORAGE_KEYS } from './storageTypes';
import { normalizeMissionRecord, isLegacyFormat } from '../../utils/missionRecordMigration';

export interface MigrationResult {
	total: number;
	migrated: number;
	alreadyFlat: number;
	errors: string[];
}

/**
 * Migrate all missions in storage from old nested format to new flat format
 * This is a one-time operation that permanently updates the storage
 */
export async function migrateMissionsStorage(): Promise<MigrationResult> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get([STORAGE_KEYS.MISSIONS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			const rawMissions = result[STORAGE_KEYS.MISSIONS] || {};
			const postIds = Object.keys(rawMissions);

			const migrationResult: MigrationResult = {
				total: postIds.length,
				migrated: 0,
				alreadyFlat: 0,
				errors: [],
			};

			if (postIds.length === 0) {
				resolve(migrationResult);
				return;
			}

			const migratedMissions: Record<string, MissionRecord> = {};

			for (const postId of postIds) {
				try {
					const mission = rawMissions[postId];

					if (isLegacyFormat(mission)) {
						// Migrate and clean up optional fields
						const migrated = normalizeMissionRecord(mission);

						// Remove empty optional fields
						if (migrated.authorWeaponId === '') {
							delete (migrated as any).authorWeaponId;
						}
						if (migrated.chef === '') {
							delete (migrated as any).chef;
						}
						if (migrated.cart === '') {
							delete (migrated as any).cart;
						}
						if (!migrated.timestamp || migrated.timestamp === 0) {
							delete (migrated as any).timestamp;
						}

						migratedMissions[postId] = migrated;
						migrationResult.migrated++;
					} else {
						// Already in flat format
						migratedMissions[postId] = mission;
						migrationResult.alreadyFlat++;
					}
				} catch (error) {
					migrationResult.errors.push(`${postId}: ${error instanceof Error ? error.message : String(error)}`);
					// Keep the original mission if migration fails
					migratedMissions[postId] = rawMissions[postId];
				}
			}

			// Save the migrated missions back to storage
			chrome.storage.local.set({ [STORAGE_KEYS.MISSIONS]: migratedMissions }, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					// Notify background script that missions changed
					chrome.runtime.sendMessage({
						type: 'MISSIONS_UPDATED',
					}).catch(() => {
						// Ignore errors if no listeners
					});
					resolve(migrationResult);
				}
			});
		});
	});
}

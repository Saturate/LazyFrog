/**
 * Mission CRUD operations
 */

import { MissionRecord } from '@lazyfrog/types';
import { STORAGE_KEYS } from './storageTypes';
import * as userProgressOps from './userProgress';
import { normalizeMissionRecord } from '../../utils/missionRecordMigration';

/**
 * Save a mission to storage
 */
export async function saveMission(mission: MissionRecord): Promise<void> {
	return new Promise((resolve, reject) => {
		// Check if extension context is still valid
		if (!chrome.runtime?.id) {
			reject(new Error('Extension context invalidated'));
			return;
		}

		chrome.storage.local.get([STORAGE_KEYS.MISSIONS], (result) => {
			// Check for errors on get
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			const missions: Record<string, MissionRecord> = result[STORAGE_KEYS.MISSIONS] || {};

			// Use postId as key to avoid duplicates
			missions[mission.postId] = mission;

			chrome.storage.local.set({ [STORAGE_KEYS.MISSIONS]: missions }, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					// Notify background script that missions changed
					chrome.runtime.sendMessage({
						type: 'MISSIONS_UPDATED',
					}).catch(() => {
						// Ignore errors if no listeners
					});
					resolve();
				}
			});
		});
	});
}

/**
 * Save multiple missions to storage in a single batch operation
 */
export async function saveMissionsBatch(missions: MissionRecord[]): Promise<void> {
	return new Promise((resolve, reject) => {
		// Check if extension context is still valid
		if (!chrome.runtime?.id) {
			reject(new Error('Extension context invalidated'));
			return;
		}

		chrome.storage.local.get([STORAGE_KEYS.MISSIONS], (result) => {
			// Check for errors on get
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			const existingMissions: Record<string, MissionRecord> = result[STORAGE_KEYS.MISSIONS] || {};

			// Add all new missions using postId as key
			missions.forEach((mission) => {
				existingMissions[mission.postId] = mission;
			});

			chrome.storage.local.set({ [STORAGE_KEYS.MISSIONS]: existingMissions }, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					// Notify background script that missions changed
					chrome.runtime.sendMessage({
						type: 'MISSIONS_UPDATED',
					}).catch(() => {
						// Ignore errors if no listeners
					});
					resolve();
				}
			});
		});
	});
}

/**
 * Get all saved missions
 * Automatically migrates old nested format to new flat format
 */
export async function getAllMissions(): Promise<Record<string, MissionRecord>> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get([STORAGE_KEYS.MISSIONS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				const rawMissions = result[STORAGE_KEYS.MISSIONS] || {};
				// Migrate any old format missions to new flat format
				const migratedMissions: Record<string, MissionRecord> = {};
				for (const postId in rawMissions) {
					migratedMissions[postId] = normalizeMissionRecord(rawMissions[postId]);
				}
				resolve(migratedMissions);
			}
		});
	});
}

/**
 * Get a specific mission by postId
 */
export async function getMission(postId: string): Promise<MissionRecord | null> {
	const missions = await getAllMissions();
	return missions[postId] || null;
}

/**
 * Delete a mission
 */
export async function deleteMission(postId: string): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get([STORAGE_KEYS.MISSIONS], (result) => {
			const missions: Record<string, MissionRecord> = result[STORAGE_KEYS.MISSIONS] || {};
			delete missions[postId];

			chrome.storage.local.set({ [STORAGE_KEYS.MISSIONS]: missions }, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					resolve();
				}
			});
		});
	});
}

/**
 * Clear all missions
 */
export async function clearAllMissions(): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.remove(STORAGE_KEYS.MISSIONS, () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

/**
 * Mark all missions as incomplete (cleared = false, remove clearedAt)
 * Now delegates to userProgress to clear all progress data
 */
export async function markAllMissionsIncomplete(): Promise<void> {
	return userProgressOps.clearAllUserProgress();
}

/**
 * Mark a mission as cleared
 * Now delegates to userProgress storage
 */
export async function markMissionCleared(postId: string): Promise<void> {
	return userProgressOps.markMissionCleared(postId);
}

/**
 * Accumulate loot from an encounter to mission's total loot
 * Now delegates to userProgress storage
 */
export async function accumulateMissionLoot(
	postId: string,
	encounterLoot: Array<{ id: string; quantity: number }>,
): Promise<void> {
	return userProgressOps.accumulateMissionLoot(postId, encounterLoot);
}

/**
 * Set mission disabled state (skipped by automation when disabled)
 * Now delegates to userProgress storage
 */
export async function setMissionDisabled(postId: string, disabled: boolean): Promise<void> {
	return userProgressOps.setMissionDisabled(postId, disabled);
}

/**
 * Import missions from JSON data
 */
export async function importMissions(
	jsonData: string | any,
	mode: 'merge' | 'replace' = 'merge',
): Promise<{ imported: number; skipped: number; errors: string[] }> {
	const stats = { imported: 0, skipped: 0, errors: [] as string[] };

	try {
		// Parse JSON if it's a string
		let data: any;
		if (typeof jsonData === 'string') {
			data = JSON.parse(jsonData);
		} else {
			data = jsonData;
		}

		// Get existing missions
		const existingMissions = mode === 'merge' ? await getAllMissions() : {};

		// Handle different data formats
		let missionsToImport: Record<string, MissionRecord> = {};

		if (Array.isArray(data)) {
			// Array of missions
			data.forEach((mission: any) => {
				if (mission.postId) {
					missionsToImport[mission.postId] = mission;
				}
			});
		} else if (typeof data === 'object') {
			// Could be object with postId keys or wrapped data
			if (data.missions) {
				missionsToImport = data.missions;
			} else {
				missionsToImport = data;
			}
		}

		// Validate and import missions
		for (const [postId, mission] of Object.entries(missionsToImport)) {
			try {
				// Basic validation
				if (!mission.postId || !mission.timestamp) {
					stats.errors.push(`Invalid mission data for ${postId}`);
					stats.skipped++;
					continue;
				}

				// Check if already exists in merge mode
				if (mode === 'merge' && existingMissions[postId]) {
					stats.skipped++;
					continue;
				}

				// Add to existing missions
				existingMissions[postId] = mission;
				stats.imported++;
			} catch (err) {
				stats.errors.push(`Error importing ${postId}: ${err}`);
				stats.skipped++;
			}
		}

		// Save all missions back to storage
		await new Promise<void>((resolve, reject) => {
			chrome.storage.local.set({ [STORAGE_KEYS.MISSIONS]: existingMissions }, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					resolve();
				}
			});
		});

		return stats;
	} catch (err) {
		stats.errors.push(`Parse error: ${err}`);
		return stats;
	}
}

/**
 * Mission CRUD operations
 */

import { MissionRecord, STORAGE_KEYS } from './types';

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
 */
export async function getAllMissions(): Promise<Record<string, MissionRecord>> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get([STORAGE_KEYS.MISSIONS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(result[STORAGE_KEYS.MISSIONS] || {});
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
 */
export async function markAllMissionsIncomplete(): Promise<void> {
	return new Promise((resolve, reject) => {
		// Check if extension context is still valid
		if (!chrome.runtime?.id) {
			reject(new Error('Extension context invalidated'));
			return;
		}

		chrome.storage.local.get([STORAGE_KEYS.MISSIONS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			const missions: Record<string, MissionRecord> = result[STORAGE_KEYS.MISSIONS] || {};

			// No missions stored – nothing to do
			if (!missions || Object.keys(missions).length === 0) {
				resolve();
				return;
			}

			for (const postId of Object.keys(missions)) {
				const mission = missions[postId];
				if (mission) {
					mission.cleared = false;
					// Remove timestamp to avoid misleading stats of recently cleared
					if ('clearedAt' in mission) {
						delete mission.clearedAt;
					}
				}
			}

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
 * Mark a mission as cleared
 */
export async function markMissionCleared(postId: string): Promise<void> {
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

			if (missions[postId]) {
				missions[postId].cleared = true;
				missions[postId].clearedAt = Date.now();

				chrome.storage.local.set({ [STORAGE_KEYS.MISSIONS]: missions }, () => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve();
					}
				});
			} else {
				reject(new Error(`Mission ${postId} not found`));
			}
		});
	});
}

/**
 * Accumulate loot from an encounter to mission's total loot
 */
export async function accumulateMissionLoot(
	postId: string,
	encounterLoot: Array<{ id: string; quantity: number }>,
): Promise<void> {
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

			if (missions[postId]) {
				// Initialize totalLoot if not present
				if (!missions[postId].totalLoot) {
					missions[postId].totalLoot = [];
				}

				// Accumulate loot by combining quantities for same items
				encounterLoot.forEach((newItem) => {
					const existingItem = missions[postId].totalLoot!.find((item) => item.id === newItem.id);
					if (existingItem) {
						existingItem.quantity += newItem.quantity;
					} else {
						missions[postId].totalLoot!.push({ ...newItem });
					}
				});

				chrome.storage.local.set({ [STORAGE_KEYS.MISSIONS]: missions }, () => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve();
					}
				});
			} else {
				reject(new Error(`Mission ${postId} not found`));
			}
		});
	});
}

/**
 * Set mission disabled state (skipped by automation when disabled)
 */
export async function setMissionDisabled(postId: string, disabled: boolean): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!chrome.runtime?.id) {
			reject(new Error('Extension context invalidated'));
			return;
		}

		chrome.storage.local.get([STORAGE_KEYS.MISSIONS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			const missions: Record<string, MissionRecord> = result[STORAGE_KEYS.MISSIONS] || {};
			if (!missions[postId]) {
				reject(new Error(`Mission ${postId} not found`));
				return;
			}

			missions[postId].disabled = disabled;

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

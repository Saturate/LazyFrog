/**
 * Chrome Storage Utility
 * Handles saving/loading mission data and user preferences
 */

export interface MissionRecord {
	postId: string;
	username: string;
	timestamp: number;
	metadata: any;
	tags?: string;
	difficulty?: number;
	environment?: string;
	minLevel?: number;
	maxLevel?: number;
	missionTitle?: string; // Full mission title (e.g., "Treasure and Maple-Glazed Bacon In the Mossy Forest")
	foodName?: string; // Mission goal/reward (e.g., "Maple-Glazed Bacon")
	cleared?: boolean;
	clearedAt?: number;
	permalink?: string;
	totalLoot?: Array<{ id: string; quantity: number }>; // Accumulated loot from all encounters
	disabled?: boolean; // If true, mission is skipped by automation
}

export interface UserOptions {
	// Automation settings
	abilityTierList?: string[];
	blessingStatPriority?: string[];
	autoAcceptSkillBargains?: boolean;
	skillBargainStrategy?: 'always' | 'positive-only' | 'never';
	crossroadsStrategy?: 'fight' | 'skip';

	// UI preferences
	autoStartMissions?: boolean;
	showNotifications?: boolean;
}

const STORAGE_KEYS = {
	MISSIONS: 'missions',
	USER_OPTIONS: 'userOptions',
};

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
 * Import missions from JSON data
 * @param jsonData - JSON string or object containing mission data
 * @param mode - 'merge' to keep existing missions, 'replace' to overwrite all
 * @returns Object with import statistics
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

/**
 * Get mission count
 */
export async function getMissionCount(): Promise<number> {
	const missions = await getAllMissions();
	return Object.keys(missions).length;
}

/**
 * Search missions by criteria
 */
export async function searchMissions(criteria: {
	difficulty?: number;
	environment?: string;
	minLevel?: number;
	maxLevel?: number;
}): Promise<MissionRecord[]> {
	const missions = await getAllMissions();
	const results: MissionRecord[] = [];

	for (const mission of Object.values(missions)) {
		let matches = true;

		if (criteria.difficulty !== undefined && mission.difficulty !== criteria.difficulty) {
			matches = false;
		}
		if (criteria.environment !== undefined && mission.environment !== criteria.environment) {
			matches = false;
		}
		if (criteria.minLevel !== undefined && mission.minLevel !== criteria.minLevel) {
			matches = false;
		}
		if (criteria.maxLevel !== undefined && mission.maxLevel !== criteria.maxLevel) {
			matches = false;
		}

		if (matches) {
			results.push(mission);
		}
	}

	return results;
}

/**
 * Save user options
 */
export async function saveUserOptions(options: UserOptions): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set({ [STORAGE_KEYS.USER_OPTIONS]: options }, () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

/**
 * Get user options
 */
export async function getUserOptions(): Promise<UserOptions> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get([STORAGE_KEYS.USER_OPTIONS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(result[STORAGE_KEYS.USER_OPTIONS] || {});
			}
		});
	});
}

/**
 * Update specific user option
 */
export async function updateUserOption<K extends keyof UserOptions>(
	key: K,
	value: UserOptions[K],
): Promise<void> {
	const options = await getUserOptions();
	options[key] = value;
	await saveUserOptions(options);
}

/**
 * Get storage usage stats
 */
export async function getStorageStats(): Promise<{
	bytesInUse: number;
	missionCount: number;
}> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				getMissionCount().then((missionCount) => {
					resolve({ bytesInUse, missionCount });
				});
			}
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
 * Check if mission is cleared by looking for cleared indicators in the DOM
 * Returns the cleared image element if found, null otherwise
 */
export function checkMissionClearedInDOM(): HTMLImageElement | null {
	// Check for cleared image (the cleared/done banner)
	// This image appears when a mission has been cleared
	const clearedImages = Array.from(
		document.querySelectorAll('img[src*="fxlui9egtgbf1.png"]'),
	) as HTMLImageElement[];
	return clearedImages.length > 0 ? clearedImages[0] : null;
}

/**
 * Get next uncleared mission, optionally filtered by criteria
 */
/**
 * Get filtered and sorted uncleared missions.
 * This is the single source of truth for mission filtering across the app.
 *
 * @param filters - Optional filters for stars, minLevel, maxLevel
 * @returns Array of missions that match filters, sorted newest first
 */
export async function getFilteredUnclearedMissions(filters?: {
	stars?: number[];
	minLevel?: number;
	maxLevel?: number;
}): Promise<MissionRecord[]> {
	const missions = await getAllMissions();
	let unclearedMissions = Object.values(missions).filter(
		(m) => !m.cleared && !m.disabled && (m.difficulty ?? 0) > 0,
	); // Only return missions with star difficulty data

	// Apply filters if provided
	if (filters) {
		unclearedMissions = unclearedMissions.filter((m) => {
			// Star difficulty filter
			if (filters.stars && filters.stars.length > 0) {
				if (!filters.stars.includes(m.difficulty || 0)) {
					return false;
				}
			}

			// Level range filter
			if (filters.minLevel !== undefined && m.minLevel !== undefined) {
				if (m.minLevel < filters.minLevel) {
					return false;
				}
			}

			if (filters.maxLevel !== undefined && m.maxLevel !== undefined) {
				if (m.maxLevel > filters.maxLevel) {
					return false;
				}
			}

			return true;
		});
	}

	// Sort by timestamp (newest first)
	unclearedMissions.sort((a, b) => b.timestamp - a.timestamp);

	return unclearedMissions;
}

export async function getNextUnclearedMission(filters?: {
	stars?: number[];
	minLevel?: number;
	maxLevel?: number;
}): Promise<MissionRecord | null> {
	const unclearedMissions = await getFilteredUnclearedMissions(filters);
	return unclearedMissions[0] || null;
}

/**
 * Get all uncleared missions
 */
export async function getUnclearedMissions(): Promise<MissionRecord[]> {
	const missions = await getAllMissions();
	return Object.values(missions)
		.filter((m) => !m.cleared && !m.disabled)
		.sort((a, b) => a.timestamp - b.timestamp); // Oldest first
}

/**
 * Get mission statistics
 */
export async function getMissionStats(): Promise<{
	queued: number; // Uncleared missions matching current filters
	total: number; // All missions
	cleared: number; // Cleared missions
	uncleared: number; // Uncleared missions
	todayCleared: number; // Missions cleared today
}> {
	const missions = await getAllMissions();
	const missionArray = Object.values(missions);

	// Get current filters from storage
	const result = await chrome.storage.local.get(['automationFilters']);
	const currentFilters = result.automationFilters || {
		stars: [1, 2],
		minLevel: 1,
		maxLevel: 340,
	};

	// Calculate basic stats
	const cleared = missionArray.filter((m) => m.cleared).length;
	const uncleared = missionArray.filter((m) => !m.cleared && !m.disabled).length;

	// Today's cleared missions (last 24 hours)
	const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
	const todayCleared = missionArray.filter(
		(m) => m.cleared && m.clearedAt && m.clearedAt > oneDayAgo,
	).length;

	// Queued missions (uncleared + matching filters)
	const queued = missionArray.filter((m) => {
		if (m.cleared) return false;
		if (m.disabled) return false;

		// Star difficulty filter
		if (currentFilters.stars && currentFilters.stars.length > 0) {
			if (!currentFilters.stars.includes(m.difficulty || 0)) {
				return false;
			}
		}

		// Level range filter
		if (currentFilters.minLevel !== undefined && m.minLevel !== undefined) {
			if (m.minLevel < currentFilters.minLevel) {
				return false;
			}
		}

		if (currentFilters.maxLevel !== undefined && m.maxLevel !== undefined) {
			if (m.maxLevel > currentFilters.maxLevel) {
				return false;
			}
		}

		return true;
	}).length;

	return {
		queued,
		total: missionArray.length,
		cleared,
		uncleared,
		todayCleared,
	};
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

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
  totalLoot?: Array<{id: string; quantity: number}>; // Accumulated loot from all encounters
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
  value: UserOptions[K]
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
export async function accumulateMissionLoot(postId: string, encounterLoot: Array<{id: string; quantity: number}>): Promise<void> {
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
        encounterLoot.forEach(newItem => {
          const existingItem = missions[postId].totalLoot!.find(item => item.id === newItem.id);
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
  const clearedImages = Array.from(document.querySelectorAll('img[src*="fxlui9egtgbf1.png"]')) as HTMLImageElement[];
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
  let unclearedMissions = Object.values(missions)
    .filter(m => !m.cleared && (m.difficulty ?? 0) > 0); // Only return missions with star difficulty data

  // Apply filters if provided
  if (filters) {
    unclearedMissions = unclearedMissions.filter(m => {
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
    .filter(m => !m.cleared)
    .sort((a, b) => a.timestamp - b.timestamp); // Oldest first
}

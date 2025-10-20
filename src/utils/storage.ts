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
  foodName?: string;
  cleared?: boolean;
  clearedAt?: number;
  permalink?: string;
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
 * Get next uncleared mission
 */
export async function getNextUnclearedMission(): Promise<MissionRecord | null> {
  const missions = await getAllMissions();
  const unclearedMissions = Object.values(missions)
    .filter(m => !m.cleared && (m.difficulty ?? 0) > 0) // Only return missions with star difficulty data
    .sort((a, b) => a.timestamp - b.timestamp); // Oldest first

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

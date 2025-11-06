/**
 * Export and import all extension data for complete backup/restore
 */

import type { MissionsDatabase } from '@lazyfrog/types';
import type {
	MultiUserProgressDatabase,
	UserOptions,
	AutomationFilters,
	RedditAPICache,
} from './storageTypes';
import type { GameInstanceAutomationConfig } from '../../automation/gameInstanceAutomation';
import { STORAGE_KEYS } from './storageTypes';
import { getCurrentRedditUser } from '../reddit/userDetection';

export interface CompleteBackupData {
	version: string; // Backup format version
	extVersion: string; // Extension version
	exportDate: number;
	username: string; // Username at time of export (for reference)
	data: {
		missions?: MissionsDatabase;
		userProgress?: MultiUserProgressDatabase;
		userOptions?: UserOptions;
		automationFilters?: AutomationFilters;
		automationConfig?: GameInstanceAutomationConfig;
		discoveredAbilities?: string[];
		discoveredBlessingStats?: string[];
		redditApiCache?: RedditAPICache[];
	};
}

/**
 * Export all extension data for complete backup
 */
export async function exportAllData(): Promise<string> {
	return new Promise((resolve, reject) => {
		// Get all data from storage
		chrome.storage.local.get(null, (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			// Get current username and extension version
			Promise.all([
				getCurrentRedditUser(),
				Promise.resolve(chrome.runtime.getManifest())
			]).then(([username, manifest]) => {
				// Validate manifest version
				if (!manifest.version) {
					reject(new Error('Extension manifest is missing version field'));
					return;
				}

				const backup: CompleteBackupData = {
					version: '1.0',
					extVersion: manifest.version,
					exportDate: Date.now(),
					username,
					data: {
						missions: result[STORAGE_KEYS.MISSIONS],
						userProgress: result[STORAGE_KEYS.USER_PROGRESS],
						userOptions: result[STORAGE_KEYS.USER_OPTIONS],
						automationFilters: result[STORAGE_KEYS.AUTOMATION_FILTERS],
						automationConfig: result[STORAGE_KEYS.AUTOMATION_CONFIG],
						discoveredAbilities: result.discoveredAbilities,
						discoveredBlessingStats: result.discoveredBlessingStats,
						redditApiCache: result[STORAGE_KEYS.REDDIT_API_CACHE],
					},
				};

				resolve(JSON.stringify(backup, null, 2));
			}).catch(reject);
		});
	});
}

/**
 * Import all extension data from complete backup
 */
export async function importAllData(jsonData: string): Promise<void> {
	return new Promise((resolve, reject) => {
		try {
			const backup: CompleteBackupData = JSON.parse(jsonData);

			// Validate backup structure
			if (!backup.version || !backup.data) {
				throw new Error('Invalid backup file format');
			}

			// Prepare data to restore
			const dataToRestore: Record<string, any> = {};

			if (backup.data.missions) {
				dataToRestore[STORAGE_KEYS.MISSIONS] = backup.data.missions;
			}
			if (backup.data.userProgress) {
				dataToRestore[STORAGE_KEYS.USER_PROGRESS] = backup.data.userProgress;
			}
			if (backup.data.userOptions) {
				dataToRestore[STORAGE_KEYS.USER_OPTIONS] = backup.data.userOptions;
			}
			if (backup.data.automationFilters) {
				dataToRestore[STORAGE_KEYS.AUTOMATION_FILTERS] = backup.data.automationFilters;
			}
			if (backup.data.automationConfig) {
				dataToRestore[STORAGE_KEYS.AUTOMATION_CONFIG] = backup.data.automationConfig;
			}
			if (backup.data.discoveredAbilities) {
				dataToRestore.discoveredAbilities = backup.data.discoveredAbilities;
			}
			if (backup.data.discoveredBlessingStats) {
				dataToRestore.discoveredBlessingStats = backup.data.discoveredBlessingStats;
			}
			if (backup.data.redditApiCache) {
				dataToRestore[STORAGE_KEYS.REDDIT_API_CACHE] = backup.data.redditApiCache;
			}

			// Restore all data
			chrome.storage.local.set(dataToRestore, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					resolve();
				}
			});
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Get automation filters from Chrome storage with default initialization
 * This is the single source of truth for filter defaults and retrieval
 */

import { AutomationFilters, DEFAULT_AUTOMATION_FILTERS, STORAGE_KEYS } from './storageTypes';

/**
 * Get automation filters from storage, initializing defaults if none exist
 */
export async function getAutomationFilters(): Promise<AutomationFilters> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get([STORAGE_KEYS.AUTOMATION_FILTERS], async (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			// If filters don't exist in storage, initialize with defaults
			if (!result[STORAGE_KEYS.AUTOMATION_FILTERS]) {
				try {
					await setAutomationFilters(DEFAULT_AUTOMATION_FILTERS);
					resolve(DEFAULT_AUTOMATION_FILTERS);
				} catch (error) {
					reject(error);
				}
				return;
			}

			// Merge with defaults to ensure all fields are present
			const filters: AutomationFilters = {
				...DEFAULT_AUTOMATION_FILTERS,
				...result[STORAGE_KEYS.AUTOMATION_FILTERS],
			};

			resolve(filters);
		});
	});
}

/**
 * Set automation filters in storage
 */
export async function setAutomationFilters(filters: AutomationFilters): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set({ [STORAGE_KEYS.AUTOMATION_FILTERS]: filters }, () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

/**
 * Update specific filter properties
 */
export async function updateAutomationFilters(
	updates: Partial<AutomationFilters>,
): Promise<void> {
	const currentFilters = await getAutomationFilters();
	const updatedFilters = { ...currentFilters, ...updates };
	await setAutomationFilters(updatedFilters);
}

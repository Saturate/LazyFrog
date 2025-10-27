/**
 * User options storage functions
 */

import { UserOptions, STORAGE_KEYS } from './types';

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

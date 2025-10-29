/**
 * User progress tracking operations
 * Manages cleared status, loot, and disabled missions separately from mission data
 * Progress is scoped per Reddit user, with "default" for non-logged-in users
 */

import { UserProgressData, MultiUserProgressDatabase, STORAGE_KEYS } from './types';
import { getCurrentRedditUser } from '../reddit/userDetection';

/**
 * Get empty progress data structure
 */
function createEmptyProgressData(): UserProgressData {
	return {
		cleared: [],
		disabled: [],
		clearedAt: {},
		loot: {},
	};
}

/**
 * Get the entire multi-user progress structure from storage
 */
async function getMultiUserProgress(): Promise<MultiUserProgressDatabase> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get([STORAGE_KEYS.USER_PROGRESS], (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(result[STORAGE_KEYS.USER_PROGRESS] || {});
			}
		});
	});
}

/**
 * Set the entire multi-user progress structure to storage
 */
async function setMultiUserProgress(data: MultiUserProgressDatabase): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set({ [STORAGE_KEYS.USER_PROGRESS]: data }, () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

/**
 * Check if a mission is cleared
 */
export async function isMissionCleared(postId: string): Promise<boolean> {
	const progress = await getAllUserProgress();
	return progress.cleared.includes(postId);
}

/**
 * Check if a mission is disabled
 */
export async function isMissionDisabled(postId: string): Promise<boolean> {
	const progress = await getAllUserProgress();
	return progress.disabled.includes(postId);
}

/**
 * Get all user progress for the current user
 */
export async function getAllUserProgress(): Promise<UserProgressData> {
	const username = await getCurrentRedditUser();
	const multiUserData = await getMultiUserProgress();
	return multiUserData[username] || createEmptyProgressData();
}

/**
 * Mark a mission as cleared
 */
export async function markMissionCleared(postId: string): Promise<void> {
	const username = await getCurrentRedditUser();
	const multiUserData = await getMultiUserProgress();

	// Get or create user's progress
	const userProgress = multiUserData[username] || createEmptyProgressData();

	// Add to cleared array if not already there
	if (!userProgress.cleared.includes(postId)) {
		userProgress.cleared.push(postId);
	}

	// Record clear timestamp
	userProgress.clearedAt[postId] = Date.now();

	// Update multi-user structure
	multiUserData[username] = userProgress;

	// Save back to storage
	await setMultiUserProgress(multiUserData);
}

/**
 * Mark a mission as disabled (e.g., deleted post)
 */
export async function setMissionDisabled(postId: string, disabled: boolean): Promise<void> {
	const username = await getCurrentRedditUser();
	const multiUserData = await getMultiUserProgress();

	// Get or create user's progress
	const userProgress = multiUserData[username] || createEmptyProgressData();

	if (disabled) {
		// Add to disabled array if not already there
		if (!userProgress.disabled.includes(postId)) {
			userProgress.disabled.push(postId);
		}
	} else {
		// Remove from disabled array
		const index = userProgress.disabled.indexOf(postId);
		if (index > -1) {
			userProgress.disabled.splice(index, 1);
		}
	}

	// Update multi-user structure
	multiUserData[username] = userProgress;

	// Save back to storage
	await setMultiUserProgress(multiUserData);
}

/**
 * Accumulate loot for a mission
 */
export async function accumulateMissionLoot(
	postId: string,
	newLoot: Array<{ id: string; quantity: number }>,
): Promise<void> {
	const username = await getCurrentRedditUser();
	const multiUserData = await getMultiUserProgress();

	// Get or create user's progress
	const userProgress = multiUserData[username] || createEmptyProgressData();

	// Get existing loot for this mission
	const totalLoot = userProgress.loot[postId] || [];

	// Accumulate loot
	for (const item of newLoot) {
		const existingItem = totalLoot.find((l) => l.id === item.id);
		if (existingItem) {
			existingItem.quantity += item.quantity;
		} else {
			totalLoot.push({ ...item });
		}
	}

	// Update loot
	userProgress.loot[postId] = totalLoot;

	// Update multi-user structure
	multiUserData[username] = userProgress;

	// Save back to storage
	await setMultiUserProgress(multiUserData);
}

/**
 * Clear all user progress for the current user (useful for starting fresh)
 */
export async function clearAllUserProgress(): Promise<void> {
	const username = await getCurrentRedditUser();
	const multiUserData = await getMultiUserProgress();

	// Clear current user's progress
	multiUserData[username] = createEmptyProgressData();

	// Save back to storage
	await setMultiUserProgress(multiUserData);
}

/**
 * Export user progress for backup/transfer (current user only)
 */
export async function exportUserProgress(): Promise<string> {
	const progress = await getAllUserProgress();
	const username = await getCurrentRedditUser();
	return JSON.stringify({ username, progress }, null, 2);
}

/**
 * Validate that the imported data has the required UserProgressData structure
 */
function isValidUserProgressData(data: any): data is UserProgressData {
	return (
		data &&
		typeof data === 'object' &&
		Array.isArray(data.cleared) &&
		Array.isArray(data.disabled) &&
		typeof data.clearedAt === 'object' &&
		typeof data.loot === 'object'
	);
}

/**
 * Import user progress from backup (for current user)
 */
export async function importUserProgress(jsonData: string): Promise<void> {
	const data = JSON.parse(jsonData);
	const progress = data.progress || data; // Support both old and new formats

	// Validate the structure
	if (!isValidUserProgressData(progress)) {
		throw new Error(
			'Invalid progress data structure. Expected object with arrays: cleared, disabled, and objects: clearedAt, loot',
		);
	}

	const username = await getCurrentRedditUser();
	const multiUserData = await getMultiUserProgress();

	// Set current user's progress
	multiUserData[username] = progress;

	// Save back to storage
	await setMultiUserProgress(multiUserData);
}

/**
 * Export all users' progress (admin/debug function)
 */
export async function exportAllUsersProgress(): Promise<string> {
	const multiUserData = await getMultiUserProgress();
	return JSON.stringify(multiUserData, null, 2);
}

/**
 * Get progress for a specific user (useful for switching contexts or admin)
 */
export async function getUserProgressForUser(username: string): Promise<UserProgressData> {
	const multiUserData = await getMultiUserProgress();
	return multiUserData[username] || createEmptyProgressData();
}

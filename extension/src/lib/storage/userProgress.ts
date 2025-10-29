/**
 * User progress tracking operations
 * Manages cleared status, loot, and disabled missions separately from mission data
 * Progress is scoped per Reddit user, with "default" for non-logged-in users
 */

import { UserMissionProgress, UserProgressDatabase, MultiUserProgressDatabase, STORAGE_KEYS } from './types';
import { getCurrentRedditUser } from '../reddit/userDetection';

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
 * Get user progress for a specific mission
 */
export async function getUserProgress(postId: string): Promise<UserMissionProgress | null> {
	const allProgress = await getAllUserProgress();
	return allProgress[postId] || null;
}

/**
 * Get all user progress for the current user
 */
export async function getAllUserProgress(): Promise<UserProgressDatabase> {
	const username = await getCurrentRedditUser();
	const multiUserData = await getMultiUserProgress();
	return multiUserData[username] || {};
}

/**
 * Update user progress for a mission (for current user)
 */
export async function updateUserProgress(
	postId: string,
	progress: Partial<UserMissionProgress>,
): Promise<void> {
	const username = await getCurrentRedditUser();
	const multiUserData = await getMultiUserProgress();

	// Get or create user's progress database
	const userProgress = multiUserData[username] || {};
	const existing = userProgress[postId] || { postId };

	// Merge progress
	userProgress[postId] = { ...existing, ...progress };

	// Update multi-user structure
	multiUserData[username] = userProgress;

	// Save back to storage
	await setMultiUserProgress(multiUserData);
}

/**
 * Mark a mission as cleared
 */
export async function markMissionCleared(postId: string): Promise<void> {
	return updateUserProgress(postId, {
		cleared: true,
		clearedAt: Date.now(),
	});
}

/**
 * Mark a mission as disabled (e.g., deleted post)
 */
export async function setMissionDisabled(postId: string, disabled: boolean): Promise<void> {
	return updateUserProgress(postId, { disabled });
}

/**
 * Accumulate loot for a mission
 */
export async function accumulateMissionLoot(
	postId: string,
	newLoot: Array<{ id: string; quantity: number }>,
): Promise<void> {
	const progress = await getUserProgress(postId);
	const existingLoot = progress?.totalLoot || [];

	// Merge loot quantities
	const lootMap = new Map<string, number>();
	for (const item of existingLoot) {
		lootMap.set(item.id, item.quantity);
	}
	for (const item of newLoot) {
		const current = lootMap.get(item.id) || 0;
		lootMap.set(item.id, current + item.quantity);
	}

	// Convert back to array
	const totalLoot = Array.from(lootMap.entries()).map(([id, quantity]) => ({ id, quantity }));

	return updateUserProgress(postId, { totalLoot });
}

/**
 * Clear all user progress for the current user (useful for starting fresh)
 */
export async function clearAllUserProgress(): Promise<void> {
	const username = await getCurrentRedditUser();
	const multiUserData = await getMultiUserProgress();

	// Clear current user's progress
	multiUserData[username] = {};

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
 * Import user progress from backup (for current user)
 */
export async function importUserProgress(jsonData: string): Promise<void> {
	const data = JSON.parse(jsonData);
	const progress = data.progress || data; // Support both old and new formats

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
export async function getUserProgressForUser(username: string): Promise<UserProgressDatabase> {
	const multiUserData = await getMultiUserProgress();
	return multiUserData[username] || {};
}

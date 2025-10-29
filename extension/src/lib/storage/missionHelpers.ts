/**
 * Helper functions for working with missions and user progress
 */

import type { MissionRecord, MissionWithProgress, UserProgressDatabase } from './types';
import { getAllMissions } from './missions';
import { getAllUserProgress } from './userProgress';

/**
 * Merge mission data with user progress
 */
export function mergeMissionWithProgress(
	mission: MissionRecord,
	progress?: { cleared?: boolean; clearedAt?: number; disabled?: boolean; totalLoot?: any },
): MissionWithProgress {
	return {
		...mission,
		...(progress || {}),
	};
}

/**
 * Get all missions with their progress data merged
 */
export async function getAllMissionsWithProgress(): Promise<Record<string, MissionWithProgress>> {
	const [missions, progress] = await Promise.all([getAllMissions(), getAllUserProgress()]);

	const merged: Record<string, MissionWithProgress> = {};

	for (const postId in missions) {
		merged[postId] = mergeMissionWithProgress(missions[postId], progress[postId]);
	}

	return merged;
}

/**
 * Get a single mission with progress
 */
export async function getMissionWithProgress(postId: string): Promise<MissionWithProgress | null> {
	const missions = await getAllMissionsWithProgress();
	return missions[postId] || null;
}

/**
 * Filter missions by criteria, including progress fields
 */
export async function filterMissions(
	filter: {
		stars?: number[];
		minLevel?: number;
		maxLevel?: number;
		environment?: string;
		cleared?: boolean;
		disabled?: boolean;
	},
): Promise<MissionWithProgress[]> {
	const allMissions = await getAllMissionsWithProgress();
	const missions = Object.values(allMissions);

	return missions.filter((mission) => {
		// Filter by difficulty (stars)
		if (filter.stars && mission.difficulty && !filter.stars.includes(mission.difficulty)) {
			return false;
		}

		// Filter by level range
		if (filter.minLevel !== undefined && mission.maxLevel !== undefined && mission.maxLevel < filter.minLevel) {
			return false;
		}
		if (filter.maxLevel !== undefined && mission.minLevel !== undefined && mission.minLevel > filter.maxLevel) {
			return false;
		}

		// Filter by environment
		if (filter.environment && mission.environment !== filter.environment) {
			return false;
		}

		// Filter by cleared status
		if (filter.cleared !== undefined && mission.cleared !== filter.cleared) {
			return false;
		}

		// Filter by disabled status
		if (filter.disabled !== undefined && mission.disabled !== filter.disabled) {
			return false;
		}

		return true;
	});
}

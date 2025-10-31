/**
 * Helper functions for filtering missions based on user progress
 * No more merging - just filtering missions based on progress arrays
 */

import type { MissionRecord } from '@lazyfrog/types';
import { getAllMissions } from './missions';
import { getAllUserProgress } from './userProgress';

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
): Promise<MissionRecord[]> {
	const [missions, progress] = await Promise.all([getAllMissions(), getAllUserProgress()]);
	const missionArray = Object.values(missions);

	return missionArray.filter((mission) => {
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
		if (filter.cleared !== undefined) {
			const isCleared = progress.cleared.includes(mission.postId);
			if (isCleared !== filter.cleared) {
				return false;
			}
		}

		// Filter by disabled status
		if (filter.disabled !== undefined) {
			const isDisabled = progress.disabled.includes(mission.postId);
			if (isDisabled !== filter.disabled) {
				return false;
			}
		}

		return true;
	});
}

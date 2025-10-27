/**
 * Mission statistics functions
 */

import { getAllMissions } from './missions';
import { getAutomationFilters } from './getAutomationFilters';

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

	// Get current filters from storage (with defaults initialization)
	const currentFilters = await getAutomationFilters();

	// Calculate basic stats
	const cleared = missionArray.filter((m) => m.cleared).length;
	const uncleared = missionArray.filter((m) => !m.cleared && !m.disabled).length;

	// Today's cleared missions (last 24 hours)
	const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
	const todayCleared = missionArray.filter(
		(m) => m.cleared && m.clearedAt && m.clearedAt > oneDayAgo,
	).length;

	// Queued missions (uncleared + matching filters + complete data)
	const queued = missionArray.filter((m) => {
		if (m.cleared) return false;
		if (m.disabled) return false;

		// CRITICAL: Mission must have complete data (difficulty and level range)
		if ((m.difficulty ?? 0) === 0) return false;
		if (m.minLevel === undefined || m.maxLevel === undefined) return false;

		// Star difficulty filter
		if (currentFilters.stars && currentFilters.stars.length > 0) {
			if (!currentFilters.stars.includes(m.difficulty || 0)) {
				return false;
			}
		}

		// Level range filter
		if (currentFilters.minLevel !== undefined) {
			if (m.minLevel < currentFilters.minLevel) {
				return false;
			}
		}

		if (currentFilters.maxLevel !== undefined) {
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

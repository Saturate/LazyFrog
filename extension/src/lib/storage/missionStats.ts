/**
 * Mission statistics functions
 */

import { getAllMissions } from './missions';
import { getAllMissionsWithProgress } from './missionHelpers';
import { getAutomationFilters } from './getAutomationFilters';
import { getFilteredUnclearedMissions } from './missionQueries';

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
	const missionsWithProgress = await getAllMissionsWithProgress();
	const missionArray = Object.values(missionsWithProgress);

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

	// Queued missions - use the same logic as mission automation
	const queuedMissions = await getFilteredUnclearedMissions(currentFilters);
	const queued = queuedMissions.length;

	return {
		queued,
		total: Object.keys(missions).length,
		cleared,
		uncleared,
		todayCleared,
	};
}

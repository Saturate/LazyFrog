/**
 * Mission statistics functions
 */

import { getAllMissions } from './missions';
import { getAllUserProgress } from './userProgress';
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
	const [missions, progress] = await Promise.all([getAllMissions(), getAllUserProgress()]);
	const missionArray = Object.values(missions);

	// Get current filters from storage (with defaults initialization)
	const currentFilters = await getAutomationFilters();

	// Calculate basic stats
	const cleared = progress.cleared.length;
	const uncleared = missionArray.filter(
		(m) => !progress.cleared.includes(m.postId) && !progress.disabled.includes(m.postId),
	).length;

	// Today's cleared missions (last 24 hours)
	const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
	const todayCleared = progress.cleared.filter((postId) => {
		const clearedAt = progress.clearedAt[postId];
		return clearedAt && clearedAt > oneDayAgo;
	}).length;

	console.log('[getMissionStats] Stats debug:', {
		totalMissions: Object.keys(missions).length,
		cleared,
		uncleared,
		todayCleared,
		sampleCleared: progress.cleared.slice(0, 3).map((postId) => ({
			postId,
			clearedAt: progress.clearedAt[postId],
		})),
	});

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

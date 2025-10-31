/**
 * Utility functions for counting enemies in missions
 */

import { MissionRecord } from '@lazyfrog/types';

/**
 * Count total enemies in a single mission
 * @param mission The mission record to count enemies for
 * @returns Total number of enemies in the mission
 */
export function countEnemiesInMission(mission: MissionRecord): number {
	if (!mission.encounters) {
		return 0;
	}

	let totalEnemies = 0;

	for (const encounter of mission.encounters) {
		if (encounter.type === 'enemy' && encounter.enemies) {
			totalEnemies += encounter.enemies.length;
		}
	}

	return totalEnemies;
}

/**
 * Calculate enemy statistics for a collection of missions
 * @param missions Array of mission records
 * @returns Enemy statistics including total, average, and distribution
 */
export function calculateEnemyStats(missions: MissionRecord[]) {
	if (missions.length === 0) {
		return {
			totalEnemies: 0,
			averageEnemies: 0,
			maxEnemies: 0,
			minEnemies: 0,
			missionsWithEnemies: 0,
			missionsWithoutEnemies: 0,
		};
	}

	const enemyCounts = missions.map(countEnemiesInMission);
	const totalEnemies = enemyCounts.reduce((sum, count) => sum + count, 0);
	const averageEnemies = totalEnemies / missions.length;
	const maxEnemies = Math.max(...enemyCounts);
	const minEnemies = Math.min(...enemyCounts);
	const missionsWithEnemies = enemyCounts.filter((count) => count > 0).length;
	const missionsWithoutEnemies = missions.length - missionsWithEnemies;

	return {
		totalEnemies,
		averageEnemies: Math.round(averageEnemies * 10) / 10, // Round to 1 decimal place
		maxEnemies,
		minEnemies,
		missionsWithEnemies,
		missionsWithoutEnemies,
	};
}

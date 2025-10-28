/**
 * Mission query and filtering functions
 */

import { MissionRecord, AutomationFilters } from './types';
import { getAllMissions } from './missions';

/**
 * Get mission count
 */
export async function getMissionCount(): Promise<number> {
	const missions = await getAllMissions();
	return Object.keys(missions).length;
}

/**
 * Search missions by criteria
 */
export async function searchMissions(criteria: {
	difficulty?: number;
	environment?: string;
	minLevel?: number;
	maxLevel?: number;
}): Promise<MissionRecord[]> {
	const missions = await getAllMissions();
	const results: MissionRecord[] = [];

	for (const mission of Object.values(missions)) {
		let matches = true;

		if (criteria.difficulty !== undefined && mission.difficulty !== criteria.difficulty) {
			matches = false;
		}
		if (criteria.environment !== undefined && mission.environment !== criteria.environment) {
			matches = false;
		}
		if (criteria.minLevel !== undefined && mission.minLevel !== criteria.minLevel) {
			matches = false;
		}
		if (criteria.maxLevel !== undefined && mission.maxLevel !== criteria.maxLevel) {
			matches = false;
		}

		if (matches) {
			results.push(mission);
		}
	}

	return results;
}

/**
 * Get filtered and sorted uncleared missions.
 * This is the single source of truth for mission filtering across the app.
 *
 * @param filters - Optional filters for stars, minLevel, maxLevel
 * @returns Array of missions that match filters, sorted newest first
 */
export async function getFilteredUnclearedMissions(filters?: {
	stars?: number[];
	minLevel?: number;
	maxLevel?: number;
}): Promise<MissionRecord[]> {
	const missions = await getAllMissions();

	// Check if all star difficulties are selected OR if no star filter is provided
	const allStarsSelected = !filters?.stars ||
		(filters.stars.length === 5 && [1, 2, 3, 4, 5].every(d => filters.stars!.includes(d)));

	let unclearedMissions = Object.values(missions).filter(
		(m) =>
			!m.cleared &&
			!m.disabled &&
			m.minLevel !== undefined &&
			m.maxLevel !== undefined &&
			// If all stars selected or no star filter, include missions with null difficulty
			(allStarsSelected || ((m.difficulty ?? 0) > 0)),
	); // Only return missions with complete data (level range, and optionally difficulty)

	// Apply filters if provided
	if (filters) {
		unclearedMissions = unclearedMissions.filter((m) => {
			// Note: minLevel and maxLevel are already guaranteed to be defined by the initial filter above

			// Star difficulty filter
			if (filters.stars && filters.stars.length > 0) {
				// If all stars selected, include missions regardless of difficulty (including null)
				if (allStarsSelected) {
					// No filtering needed - include all
				} else if (!filters.stars.includes(m.difficulty || 0)) {
					return false;
				}
			}

			// Level range filter
			// A mission is suitable only if it is ENTIRELY within the filter range
			// Mission range: [m.minLevel, m.maxLevel]
			// Filter range: [filters.minLevel, filters.maxLevel]
			// Mission must satisfy: m.minLevel >= filters.minLevel AND m.maxLevel <= filters.maxLevel
			// Note: minLevel and maxLevel are guaranteed to be defined by initial filter
			if (filters.minLevel !== undefined) {
				if (m.minLevel! < filters.minLevel) {
					return false;
				}
			}

			if (filters.maxLevel !== undefined) {
				if (m.maxLevel! > filters.maxLevel) {
					return false;
				}
			}

			return true;
		});
	}

	// Sort by timestamp (newest first)
	unclearedMissions.sort((a, b) => b.timestamp - a.timestamp);

	return unclearedMissions;
}

/**
 * Get next uncleared mission matching filters
 */
export async function getNextUnclearedMission(filters?: {
	stars?: number[];
	minLevel?: number;
	maxLevel?: number;
	excludePostIds?: string[];
}): Promise<MissionRecord | null> {
	const unclearedMissions = await getFilteredUnclearedMissions(filters);

	// Log for debugging
	console.log('[getNextUnclearedMission] Found uncleared missions', {
		count: unclearedMissions.length,
		excludePostIds: filters?.excludePostIds,
		firstFew: unclearedMissions.slice(0, 3).map(m => ({
			postId: m.postId,
			cleared: m.cleared,
			title: m.missionTitle?.substring(0, 30)
		}))
	});

	// Filter out excluded missions
	const filteredMissions = filters?.excludePostIds
		? unclearedMissions.filter(m => !filters.excludePostIds!.includes(m.postId))
		: unclearedMissions;

	console.log('[getNextUnclearedMission] After exclusion', {
		count: filteredMissions.length,
		nextMission: filteredMissions[0] ? {
			postId: filteredMissions[0].postId,
			cleared: filteredMissions[0].cleared,
			title: filteredMissions[0].missionTitle?.substring(0, 30)
		} : null
	});

	return filteredMissions[0] || null;
}

/**
 * Get next N uncleared missions matching filters
 */
export async function getNextMissions(
	count: number,
	filters?: {
		stars?: number[];
		minLevel?: number;
		maxLevel?: number;
	},
): Promise<MissionRecord[]> {
	const unclearedMissions = await getFilteredUnclearedMissions(filters);
	return unclearedMissions.slice(0, count);
}

/**
 * Get all uncleared missions
 */
export async function getUnclearedMissions(): Promise<MissionRecord[]> {
	const missions = await getAllMissions();
	return Object.values(missions)
		.filter((m) => !m.cleared && !m.disabled)
		.sort((a, b) => a.timestamp - b.timestamp); // Oldest first
}

/**
 * Export missions with complete data in database format
 */

import type { MissionRecord } from '@lazyfrog/types';

/**
 * Export missions that have complete data in the format needed for the database
 * @param missions - Array of mission records
 * @returns Count of exported missions, or 0 if none are complete
 */
export function exportMissionsForDB(missions: MissionRecord[]): number {
	// Filter missions that have complete data (required for DB)
	const completeMissions = missions.filter(
		(m) => m.encounters && m.encounters.length > 0 && m.difficulty && m.environment && m.foodName
	);

	if (completeMissions.length === 0) {
		alert('No missions with complete data found. Browse missions to capture their data via RenderPostContent API.');
		return 0;
	}

	// Create DB format: { postId: MissionRecord }
	// Strip extension-specific fields (cleared, clearedAt, disabled, totalLoot)
	const dbExport: Record<string, any> = {};
	completeMissions.forEach((mission) => {
		// Create a clean copy without extension-specific fields
		const { cleared, clearedAt, disabled, totalLoot, ...cleanMission } = mission as any;
		dbExport[mission.postId] = cleanMission;
	});

	// Export as JSON
	const json = JSON.stringify(dbExport, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `missions-db-export-${Date.now()}.json`;
	a.click();
	URL.revokeObjectURL(url);

	return completeMissions.length;
}

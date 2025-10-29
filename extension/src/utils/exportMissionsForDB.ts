/**
 * Export missions with metadata in database format
 */

import type { MissionRecord } from '../lib/storage/types';

/**
 * Export missions that have metadata in the format needed for the database
 * @param missions - Array of mission records
 * @returns Count of exported missions, or 0 if none have metadata
 */
export function exportMissionsForDB(missions: MissionRecord[]): number {
	// Filter missions that have metadata
	const missionsWithMetadata = missions.filter((m) => m.metadata?.mission);

	if (missionsWithMetadata.length === 0) {
		alert('No missions with metadata found. Play missions to capture their data first.');
		return 0;
	}

	// Create DB format: { postId: MissionMetadata }
	const dbExport: Record<string, any> = {};
	missionsWithMetadata.forEach((mission) => {
		if (mission.metadata) {
			dbExport[mission.postId] = mission.metadata;
		}
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

	return missionsWithMetadata.length;
}

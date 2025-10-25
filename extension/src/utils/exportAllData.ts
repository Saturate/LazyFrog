import { VERSION } from './buildInfo';

/**
 * Export all extension data (missions, settings, etc.) to a JSON file
 */
export async function exportAllData(): Promise<void> {
	try {
		const storage = await chrome.storage.local.get(null);

		const data = {
			storage,
			exportedAt: new Date().toISOString(),
			version: VERSION,
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: 'application/json',
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `lazyfrog-export-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		throw new Error('Failed to export data: ' + error);
	}
}

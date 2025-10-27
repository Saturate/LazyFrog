/**
 * Storage statistics and utilities
 */

import { getMissionCount } from './missionQueries';

/**
 * Get storage usage stats
 */
export async function getStorageStats(): Promise<{
	bytesInUse: number;
	missionCount: number;
}> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				getMissionCount().then((missionCount) => {
					resolve({ bytesInUse, missionCount });
				});
			}
		});
	});
}

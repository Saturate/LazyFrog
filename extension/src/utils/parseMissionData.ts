import { redditLogger } from './logger';

export interface MissionData {
	postId: string;
	difficulty?: number; // Star rating (1-5)
	minLevel?: number;
	maxLevel?: number;
	environment?: string;
	foodName?: string;
	foodImage?: string;
	authorName?: string;
	title?: string;
}

/**
 * Parse protobuf response to extract mission data
 * Protocol buffers use varint encoding, this is a simplified parser
 */
export function parseMissionData(arrayBuffer: ArrayBuffer, postId: string): MissionData | null {
	try {
		const uint8Array = new Uint8Array(arrayBuffer);
		const text = new TextDecoder().decode(uint8Array);

		const data: MissionData = { postId };

		// Extract difficulty (star rating) - try different offsets for robustness
		const diffIndex = text.indexOf('difficulty');
		if (diffIndex >= 0) {
			// Try multiple offsets to find the right one (more robust approach)
			const offsets = [10, 11, 12, 13, 14, 15, 16, 17, 18];
			for (const offset of offsets) {
				if (diffIndex + offset + 8 <= arrayBuffer.byteLength) {
					try {
						const dataView = new DataView(arrayBuffer, diffIndex + offset, 8);
						const difficultyValue = dataView.getFloat64(0, true);
						// Valid difficulty should be 1-5
						if (difficultyValue >= 1 && difficultyValue <= 5) {
							data.difficulty = Math.round(difficultyValue);
							break;
						}
					} catch (e) {
						// Continue trying other offsets
					}
				}
			}
		}

		// Extract minLevel - try multiple offsets for robustness
		const minIndex = text.indexOf('minLevel');
		if (minIndex >= 0) {
			const offsets = [8, 10, 12, 14, 16, 18, 20];
			for (const offset of offsets) {
				if (minIndex + offset + 8 <= arrayBuffer.byteLength) {
					try {
						const dataView = new DataView(arrayBuffer, minIndex + offset, 8);
						const minLevelValue = dataView.getFloat64(0, true);
						// Valid minLevel should be >= 1 and <= 340 (max game level)
						if (minLevelValue >= 1 && minLevelValue <= 340) {
							data.minLevel = Math.round(minLevelValue);
							break;
						}
					} catch (e) {
						// Continue trying other offsets
					}
				}
			}
		}

		// Extract maxLevel - try multiple offsets for robustness
		const maxIndex = text.indexOf('maxLevel');
		if (maxIndex >= 0) {
			const offsets = [8, 10, 12, 14, 16, 18, 20];
			for (const offset of offsets) {
				if (maxIndex + offset + 8 <= arrayBuffer.byteLength) {
					try {
						const dataView = new DataView(arrayBuffer, maxIndex + offset, 8);
						const maxLevelValue = dataView.getFloat64(0, true);
						// Valid maxLevel should be >= 1 and <= 340 (max game level)
						if (maxLevelValue >= 1 && maxLevelValue <= 340) {
							data.maxLevel = Math.round(maxLevelValue);
							break;
						}
					} catch (e) {
						// Continue trying other offsets
					}
				}
			}
		}

		// Extract environment (e.g., "mossy_forest")
		const envMatch = text.match(/environment[\x00-\x1f]*([a-z_]+)/);
		if (envMatch) {
			data.environment = envMatch[1];
		}

		// Extract foodName (e.g., "Smoked Kielbasa")
		const foodNameMatch = text.match(/foodName[\x00-\x1f]*([A-Za-z0-9 ]+)/);
		if (foodNameMatch) {
			data.foodName = foodNameMatch[1].trim();
		}

		// Extract authorName
		const authorMatch = text.match(/authorName[\x00-\x1f]*([a-zA-Z0-9_-]+)/);
		if (authorMatch) {
			data.authorName = authorMatch[1];
		}

		// Extract title
		const titleIndex = text.indexOf('title');
		if (titleIndex >= 0) {
			// Look for the title text after the protobuf field markers
			// The pattern is: title + protobuf markers + actual title text
			const afterTitle = text.substring(titleIndex + 5); // Skip 'title'
			// The title text starts after the protobuf markers \x12&\x1a$
			// Find the first newline after the title text
			const titleStart = 4; // After \x12&\x1a$
			const titleEnd = afterTitle.indexOf('\n', titleStart);
			if (titleEnd > titleStart) {
				data.title = afterTitle.substring(titleStart, titleEnd).trim();
			}
		}

		redditLogger.log('Parsed mission data from API', {
			postId,
			difficulty: data.difficulty,
			minLevel: data.minLevel,
			maxLevel: data.maxLevel,
			foodName: data.foodName,
		});

		return data;
	} catch (error) {
		redditLogger.error('Failed to parse mission data', {
			error: error instanceof Error ? error.message : String(error),
			postId,
		});
		return null;
	}
}

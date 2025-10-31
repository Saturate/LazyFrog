import { redditLogger } from './logger';
import { UIResponse } from '@devvit/protos/types/devvit/ui/block_kit/v1beta/ui.js';

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
	isInnPost?: boolean; // Mission completion status
	encounters?: any[]; // Encounter/enemy data for the mission
	// Additional mission fields from state
	authorWeaponId?: string;
	chef?: string;
	cart?: string;
	rarity?: string;
	type?: string;
}

/**
 * Parse protobuf response to extract mission data using official @devvit/protos decoder
 */
export function parseMissionData(arrayBuffer: ArrayBuffer, postId: string): MissionData | null {
	// Try new decoder with @devvit/protos
	try {
		// gRPC-web responses have a 5-byte header (1 byte flags + 4 bytes message length)
		// Skip it to get to the actual protobuf message
		let buffer = arrayBuffer;
		if (buffer.byteLength > 5) {
			buffer = buffer.slice(5);
		}

		// Decode using official UIResponse protobuf definition
		const uint8Array = new Uint8Array(buffer);
		const response = UIResponse.decode(uint8Array);
		const json = UIResponse.toJSON(response) as any;

		const data: MissionData = { postId };

		// Extract mission data from state hooks
		if (json.state) {
			// Debug: Log state keys to see what's available
			const stateKeys = Object.keys(json.state);
			redditLogger.debug(`Decoded UIResponse for ${postId}:`, json);

			// Look for mission data in useState-12 (or similar)
			for (const [key, value] of Object.entries(json.state)) {
				if (typeof value === 'object' && value !== null) {
					const stateValue = (value as any).value;
					if (stateValue && typeof stateValue === 'object') {
						// Check if this is the mission state hook
						if (stateValue.mission) {
							const mission = stateValue.mission;
							if (mission.difficulty !== undefined) {
								data.difficulty = Math.round(mission.difficulty);
							}
							if (mission.minLevel !== undefined) {
								data.minLevel = Math.round(mission.minLevel);
							}
							if (mission.maxLevel !== undefined) {
								data.maxLevel = Math.round(mission.maxLevel);
							}
							if (mission.environment) {
								data.environment = mission.environment;
							}
							if (mission.foodName) {
								data.foodName = mission.foodName;
							}
							if (mission.foodImage) {
								data.foodImage = mission.foodImage;
							}
							if (mission.authorWeaponId) {
								data.authorWeaponId = mission.authorWeaponId;
							}
							if (mission.chef) {
								data.chef = mission.chef;
							}
							if (mission.cart) {
								data.cart = mission.cart;
							}
							if (mission.rarity) {
								data.rarity = mission.rarity;
							}
							if (mission.type) {
								data.type = mission.type;
							}
							if (mission.encounters && Array.isArray(mission.encounters)) {
								data.encounters = mission.encounters;
							}
						}

						// Check if this is the isInnPost state hook
						if (stateValue.isInnPost !== undefined) {
							data.isInnPost = stateValue.isInnPost;
						}

						// Check if this is the authorName/title state hook
						if (stateValue.authorName) {
							data.authorName = stateValue.authorName;
						}
						if (stateValue.title) {
							data.title = stateValue.title;
						}

						// Check if this is the encounters state hook
						if (stateValue.encounters && Array.isArray(stateValue.encounters)) {
							data.encounters = stateValue.encounters;
							redditLogger.log(`Found ${stateValue.encounters.length} encounters in ${key}`, {
								encounters: stateValue.encounters,
							});
						}
					}
				}
			}
		} else {
			redditLogger.warn(`No state object found in UIResponse for ${postId}`);
		}

		redditLogger.log(`Parsed mission (${postId})`, data);
		return data;
	} catch (decoderError) {
		redditLogger.warn('UIResponse decoder failed, falling back to legacy parser', {
			error: decoderError instanceof Error ? decoderError.message : String(decoderError),
		});
	}

	// Fallback to legacy string-based parsing
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

		// Extract isInnPost (mission completion status)
		// Simplified: if we see the string 'isInnPost', it's an inn
		data.isInnPost = text.includes('isInnPost');

		redditLogger.log(`Parsed mission (${data.postId}) data from API`, {
			...data,
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

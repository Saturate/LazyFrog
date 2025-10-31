/**
 * Fetch mission data directly from Reddit's RenderPostContent API
 */

import { UIRequest, UIResponse } from '@devvit/protos/types/devvit/ui/block_kit/v1beta/ui.js';
import { redditLogger } from './logger';
import { MissionData } from './parseMissionData';

/**
 * Fetch mission data for a specific post ID
 * Uses the same RenderPostContent API that the game uses
 *
 * NOTE: This function needs to be called from a Reddit page context (content script)
 * to have access to the proper cookies and installation ID
 */
export async function fetchMissionDataByPostId(
	postId: string,
	installationId?: string
): Promise<MissionData | null> {
	try {
		redditLogger.log('Fetching mission data from API', { postId });

		const url = `https://devvit-gateway.reddit.com/devvit.reddit.custom_post.v1alpha.CustomPost/RenderPostContent`;

		// Get installation ID from context if available
		// This would need to be extracted from the page or stored
		const install = installationId || '7f2e80d7-6821-4a20-9405-05c3b43012ea'; // Default from sample

		const requestBody = createRenderPostContentRequest(postId);

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'accept': '*/*',
				'content-type': 'application/grpc-web+proto',
				'devvit-actor': 'main',
				'devvit-installation': install,
				'devvit-post': postId,
				'devvit-user-agent': 'Reddit;Shreddit;not-provided',
				'x-grpc-web': '1',
			},
			body: requestBody as any,
			credentials: 'include',
			mode: 'cors',
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		// Read the response
		const arrayBuffer = await response.arrayBuffer();

		// gRPC-web responses have a 5-byte header (1 byte flags + 4 bytes message length)
		// Skip it to get to the actual protobuf message
		let buffer = arrayBuffer;
		if (buffer.byteLength > 5) {
			buffer = buffer.slice(5);
		}

		// Decode using official UIResponse protobuf definition
		const uint8Array = new Uint8Array(buffer);
		const uiResponse = UIResponse.decode(uint8Array);
		const json = UIResponse.toJSON(uiResponse) as any;

		const data: MissionData = { postId };

		// Extract mission data from state hooks
		if (json.state) {
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
							redditLogger.log(`Found ${stateValue.encounters.length} encounters`, {
								encounters: stateValue.encounters,
							});
						}
					}
				}
			}
		}

		redditLogger.log('Successfully fetched mission data', data);
		return data;
	} catch (error) {
		redditLogger.error('Failed to fetch mission data from API', {
			error: error instanceof Error ? error.message : String(error),
			postId,
		});
		return null;
	}
}

/**
 * Create a protobuf request body for RenderPostContent
 * Encodes a UIRequest with the post ID in props
 */
function createRenderPostContentRequest(postId: string): Uint8Array {
	// Create a UIRequest with the post ID in props
	const request: UIRequest = {
		props: {
			postId,
		},
		state: {},
		events: [], // Empty for initial render
	};

	// Encode the UIRequest to protobuf
	const encoded = UIRequest.encode(request).finish();

	// gRPC-web requires a 5-byte header (1 byte flags + 4 bytes message length)
	const header = new Uint8Array(5);
	header[0] = 0; // flags (0 = no compression)
	const length = encoded.length;
	header[1] = (length >> 24) & 0xff;
	header[2] = (length >> 16) & 0xff;
	header[3] = (length >> 8) & 0xff;
	header[4] = length & 0xff;

	// Combine header and message
	const result = new Uint8Array(5 + encoded.length);
	result.set(header, 0);
	result.set(encoded, 5);

	return result;
}

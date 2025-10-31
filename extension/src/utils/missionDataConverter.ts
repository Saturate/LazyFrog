/**
 * Convert RenderPostContent MissionData to full MissionRecord
 */

import { MissionRecord } from '@lazyfrog/types';
import { MissionData } from './parseMissionData';
import { normalizeRedditPermalink } from './url';

/**
 * Convert MissionData from RenderPostContent to a complete MissionRecord
 * This allows us to save missions directly from the API without needing gameplay data
 */
export function convertMissionDataToRecord(data: MissionData): MissionRecord | null {
	// Validate required fields
	if (!data.difficulty || !data.minLevel || !data.maxLevel || !data.environment) {
		return null;
	}

	if (!data.encounters || data.encounters.length === 0) {
		return null;
	}

	// Build the complete MissionRecord (flat structure)
	const record: MissionRecord = {
		// Core identification
		postId: data.postId,
		timestamp: Date.now(),
		permalink: normalizeRedditPermalink(data.postId),

		// Mission metadata
		missionTitle: data.title || data.foodName || `Mission ${data.postId}`,
		missionAuthorName: data.authorName || 'Unknown',

		// Mission data (from game state)
		environment: data.environment as any,
		encounters: data.encounters,
		minLevel: data.minLevel,
		maxLevel: data.maxLevel,
		difficulty: data.difficulty,
		foodImage: data.foodImage || '',
		foodName: data.foodName || '',
		authorWeaponId: data.authorWeaponId || '',
		chef: data.chef || '',
		cart: data.cart || '',
		rarity: (data.rarity as any) || 'common',
		type: data.type,
	};

	return record;
}

/**
 * Check if MissionData has all required fields for a complete MissionRecord
 */
export function isCompleteMissionData(data: MissionData): boolean {
	return !!(
		data.difficulty &&
		data.minLevel &&
		data.maxLevel &&
		data.environment &&
		data.foodName &&
		data.encounters &&
		data.encounters.length > 0
	);
}

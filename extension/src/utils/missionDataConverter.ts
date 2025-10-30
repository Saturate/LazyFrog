/**
 * Convert RenderPostContent MissionData to full MissionRecord
 */

import { MissionRecord, MissionMetadata, Mission } from '../lib/storage/types';
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

	// Build the Mission object
	const mission: Mission = {
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

	// Build the MissionMetadata
	const metadata: MissionMetadata = {
		mission,
		missionAuthorName: data.authorName || 'Unknown',
		missionTitle: data.title || data.foodName || `Mission ${data.postId}`,
		enemyTauntData: [],
	};

	// Build the tags string for quick filtering
	const tags = `${data.difficulty}* | ${data.minLevel} - ${data.maxLevel} | ${data.environment} | ${data.foodName}`;

	// Build the complete MissionRecord
	const record: MissionRecord = {
		postId: data.postId,
		timestamp: Date.now(),
		metadata,
		permalink: normalizeRedditPermalink(data.postId),
		difficulty: data.difficulty,
		missionTitle: data.title || data.foodName || `Mission ${data.postId}`,
		minLevel: data.minLevel,
		maxLevel: data.maxLevel,
		environment: data.environment as any,
		foodName: data.foodName || '',
		tags,
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

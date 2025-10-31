/**
 * Mission Record Format Migration Utilities for DB Website
 * Handles backward compatibility with old nested metadata format
 */

import type { MissionRecord, Mission, MissionMetadata } from '@lazyfrog/types';

/**
 * Old nested format (deprecated)
 */
export interface LegacyMissionRecord {
	postId: string;
	timestamp: number;
	permalink: string;
	metadata?: MissionMetadata | null;
	difficulty?: number;
	missionTitle?: string;
	minLevel?: number;
	maxLevel?: number;
	environment?: string;
	foodName?: string;
}

/**
 * Detect if a mission record is in old nested format
 */
export function isLegacyFormat(record: any): record is LegacyMissionRecord {
	return record && typeof record === 'object' &&
		'metadata' in record &&
		record.metadata !== undefined;
}

/**
 * Convert old nested format to new flat format
 */
export function migrateLegacyRecord(legacy: LegacyMissionRecord): MissionRecord {
	const mission = legacy.metadata?.mission;

	// Build flat record from nested data
	const record: MissionRecord = {
		// Core identification
		postId: legacy.postId,
		timestamp: legacy.timestamp,
		permalink: legacy.permalink,

		// Mission metadata
		missionTitle: legacy.metadata?.missionTitle || legacy.missionTitle || `Mission ${legacy.postId.slice(3)}`,
		missionAuthorName: legacy.metadata?.missionAuthorName || 'Unknown',

		// Mission data (from nested mission object or top-level fields)
		environment: (mission?.environment || legacy.environment || 'haunted_forest') as any,
		encounters: mission?.encounters || [],
		minLevel: mission?.minLevel || legacy.minLevel || 1,
		maxLevel: mission?.maxLevel || legacy.maxLevel || 340,
		difficulty: mission?.difficulty || legacy.difficulty || 0,
		foodImage: mission?.foodImage || '',
		foodName: mission?.foodName || legacy.foodName || '',
		authorWeaponId: mission?.authorWeaponId || '',
		chef: mission?.chef || '',
		cart: mission?.cart || '',
		rarity: (mission?.rarity || 'common') as any,
		type: mission?.type,
	};

	return record;
}

/**
 * Normalize a mission record - converts legacy format if needed
 */
export function normalizeMissionRecord(record: any): MissionRecord {
	if (isLegacyFormat(record)) {
		return migrateLegacyRecord(record);
	}
	return record as MissionRecord;
}

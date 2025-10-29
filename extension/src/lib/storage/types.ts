/**
 * Storage types and interfaces for the extension
 *
 * Base mission types are imported from the shared @lazyfrog/types package.
 * This file only contains extension-specific types.
 */

import type {
	MissionRecord as BaseMissionRecord,
	MissionMetadata,
	Environment,
} from '@lazyfrog/types';

// Re-export all shared types except MissionRecord
export * from '@lazyfrog/types';

// Override MissionRecord for extension use - make derived fields optional
// since they may not be available until the mission is played
export interface MissionRecord extends Omit<BaseMissionRecord, 'metadata' | 'difficulty' | 'environment' | 'foodName' | 'tags'> {
	metadata?: MissionMetadata | null; // Optional until mission is played
	difficulty?: number; // Optional until metadata is captured
	environment?: Environment; // Optional until metadata is captured
	foodName?: string; // Optional until metadata is captured
	tags?: string; // Optional until metadata is captured
}

// ============================================================================
// Extension-Specific Types
// ============================================================================

/**
 * User progress data structure
 * Separates user-specific tracking from static mission data
 *
 * Benefits:
 * - Clean separation of static mission data vs user progress
 * - Easy export/import of user data
 */
export interface UserProgressData {
	/** Array of cleared mission post IDs */
	cleared: string[];
	/** Array of disabled mission post IDs */
	disabled: string[];
	/** Map of post ID to clear timestamp */
	clearedAt: Record<string, number>;
	/** Map of post ID to loot collected */
	loot: Record<string, Array<{ id: string; quantity: number }>>;
}

/**
 * Multi-user progress structure
 * Map of username to their progress data
 * Uses "default" for users who are not logged in
 */
export type MultiUserProgressDatabase = Record<string, UserProgressData>;

export interface RedditAPICache {
	postId: string;
	minLevel?: number;
	maxLevel?: number;
	title?: string;
	author?: string;
	timestamp: number;
}

export interface UserOptions {
	abilityTierList?: string[];
	blessingStatPriority?: string[];
	autoAcceptSkillBargains?: boolean;
	skillBargainStrategy?: 'always' | 'positive-only' | 'never';
	crossroadsStrategy?: 'fight' | 'skip';
	autoStartMissions?: boolean;
	showNotifications?: boolean;
}

export interface AutomationFilters {
	stars: number[];
	minLevel: number;
	maxLevel: number;
}

export const DEFAULT_AUTOMATION_FILTERS: AutomationFilters = {
	stars: [1, 2, 3, 4, 5],
	minLevel: 1,
	maxLevel: 340,
};

export const STORAGE_KEYS = {
	MISSIONS: 'missions', // Mission data (static, from database)
	USER_PROGRESS: 'userProgress', // User-specific progress tracking
	USER_OPTIONS: 'userOptions',
	AUTOMATION_FILTERS: 'automationFilters',
	AUTOMATION_CONFIG: 'automationConfig',
	REDDIT_API_CACHE: 'redditApiCache',
} as const;

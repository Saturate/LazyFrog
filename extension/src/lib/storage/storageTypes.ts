/**
 * Extension-specific storage types
 * For shared mission types, import from @lazyfrog/types
 */

/**
 * User progress data structure
 * Separates user-specific tracking from static mission data
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

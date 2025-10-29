/**
 * Storage types and interfaces
 *
 * Note: Base mission types are copied from db/types.ts to avoid
 * importing from outside the TypeScript rootDir
 */

// ============================================================================
// Base Mission Types (from db/types.ts)
// ============================================================================

export type EncounterType =
	| 'investigate'
	| 'statsChoice'
	| 'skillBargain'
	| 'abilityChoice'
	| 'enemy'
	| 'crossroads';

export type StatType = 'Attack' | 'Defense' | 'Health' | 'Speed' | 'Crit' | 'Dodge';
export type EffectType = 'multiplier' | 'ability';

export interface Effect {
	id: string;
	type: EffectType;
	stat?: StatType;
	amount?: number;
	abilityId?: string;
}

export interface InvestigateEncounter {
	type: 'investigate';
	bonusChance: number;
	bonusGold: number;
	failHpPenaltyPct: number;
	bonusResourceType?: string;
}

export interface StatsChoiceEncounter {
	type: 'statsChoice';
	optionA: Effect;
	optionB: Effect;
}

export interface SkillBargainEncounter {
	type: 'skillBargain';
	positiveEffect: Effect;
	negativeEffect: Effect;
}

export interface AbilityChoiceEncounter {
	type: 'abilityChoice';
	isEnchanted: boolean;
	optionA: Effect;
	optionB: Effect;
}

export interface Enemy {
	id: string;
	health: number;
	attack: number;
	speed: number;
	crit: number;
	dodge: number;
	defense: number;
	abilities?: string[];
	loot: Array<{ id: string; quantity: number }>;
	tier: number;
}

export interface EnemyEncounter {
	type: 'enemy';
	enemies: Enemy[];
}

export interface CrossroadsEncounter {
	type: 'crossroads';
	enemies: Enemy[];
}

export type Encounter =
	| InvestigateEncounter
	| StatsChoiceEncounter
	| SkillBargainEncounter
	| AbilityChoiceEncounter
	| EnemyEncounter
	| CrossroadsEncounter;

export type Environment =
	| 'haunted_forest'
	| 'new_eden'
	| 'wild_west'
	| 'jungle'
	| 'desert'
	| 'tundra'
	| 'underwater'
	| 'mountains';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Mission {
	environment: Environment;
	encounters: Encounter[];
	minLevel: number;
	maxLevel: number;
	difficulty: number;
	foodImage: string;
	foodName: string;
	authorWeaponId: string;
	chef: string;
	cart: string;
	rarity: Rarity;
}

export interface MissionMetadata {
	mission: Mission;
	missionAuthorName: string;
	missionTitle: string;
	enemyTauntData: any[];
}

export interface MissionRecord {
	postId: string;
	timestamp: number;
	missionTitle: string;
	minLevel: number;
	maxLevel: number;
	metadata?: MissionMetadata | null;
	permalink?: string;
	difficulty?: number | null;
	environment?: Environment;
	foodName?: string;
	tags?: string;
}

export type MissionsDatabase = Record<string, MissionRecord>;

/**
 * User-specific progress tracking for missions
 * Efficient array-based storage - only stores missions that have progress
 * Stored separately from mission data to allow:
 * - Multiple user profiles
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

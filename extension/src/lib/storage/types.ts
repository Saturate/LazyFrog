/**
 * Storage types and interfaces
 */

export interface MissionRecord {
	postId: string;
	username: string;
	timestamp: number;
	metadata: any;
	tags?: string;
	difficulty?: number;
	environment?: string;
	minLevel?: number;
	maxLevel?: number;
	missionTitle?: string;
	foodName?: string;
	cleared?: boolean;
	clearedAt?: number;
	permalink?: string;
	totalLoot?: Array<{ id: string; quantity: number }>;
	disabled?: boolean;
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
	MISSIONS: 'missions',
	USER_OPTIONS: 'userOptions',
	AUTOMATION_FILTERS: 'automationFilters',
	AUTOMATION_CONFIG: 'automationConfig',
} as const;

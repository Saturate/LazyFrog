/**
 * Type definitions for Sword & Supper Bot
 */

// Re-export shared types from the package
export type {
	EncounterType,
	Encounter,
	Mission,
	MissionMetadata,
	MissionRecord,
	ExtensionMissionRecord,
	Environment,
	Rarity,
} from '@lazyfrog/types';

export interface Level {
	title: string;
	href: string | null;
	postId?: string; // Reddit post ID (e.g., "t3_1obdqvw")
	author?: string; // Reddit username
	levelNumber: number | null; // Specific level number from title
	levelRange: string | null; // Flair like "Level 1-5", "Level 6-20"
	levelRangeMin: number | null;
	levelRangeMax: number | null;
	stars: number; // 1-5 star difficulty rating
	cleared: boolean;
	element?: Element;
}

export type StarRating = 1 | 2 | 3 | 4 | 5;

export interface LevelFilters {
	stars: number[]; // Array of star ratings to include (e.g., [1, 2] for 1-2 stars)
	minLevel: number;
	maxLevel: number;
}

export interface BotState {
	isRunning: boolean;
	completedLevels: string[];
	currentLevel: Level | null;
	filters: LevelFilters;
}

export interface Message {
	type: MessageType;
	[key: string]: any;
}

export type MessageType =
	| 'GET_STATE'
	| 'START_BOT'
	| 'STOP_BOT'
	| 'UPDATE_STATE'
	| 'LEVEL_COMPLETED'
	| 'LEVELS_FOUND'
	| 'NAVIGATE_TO_MISSION'
	| 'OPEN_MISSION_IFRAME'
	| 'START_MISSION_AUTOMATION'
	| 'STOP_MISSION_AUTOMATION'
	| 'AUTOMATION_READY'
	| 'START_EMULATE_MODE'
	| 'STATE_CHANGED'
	| 'CHECK_FOR_GAME_LOADER'
	| 'CHECK_GAME_DIALOG_STATUS'
	| 'CHECK_AUTOMATION_STATUS'
	| 'CLICK_GAME_UI'
	| 'GET_GAME_STATE'
	| 'GAME_STATE_UPDATE'
	| 'GAME_PREVIEW_FAILED'
	| 'FIND_NEXT_MISSION'
	| 'NAVIGATE_TO_URL'
	| 'FETCH_REDDIT_USERNAME'
	| 'FETCH_MISSION_DATA'
	| 'FETCH_MISSION_DATA_FROM_PAGE'
	| 'FETCH_MISSION_DATA_WITH_BODY'
	| 'GAME_LOADER_DETECTED'
	| 'GAME_DIALOG_OPENED'
	| 'MISSION_COMPLETED'
	| 'MISSION_DELETED'
	| 'MISSION_FOUND'
	| 'MISSION_PAGE_LOADED'
	| 'NO_MISSIONS_FOUND'
	| 'ERROR_OCCURRED'
	| 'MISSIONS_UPDATED'
	| 'MISSIONS_CHANGED'
	| 'PING';

export interface ChromeMessage extends Message {
	type: MessageType;
}

export interface StartBotMessage extends ChromeMessage {
	type: 'START_BOT';
}

export interface LevelsFoundMessage extends ChromeMessage {
	type: 'LEVELS_FOUND';
	levels: Level[];
}

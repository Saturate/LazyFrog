/**
 * Type definitions for Sword & Supper Bot
 */

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
  onlyIncomplete: boolean;
  autoProcess?: boolean;
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
  | 'GET_LEVELS'
  | 'START_PROCESSING'
  | 'STOP_PROCESSING'
  | 'PLAY_CURRENT_MISSION'
  | 'NAVIGATE_TO_MISSION'
  | 'OPEN_MISSION_IFRAME'
  | 'START_MISSION_AUTOMATION'
  | 'STOP_MISSION_AUTOMATION'
  | 'AUTOMATION_READY'
  | 'START_EMULATE_MODE'
  | 'STATUS_UPDATE';

export interface ChromeMessage extends Message {
  type: MessageType;
}

export interface GetLevelsMessage extends ChromeMessage {
  type: 'GET_LEVELS';
  filters: LevelFilters;
}

export interface StartBotMessage extends ChromeMessage {
  type: 'START_BOT';
  filters: LevelFilters;
}

export interface LevelsFoundMessage extends ChromeMessage {
  type: 'LEVELS_FOUND';
  levels: Level[];
}

export interface PlayCurrentMissionMessage extends ChromeMessage {
  type: 'PLAY_CURRENT_MISSION';
  config: any; // AutomationConfig
  filters?: LevelFilters;
}

export interface StatusUpdateMessage extends ChromeMessage {
  type: 'STATUS_UPDATE';
  status: string; // Status text to display
  missionId?: string; // Optional mission ID
  encounter?: { current: number; total: number }; // Optional encounter progress
}

/**
 * Shared Mission Type Definitions for LazyFrog
 *
 * These types define the structure of mission data used across:
 * - The mission database (db/missions.json)
 * - The browser extension
 * - The website
 */

// ============================================================================
// Mission Metadata - Game-specific data
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
  difficulty: number; // Star rating: 1-5
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
  enemyTauntData: any[]; // Usually empty, keeping for compatibility
  // scenarioText removed - not useful for automation
}

// ============================================================================
// Mission Record - Database format (no tracking fields)
// ============================================================================

/**
 * Base mission record stored in the database
 * Does not include tracking fields like cleared/clearedAt
 */
export interface MissionRecord {
  // Core identification
  postId: string; // Reddit post ID with 't3_' prefix
  timestamp: number; // When mission was first discovered

  // Mission data
  metadata: MissionMetadata;
  permalink: string; // Reddit URL to the mission post

  // Derived/cached fields (for quick filtering)
  difficulty: number; // 1-5 stars
  missionTitle: string;
  minLevel: number;
  maxLevel: number;
  environment: Environment;
  foodName: string;
  tags: string; // Human-readable summary: "2* | 121 - 140 | haunted_forest | Lemon Pistachio Swirl"
}

/**
 * Extended mission record used in the browser extension
 * Adds tracking fields for user progress
 */
export interface ExtensionMissionRecord extends MissionRecord {
  // Extension-only tracking fields
  cleared?: boolean; // Has this mission been completed?
  clearedAt?: number; // Timestamp when cleared
  disabled?: boolean; // Is this mission disabled (e.g., deleted post)?
  totalLoot?: Array<{ id: string; quantity: number }>; // Accumulated loot from runs
}

// ============================================================================
// Database Format
// ============================================================================

/**
 * The missions.json database is a map of postId to MissionRecord
 */
export type MissionsDatabase = Record<string, MissionRecord>;

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Filters for querying missions
 */
export interface MissionFilters {
  stars?: number[]; // Filter by difficulty (1-5)
  minLevel?: number;
  maxLevel?: number;
  environment?: Environment;
  cleared?: boolean;
  disabled?: boolean;
}

// ============================================================================
// Display Helpers
// ============================================================================

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  haunted_forest: 'Haunted Forest',
  new_eden: 'New Eden',
  wild_west: 'Wild West',
  jungle: 'Jungle',
  desert: 'Desert',
  tundra: 'Tundra',
  underwater: 'Underwater',
  mountains: 'Mountains',
};

export const ENCOUNTER_LABELS: Record<EncounterType, string> = {
  investigate: 'Hut',
  statsChoice: 'Stat Choice',
  skillBargain: 'Skill Bargain',
  abilityChoice: 'Ability Choice',
  enemy: 'Battle',
  crossroads: 'Miniboss',
};

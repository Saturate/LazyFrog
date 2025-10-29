/**
 * Shared validation utilities for mission database
 */

import type { MissionRecord } from '@lazyfrog/types';

// Required fields for a valid mission
export const REQUIRED_FIELDS = [
  'postId',
  'timestamp',
  'metadata',
  'permalink',
  'difficulty',
  'missionTitle',
  'minLevel',
  'maxLevel',
  'environment',
  'foodName',
  'tags',
] as const;

// Required metadata fields
export const REQUIRED_METADATA_FIELDS = [
  'mission',
  'missionAuthorName',
  'missionTitle',
] as const;

// Required mission fields (within metadata.mission)
export const REQUIRED_MISSION_FIELDS = [
  'environment',
  'encounters',
  'minLevel',
  'maxLevel',
  'difficulty',
  'foodImage',
  'foodName',
  'rarity',
] as const;

// Extension-specific fields to strip
export const EXTENSION_FIELDS = ['cleared', 'clearedAt', 'disabled', 'totalLoot'] as const;

// Fields to remove from metadata
export const METADATA_STRIP_FIELDS = ['scenarioText'] as const;

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a mission record has all required fields
 * @returns Array of validation errors (empty if valid)
 */
export function validateMission(mission: any, postId: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check required top-level fields
  for (const field of REQUIRED_FIELDS) {
    if (mission[field] === undefined || mission[field] === null) {
      errors.push({ field, message: `Missing required field: ${field}` });
    }
  }

  // Check metadata structure
  if (mission.metadata) {
    for (const field of REQUIRED_METADATA_FIELDS) {
      if (mission.metadata[field] === undefined || mission.metadata[field] === null) {
        errors.push({ field: `metadata.${field}`, message: `Missing metadata.${field}` });
      }
    }

    // Check mission within metadata
    if (mission.metadata.mission) {
      for (const field of REQUIRED_MISSION_FIELDS) {
        if (mission.metadata.mission[field] === undefined || mission.metadata.mission[field] === null) {
          errors.push({ field: `metadata.mission.${field}`, message: `Missing metadata.mission.${field}` });
        }
      }

      // Validate encounters array
      if (!Array.isArray(mission.metadata.mission.encounters) || mission.metadata.mission.encounters.length === 0) {
        errors.push({
          field: 'metadata.mission.encounters',
          message: 'metadata.mission.encounters must be a non-empty array'
        });
      }
    }
  } else {
    errors.push({ field: 'metadata', message: 'Missing metadata object' });
  }

  // Validate specific field types and values
  if (typeof mission.difficulty === 'number') {
    if (mission.difficulty < 1 || mission.difficulty > 5) {
      errors.push({
        field: 'difficulty',
        message: `Invalid difficulty: ${mission.difficulty} (must be 1-5)`
      });
    }
  }

  if (typeof mission.minLevel === 'number' && typeof mission.maxLevel === 'number') {
    if (mission.minLevel > mission.maxLevel) {
      errors.push({
        field: 'levels',
        message: `Invalid level range: ${mission.minLevel} - ${mission.maxLevel}`
      });
    }
  }

  return errors;
}

/**
 * Strip extension-specific fields and clean metadata
 */
export function stripExtensionFields(mission: MissionRecord): MissionRecord {
  const cleaned = { ...mission } as any;

  // Remove extension-specific tracking fields
  for (const field of EXTENSION_FIELDS) {
    delete cleaned[field];
  }

  // Remove scenarioText from metadata
  if (cleaned.metadata) {
    for (const field of METADATA_STRIP_FIELDS) {
      delete cleaned.metadata[field];
    }
  }

  return cleaned;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(e => `  - ${e.message}`).join('\n');
}

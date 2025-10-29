#!/usr/bin/env tsx
/**
 * Clean missions.json by:
 * - Removing scenarioText (not useful for automation)
 * - Removing user-specific fields (cleared, clearedAt, disabled, totalLoot)
 * - Validating and removing missions with missing required fields
 *
 * Usage: pnpm clean
 * Or: tsx clean-missions.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { MissionsDatabase } from '@lazyfrog/types';
import {
  validateMission,
  EXTENSION_FIELDS,
  METADATA_STRIP_FIELDS,
  formatValidationErrors,
} from './utils/validation.js';

const MISSIONS_FILE = join(import.meta.dirname, 'missions.json');

console.log('Cleaning and validating missions.json...\n');

// Read the missions file
const missionsData: MissionsDatabase = JSON.parse(readFileSync(MISSIONS_FILE, 'utf8'));

let scenarioTextRemoved = 0;
let userFieldsRemoved = 0;
let invalidMissionsRemoved = 0;
const invalidMissions: string[] = [];

// Clean and validate all missions
for (const postId in missionsData) {
  const mission = missionsData[postId] as any;

  // Validate mission
  const errors = validateMission(mission, postId);

  if (errors.length > 0) {
    console.log(`✗ Invalid mission ${postId} (${mission.missionTitle || 'Untitled'}):`);
    console.log(formatValidationErrors(errors));
    invalidMissions.push(postId);
    delete missionsData[postId];
    invalidMissionsRemoved++;
    continue;
  }

  // Remove scenarioText from metadata
  if (mission.metadata?.scenarioText) {
    delete mission.metadata.scenarioText;
    scenarioTextRemoved++;
  }

  // Remove user-specific fields
  for (const field of EXTENSION_FIELDS) {
    if (mission[field] !== undefined) {
      delete mission[field];
      userFieldsRemoved++;
    }
  }
}

// Write back to file with pretty formatting
writeFileSync(MISSIONS_FILE, JSON.stringify(missionsData, null, 2), 'utf8');

console.log('\n=== Cleaning Summary ===');
console.log(`✓ Removed scenarioText from ${scenarioTextRemoved} missions`);
console.log(`✓ Removed ${userFieldsRemoved} user-specific fields`);
console.log(`✓ Removed ${invalidMissionsRemoved} invalid missions`);
console.log(`✓ Total missions in database: ${Object.keys(missionsData).length}`);
console.log(`✓ Updated ${MISSIONS_FILE}`);

if (invalidMissions.length > 0) {
  console.log(`\nInvalid missions removed: ${invalidMissions.join(', ')}`);
}

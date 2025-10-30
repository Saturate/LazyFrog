#!/usr/bin/env tsx
/**
 * Merge missions from a source file into missions.json
 *
 * Features:
 * - Validates missions have all required fields
 * - Skips duplicates based on postId
 * - Strips extension-specific fields (cleared, clearedAt, disabled, totalLoot)
 * - Removes scenarioText automatically
 * - Preserves formatting with 2-space indentation
 * - Rejects missions with missing metadata or invalid data
 *
 * Usage: pnpm merge <source-file.json>
 * Or: tsx merge-missions.ts <source-file.json>
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { MissionsDatabase } from '@lazyfrog/types';
import {
  validateMission,
  stripExtensionFields,
  formatValidationErrors,
} from './utils/validation.js';

const MISSIONS_FILE = join(import.meta.dirname, 'missions.json');

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: No source file specified');
    console.error('Usage: tsx merge-missions.ts <source-file.json>');
    process.exit(1);
  }

  const sourceFile = args[0];

  // Check if source file exists
  if (!existsSync(sourceFile)) {
    console.error(`Error: Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  console.log(`Merging missions from: ${sourceFile}`);
  console.log(`Into: ${MISSIONS_FILE}\n`);

  // Read source file
  let sourceData: MissionsDatabase;
  try {
    const sourceContent = readFileSync(sourceFile, 'utf8');
    sourceData = JSON.parse(sourceContent);
  } catch (error) {
    console.error(`Error reading source file: ${(error as Error).message}`);
    process.exit(1);
  }

  // Read existing missions
  let existingData: MissionsDatabase = {};
  if (existsSync(MISSIONS_FILE)) {
    try {
      const existingContent = readFileSync(MISSIONS_FILE, 'utf8');
      existingData = JSON.parse(existingContent);
    } catch (error) {
      console.error(`Error reading missions.json: ${(error as Error).message}`);
      process.exit(1);
    }
  } else {
    console.log('missions.json not found, creating new file');
  }

  // Merge missions
  let addedCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;
  let rejectedCount = 0;
  const rejectedMissions: string[] = [];

  for (const postId in sourceData) {
    const sourceMission = sourceData[postId] as any;

    // Strip extension fields and clean metadata
    const cleanedMission = stripExtensionFields(sourceMission);

    // Validate mission
    const errors = validateMission(cleanedMission, postId);

    if (errors.length > 0) {
      console.log(`✗ Rejected: ${postId} (${cleanedMission.missionTitle || 'Untitled'})`);
      console.log(formatValidationErrors(errors));
      rejectedMissions.push(postId);
      rejectedCount++;
      continue;
    }

    if (existingData[postId]) {
      // Mission already exists - check if we should update
      const existing = existingData[postId];
      const existingTimestamp = existing.timestamp || 0;
      const sourceTimestamp = cleanedMission.timestamp || 0;

      // Only update if source is newer
      if (sourceTimestamp > existingTimestamp) {
        existingData[postId] = cleanedMission;
        updatedCount++;
        console.log(`✓ Updated: ${postId} (${cleanedMission.missionTitle || 'Untitled'})`);
      } else {
        skippedCount++;
      }
    } else {
      // New mission - add it
      existingData[postId] = cleanedMission;
      addedCount++;
      console.log(`+ Added: ${postId} (${cleanedMission.missionTitle || 'Untitled'})`);
    }
  }

  // Write back to missions.json
  try {
    writeFileSync(MISSIONS_FILE, JSON.stringify(existingData, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing missions.json: ${(error as Error).message}`);
    process.exit(1);
  }

  // Summary
  console.log('\n=== Merge Summary ===');
  console.log(`Added:    ${addedCount} new missions`);
  console.log(`Updated:  ${updatedCount} existing missions`);
  console.log(`Skipped:  ${skippedCount} duplicates (older or same timestamp)`);
  console.log(`Rejected: ${rejectedCount} invalid missions`);
  console.log(`Total:    ${Object.keys(existingData).length} missions in database`);
  console.log(`\n✓ Merge complete: ${MISSIONS_FILE}`);

  if (rejectedMissions.length > 0) {
    console.log(`\nRejected missions: ${rejectedMissions.join(', ')}`);
  }
}

main();

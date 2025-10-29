#!/usr/bin/env node
/**
 * Merge missions from a source file into missions.json
 *
 * Features:
 * - Skips duplicates based on postId
 * - Strips extension-specific fields (cleared, clearedAt, disabled, totalLoot)
 * - Removes scenarioText automatically
 * - Preserves formatting with 2-space indentation
 *
 * Usage: node merge-missions.js <source-file.json>
 */

const fs = require('fs');
const path = require('path');

const MISSIONS_FILE = path.join(__dirname, 'missions.json');

// Extension-specific fields to strip
const EXTENSION_FIELDS = ['cleared', 'clearedAt', 'disabled', 'totalLoot'];

// Fields to remove from metadata
const METADATA_STRIP_FIELDS = ['scenarioText'];

function stripExtensionFields(mission) {
  const cleaned = { ...mission };

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

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: No source file specified');
    console.error('Usage: node merge-missions.js <source-file.json>');
    process.exit(1);
  }

  const sourceFile = args[0];

  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.error(`Error: Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  console.log(`Merging missions from: ${sourceFile}`);
  console.log(`Into: ${MISSIONS_FILE}\n`);

  // Read source file
  let sourceData;
  try {
    const sourceContent = fs.readFileSync(sourceFile, 'utf8');
    sourceData = JSON.parse(sourceContent);
  } catch (error) {
    console.error(`Error reading source file: ${error.message}`);
    process.exit(1);
  }

  // Read existing missions
  let existingData = {};
  if (fs.existsSync(MISSIONS_FILE)) {
    try {
      const existingContent = fs.readFileSync(MISSIONS_FILE, 'utf8');
      existingData = JSON.parse(existingContent);
    } catch (error) {
      console.error(`Error reading missions.json: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log('missions.json not found, creating new file');
  }

  // Merge missions
  let addedCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;

  for (const postId in sourceData) {
    const sourceMission = sourceData[postId];

    // Strip extension fields and clean metadata
    const cleanedMission = stripExtensionFields(sourceMission);

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
    fs.writeFileSync(MISSIONS_FILE, JSON.stringify(existingData, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing missions.json: ${error.message}`);
    process.exit(1);
  }

  // Summary
  console.log('\n=== Merge Summary ===');
  console.log(`Added:   ${addedCount} new missions`);
  console.log(`Updated: ${updatedCount} existing missions`);
  console.log(`Skipped: ${skippedCount} duplicates (older or same timestamp)`);
  console.log(`Total:   ${Object.keys(existingData).length} missions in database`);
  console.log(`\n✓ Merge complete: ${MISSIONS_FILE}`);
}

main();

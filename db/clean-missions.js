#!/usr/bin/env node
/**
 * Clean missions.json by removing:
 * - scenarioText (not useful for automation)
 * - User-specific fields (cleared, clearedAt, disabled, totalLoot)
 *
 * Usage: node clean-missions.js
 */

const fs = require('fs');
const path = require('path');

const MISSIONS_FILE = path.join(__dirname, 'missions.json');

// Fields that should not be in the database (extension-only)
const USER_FIELDS = ['cleared', 'clearedAt', 'disabled', 'totalLoot'];

console.log('Cleaning missions.json...');

// Read the missions file
const missionsData = JSON.parse(fs.readFileSync(MISSIONS_FILE, 'utf8'));

let scenarioTextRemoved = 0;
let userFieldsRemoved = 0;

// Remove scenarioText and user-specific fields from all missions
for (const postId in missionsData) {
  const mission = missionsData[postId];

  // Remove scenarioText from metadata
  if (mission.metadata?.scenarioText) {
    delete mission.metadata.scenarioText;
    scenarioTextRemoved++;
  }

  // Remove user-specific fields
  for (const field of USER_FIELDS) {
    if (mission[field] !== undefined) {
      delete mission[field];
      userFieldsRemoved++;
    }
  }
}

// Write back to file with pretty formatting
fs.writeFileSync(MISSIONS_FILE, JSON.stringify(missionsData, null, 2), 'utf8');

console.log(`✓ Removed scenarioText from ${scenarioTextRemoved} missions`);
console.log(`✓ Removed ${userFieldsRemoved} user-specific fields`);
console.log(`✓ Updated ${MISSIONS_FILE}`);

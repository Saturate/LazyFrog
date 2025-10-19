# Mission Automation Guide

## Overview
This guide documents how to automate mission playback in Sword & Supper based on mission metadata.

## Mission Flow

### 1. Opening a Mission
**Location**: Reddit post page (e.g., `/r/SwordAndSupperGame/comments/{postId}/`)

**What Happens**:
- Game loads in an iframe within a modal dialog
- Console logs `missionMetadata` containing complete mission structure
- **No life is at stake yet** - you can close without penalty

**Available Data** (from console `initialData`):
```json
{
  "missionMetadata": {
    "mission": {
      "environment": "mossy_forest",
      "encounters": [...],  // Array of encounter objects
      "minLevel": 1,
      "maxLevel": 5,
      "difficulty": 2,
      "foodName": "Maple-Glazed Bacon",
      "rarity": "uncommon"
    },
    "missionTitle": "...",
    "missionAuthorName": "...",
    "scenarioText": "..."
  },
  "playerStats": {...},
  "questProgress": {...}
}
```

### 2. Encounter Types

The `encounters` array defines the mission structure. Each encounter is one of:

#### A. Enemy Encounter
```json
{
  "type": "enemy",
  "enemies": [
    {"id": "darkBat-0-0", "type": "darkBat", "level": -2},
    {"id": "darkHand-0-1", "type": "darkHand", "level": -1}
  ]
}
```
**UI**: Shows "Battle" button
**Action**: Click "Battle" to start auto-combat
**Result**: Victory or defeat, loot awarded

#### B. Skill Bargain
```json
{
  "type": "skillBargain",
  "positiveEffect": {"type": "multiplier", "stat": "Dodge", "amount": 0.17},
  "negativeEffect": {"type": "health", "amount": -0.17}
}
```
**UI**: Shows choice buttons (Accept/Decline)
**Action**: Choose whether to accept the trade-off
**Result**: Stats modified for remainder of mission

#### C. Ability Choice
```json
{
  "type": "abilityChoice",
  "isEnchanted": false,
  "optionA": {"type": "ability", "abilityId": "IceKnifeOnTurnStart"},
  "optionB": {"type": "ability", "abilityId": "LightningOnCrit"},
  "optionC": {"type": "ability", "abilityId": "HealOnFirstTurn"}
}
```
**UI**: Shows 3 ability option buttons
**Action**: Choose one ability
**Result**: Ability unlocked for character

#### D. Treasure
```json
{
  "type": "treasure",
  "missionType": "standard",
  "reward": {
    "essences": [
      {"id": "EssenceCrunchy", "quantity": 2},
      {"id": "EssenceHearty", "quantity": 2}
    ],
    "tier": 2
  }
}
```
**UI**: Shows treasure/reward screen
**Action**: Usually automatic or single "Collect" button
**Result**: Items added to inventory, mission complete

### 3. Combat Details

**Combat Start**:
- Console logs: `Combat start!`
- Automatic turn-based combat executes
- Each turn logs attacks and damage

**Combat Logs Example**:
```
----TURN START----
darkBat-0-0 attacks player for 6 damage!
----TURN END----
----TURN START----
player attacks darkBat-0-0 for 16 damage!
----TURN END----
...
darkBat-0-0 is dead!
```

**Combat End**:
- Console logs: `Encounter result: {"victory":true, "encounterLoot":[...]}`
- Inventory updated via `inventoryQueryResponse` message
- Quest progress updated via `questProgressUpdate` message
- Returns to mission map, next encounter button appears

### 4. Mission Completion

**After all encounters**:
- Final treasure encounter awards rewards
- Mission marked as "cleared"
- Can close mission and return to Reddit feed

## Automation Strategy

### Phase 1: Metadata Capture
1. **Detect mission page load** - Look for `initialData` console message
2. **Extract mission metadata** - Parse `missionMetadata` JSON from console
3. **Store encounter sequence** - Save the ordered list of encounters

### Phase 2: Encounter Navigation
Based on current encounter type from metadata:

```javascript
function handleEncounter(encounterData, encounterIndex) {
  switch(encounterData.type) {
    case 'enemy':
      // Look for "Battle" button and click it
      clickButton('Battle');
      // Wait for combat to complete (watch for "Encounter result" log)
      waitForCombatEnd();
      break;

    case 'skillBargain':
      // Decision logic: accept or decline based on player stats/strategy
      const shouldAccept = evaluateSkillBargain(encounterData);
      clickButton(shouldAccept ? 'Accept' : 'Decline');
      break;

    case 'abilityChoice':
      // Decision logic: choose best ability for build
      const bestAbility = selectBestAbility(encounterData);
      clickAbilityOption(bestAbility);
      break;

    case 'treasure':
      // Click "Collect" or wait for auto-collect
      waitForTreasureCollection();
      break;
  }
}
```

### Phase 3: Decision Making

**For Enemy Encounters**:
- Always click "Battle" (no choice needed)
- Monitor combat logs for victory/defeat
- If defeat: mission fails, lose a life

**For Skill Bargains**:
- Evaluate trade-offs based on:
  - Current player HP
  - Remaining encounters in mission
  - Positive vs negative effect magnitude
- Simple strategy: Accept if positive > negative OR if early in mission

**For Ability Choices**:
- Prioritize based on player build:
  - Offensive builds: choose damage abilities
  - Defensive builds: choose healing/tanking abilities
  - Balanced: choose utility abilities
- Can maintain a preference list

### Phase 4: Progress Tracking

**Console Log Monitors**:
```javascript
// Listen for these console events:
- "Combat start!" → Combat beginning
- "Encounter result: {...}" → Combat ended with result
- "devvit-message" with type "inventoryQueryResponse" → Loot received
- "devvit-message" with type "questProgressUpdate" → Quest progress updated
```

**State Machine**:
```
MISSION_START → ENCOUNTER_1 → [COMBAT|CHOICE] → ENCOUNTER_2 → ... → TREASURE → MISSION_COMPLETE
```

## Example Mission Walkthrough

**Mission**: "Treasure and Maple-Glazed Bacon In the Mossy Forest"
**Encounters**: 7 total

1. **Encounter 0** (enemy): darkBat + darkHand → Click "Battle" → Victory → +32 Gold
2. **Encounter 1** (enemy): darkBat → Click "Battle" → (waiting for combat...)
3. **Encounter 2** (enemy): 2x darkBat → Click "Battle"
4. **Encounter 3** (skillBargain): +17% Dodge / -17% HP → Choose Accept/Decline
5. **Encounter 4** (abilityChoice): Ice/Lightning/Heal → Choose one
6. **Encounter 5** (enemy): darkBat → Click "Battle"
7. **Encounter 6** (treasure): 2x Crunchy Essence, 2x Hearty Essence → Collect

## Implementation Notes

### Button Detection
Buttons don't have accessible text in the accessibility tree from outside the iframe. Need to:
1. Use Chrome DevTools MCP to take snapshots
2. Look for button elements with specific text content
3. Click using element coordinates or IDs

### Cross-Origin Iframe Limitations
The game runs in `devvit.net` domain iframe - we **cannot** directly access its DOM due to CORS. Solutions:
1. **Console Log Monitoring**: Parse console messages (works!)
2. **Accessibility Tree**: Use MCP snapshots to see button text
3. **Visual Detection**: OCR or image recognition (not needed for now)

### Automation Triggers
**Option A: Extension watches console logs**
- Add console log listener in content script
- Parse mission metadata on load
- Trigger button clicks based on encounter type

**Option B: Manual trigger with automation**
- User opens mission manually
- Clicks "Auto-Play" button in extension
- Extension takes over from current encounter

## Next Steps

1. ✅ Document mission flow
2. ⬜ Add console log listener to extension
3. ⬜ Create mission metadata parser
4. ⬜ Implement button click automation for encounters
5. ⬜ Add decision logic for skill bargains and abilities
6. ⬜ Test full mission auto-play

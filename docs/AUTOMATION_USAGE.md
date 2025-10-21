# Mission Automation Usage Guide

## Overview

The LazyFrog extension now includes **mission automation** that can automatically play through Sword & Supper missions. The automation uses DOM-based detection to identify encounter types and make decisions based on configured strategies.

## Features

✅ **Automatic Combat** - Clicks "Battle" button and waits for combat to complete
✅ **Smart Skill Bargain Decisions** - Configurable strategy for accepting/declining bargains
✅ **Ability Tier List** - Prioritizes abilities based on your preferences
✅ **DOM-Based Detection** - Detects encounter types from visible buttons (no metadata dependency)
✅ **Console Monitoring** - Tracks mission progress via console logs

## How to Use

### 1. Build and Load the Extension

```bash
cd /Users/AKJ/code/AutoSupper
npm run build
```

Then load the `dist` folder as an unpacked extension in Chrome.

### 2. Open a Mission

Navigate to a Sword & Supper mission on Reddit (e.g., `/r/SwordAndSupperGame/comments/{postId}/`).

The extension's game script will automatically inject into the game iframe and initialize the automation engine.

### 3. Start Automation

Open the browser console (F12) and run:

```javascript
window.ssBot.startAutomation()
```

The automation will:
1. Detect the current encounter type from the DOM
2. Make decisions based on your configuration
3. Click the appropriate buttons
4. Wait for combat or transitions to complete
5. Move to the next encounter

### 4. Stop Automation

```javascript
window.ssBot.stopAutomation()
```

### 5. Check Automation State

```javascript
window.ssBot.getAutomationState()
```

This returns:
- `missionMetadata` - Mission info (if captured from console logs)
- `currentEncounterIndex` - Which encounter we're on
- `inCombat` - Whether combat is active
- `missionActive` - Whether a mission is in progress

## Configuration

The automation can be configured via Chrome storage. The default configuration is:

```javascript
{
  enabled: false,
  abilityTierList: [
    'IceKnifeOnTurnStart',  // High damage, kills enemies faster
    'LightningOnCrit',      // Additional damage on crits
    'HealOnFirstTurn',      // Defensive fallback
  ],
  autoAcceptSkillBargains: true,
  skillBargainStrategy: 'positive-only'  // Options: 'always', 'never', 'positive-only'
}
```

### Skill Bargain Strategies

- **`'always'`** - Always accept skill bargains
- **`'never'`** - Always decline skill bargains
- **`'positive-only'`** - Accept only if the positive effect outweighs the negative effect

### Ability Tier List

The `abilityTierList` is an ordered array of ability IDs. The automation will select the first ability from the tier list that's available in the encounter.

**Known Ability IDs**:
- `IceKnifeOnTurnStart` - Deals massive damage at turn start
- `LightningOnCrit` - Extra damage on critical hits
- `HealOnFirstTurn` - Healing at the start of first turn

## How It Works

### 1. DOM-Based Encounter Detection

The automation identifies encounter types by analyzing visible buttons:

| Encounter Type | Detection Method |
|----------------|------------------|
| **Enemy** | "Battle" button present |
| **Skill Bargain** | "Refuse" button present |
| **Ability Choice** | 3+ long-text buttons (not Battle/Continue/Refuse) |
| **Treasure** | "Continue" button + "VICTORY" text in body |
| **Unknown** | "Advance" button (needs to advance first) |

### 2. Console Log Monitoring

The automation hijacks `console.log` to capture:
- **Mission Metadata** (`initialData` message) - Optional, provides encounter sequence and details
- **Combat Start** (`"Combat start!"`) - Sets combat flag
- **Encounter Results** (`"Encounter result: {...}"`) - Detects victory/defeat, moves to next encounter

### 3. Decision Logic

**Enemy Encounters**: Always clicks "Battle"

**Skill Bargains**:
- If metadata available: Uses configured strategy with effect amounts
- If no metadata: Uses `skillBargainStrategy` config
- Clicks "Increase..." button to accept, "Refuse" to decline

**Ability Choices**:
- If metadata available: Matches abilities against tier list, clicks the highest-ranked available ability
- If no metadata: Clicks the first ability button found

**Treasure**: Clicks "Continue" and marks mission complete

## Limitations

⚠️ **Cross-Origin Restrictions** - The game runs in a `devvit.net` iframe, so we can't directly access the DOM from the parent page. The automation must run inside the game iframe.

⚠️ **Manual Start** - Currently requires manual console command to start. A UI will be added in the future.

⚠️ **Metadata Optional** - The automation works without metadata but makes better decisions when metadata is available (for skill bargains and ability choices).

⚠️ **No Life Protection** - The automation will start missions even if you're low on lives. Be careful!

## Debugging

All automation actions are logged to the console with emojis:

- 🔍 = Detection
- ⚔️ = Combat
- 🤝 = Skill Bargain
- 🎓 = Ability Choice
- 🎁 = Treasure
- ✅ = Success
- ❌ = Error
- ⏳ = Waiting

## Future Improvements

- [ ] Add popup UI for controlling automation
- [ ] Add ability name detection from DOM (not just IDs)
- [ ] Add HP monitoring to make better skill bargain decisions
- [ ] Add support for more complex decision strategies
- [ ] Add "lives check" before starting missions
- [ ] Add automation pause/resume mid-mission
- [ ] Add statistics tracking (missions completed, success rate, etc.)

## Troubleshooting

### Automation not detecting encounters

**Check**: Is the game script loaded in the iframe?
```javascript
// In the game iframe console
window.ssBot
// Should show available functions
```

### Automation stuck on "Unknown" encounter

**Check**: Are there any buttons visible?
```javascript
Array.from(document.querySelectorAll('button')).map(b => b.textContent)
```

### Automation not clicking buttons

**Check**: Console for error messages. The automation logs all button click attempts.

## Example Session

```javascript
// 1. Start automation
window.ssBot.startAutomation()
// Output: ▶️ Automation started

// 2. Watch progress in console
// 🔍 Detected encounter type: enemy
// ⚔️ Enemy encounter - clicking Battle button
// 🖱️ Clicking button: "Battle"
// ✅ Battle started, combat system will handle turns automatically
// ⚔️ Combat detected, waiting for completion...
// ✅ Encounter completed: {victory: true, ...}
// 🔍 Detected encounter type: skillBargain
// 🤝 Skill Bargain encountered
// 📊 Decision: Accept
// ...

// 3. Check state anytime
window.ssBot.getAutomationState()
// Output: { missionActive: true, currentEncounterIndex: 3, inCombat: false, ... }

// 4. Stop if needed
window.ssBot.stopAutomation()
// Output: ⏸️ Automation paused
```

## Credits

Built with observations from live mission playthrough. See `MISSION_AUTOMATION_GUIDE.md` for detailed documentation of mission structure.

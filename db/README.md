# Mission Database

This directory contains the mission database and related tools for Sword & Supper automation.

## Structure

```
db/
├── missions.json      # Main mission database
├── types.ts           # TypeScript type definitions
├── clean-missions.js  # Clean missions (remove unnecessary fields)
├── merge-missions.js  # Merge new missions into database
└── README.md          # This file
```

## What's in missions.json?

A JSON object mapping Reddit post IDs to mission records:

```json
{
  "t3_1oh01dp": {
    "postId": "t3_1oh01dp",
    "timestamp": 1761618567922,
    "metadata": { /* complete game data */ },
    "permalink": "https://www.reddit.com/comments/1oh01dp/",
    "difficulty": 2,
    "missionTitle": "A Spooky Tale",
    "minLevel": 121,
    "maxLevel": 140,
    "environment": "haunted_forest",
    "foodName": "Lemon Pistachio Swirl",
    "tags": "2* | 121 - 140 | haunted_forest | Lemon Pistachio Swirl"
  }
}
```

**Key fields for filtering:**
- `difficulty` - Star rating (1-5)
- `minLevel` / `maxLevel` - Level range
- `environment` - Map type (haunted_forest, new_eden, etc.)
- `tags` - Human-readable summary

For complete type definitions and field descriptions, see **`types.ts`**.

## Scripts

### Clean Missions

Remove unnecessary fields from missions:

```bash
node clean-missions.js
```

### Merge Missions

Add new missions from an export file:

```bash
node merge-missions.js new-missions.json
```

Automatically cleans and deduplicates missions.

**Example:**
```bash
node merge-missions.js ../exports/2025-01-15.json
```

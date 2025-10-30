# Mission Database

This directory contains the mission database and related tools for Sword & Supper automation.

## Structure

```
db/
├── missions.json         # Main mission database
├── clean-missions.ts     # Clean missions (remove unnecessary fields)
├── merge-missions.ts     # Merge new missions into database
├── utils/
│   └── validation.ts     # Shared validation utilities
├── package.json          # Package configuration
└── README.md             # This file
```

**Note:** TypeScript type definitions are in the shared `@lazyfrog/types` package at `/packages/types/`.

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

For complete type definitions and field descriptions, see **`/packages/types/src/index.ts`**.

## Scripts

All scripts are written in TypeScript and executed with `tsx`. Run them from the project root:

### Clean Missions

Remove unnecessary fields and validate missions:

```bash
pnpm --dir db clean
```

Or directly with tsx:
```bash
tsx db/clean-missions.ts
```

This script:
- Validates all required fields
- Removes extension-specific fields (cleared, clearedAt, disabled, totalLoot)
- Removes scenarioText from metadata
- Deletes missions with missing or invalid data

### Merge Missions

Add new missions from an export file:

```bash
pnpm --dir db merge <source-file.json>
```

Or directly with tsx:
```bash
tsx db/merge-missions.ts <source-file.json>
```

This script:
- Validates missions before merging
- Strips extension-specific fields
- Skips duplicates
- Updates missions if source has newer timestamp
- Automatically cleans and validates all data

**Example:**
```bash
pnpm --dir db merge ../exports/2025-01-15.json
```

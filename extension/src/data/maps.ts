/**
 * Map/Environment name mappings
 * Maps environment IDs to their display names
 * Source: autotag userscript
 */

export const mapNames: Record<string, string> = {
  fields: "Fields",
  outer_temple: "Outer Temple",
  forbidden_city: "Forbidden City",
  mossy_forest: "Mossy Forest",
  mountain_pass: "Mountain Pass",
  new_eden: "New Eden",
  ruined_path: "Ruined Path",
  seaside_cliffs: "Seaside Cliffs",
};

/**
 * Get map display name by ID
 * Returns the ID if no mapping is found
 */
export function getMapName(mapId: string): string {
  return mapNames[mapId] || mapId;
}

/**
 * Check if a map ID exists
 */
export function isKnownMap(mapId: string): boolean {
  return mapId in mapNames;
}

/**
 * Get all map IDs
 */
export function getAllMapIds(): string[] {
  return Object.keys(mapNames);
}

/**
 * Get all map display names
 */
export function getAllMapNames(): string[] {
  return Object.values(mapNames);
}

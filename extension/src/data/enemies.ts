/**
 * Enemy name mappings
 * Maps enemy IDs to their display names
 * Source: autotag userscript
 */

export const enemyNames: Record<string, string> = {
  // Golems
  golemBaby: "Baby Golem",
  golemMountain: "Mountain Golem",
  golemMountainLucky: "Loaded Mountain Golem",
  golemBoar: "Boar Golem",
  woodGolem: "Heartroot Guardian",
  icyWoodGolem: "Frostroot Guardian",

  // Slimes
  slimeKnight: "Slime Knight",
  slimeBigMouth: "Chomp Slime",
  slimeCat: "Cat Slime",
  slimeGems: "Crystal Slime",
  slimeBone: "Bone Slime",
  slimeBoneLucky: "Loaded Bone Slime",

  // Skeletons
  skeleton: "Warrior Skeleton",
  skelNoHead: "Headless Skeleton",
  skelFireHead: "Flaming Skeleton",
  skelIceHead: "Ice Flame Skeleton",
  skelArcher: "Ranger Skeleton",
  skel2Axe: "Barbarian Skeleton",
  skelWizard: "Wizard Skeleton",
  skelGreatSword: "Swordsman Skeleton",
  skelGreatSwordLucky: "Loaded Swordsman Skeleton",
  skelAssassin: "Assassin Skeleton",

  // Mushrooms
  mushroomSmall: "Bitey Shroom",
  mushroomChild: "Shroomkin",
  mushroomFrog: "Sporehead",
  mushroomSoldier: "Sporewarden",
  mushroomSoldierLucky: "Loaded Sporehead",
  mushroomLarge: "Erin-guy",
  mushroomLargeBoss: "Boss Mushroom",
  mushroomMonster: "Sturdy Sporeborn",
  mushroomTeeth: "Mawcap",

  // Dark/Shadow enemies
  cannibal: "Shadowbearer",
  darkBat: "Shadow Wing",
  darkShaman: "Shadowbringer",
  darkChild: "Shadowkin",
  darkBigGuy: "Shadow Brute",
  darkBigGuyLucky: "",
  darkHand: "Arm of Shadow",
  darkWizard: "Shadow Conjurer",
  darkGiantHorns: "Hollowhorn",
  darkWorm: "Shadow Hatchling",
  darkSpider: "Skittering Shadow",
  darkDemon: "Umbral Winged Shadeborn",

  // Wood enemies
  woodOctopus: "Branchclutch",
  woodRoof: "Stumpkin",

  // Robots
  robotNo1: "Y5-Sentry",
  robotNo2: "KRG-01",
  robotNo3: "Gen5-HVY",
  robotNo4: "Medibot-Mark IV",
  robotNo5: "WasteLogic LX-9",
  robotNo5Lucky: "Loaded WasteLogic LX-9",
  robotNo6: "BRX-7 Sentry Chassis",
  robotNo7: "Minifax Model B",
  robotBoss: "Slumbering Guardian-X5",

  // Other
  livingArmor: "Steel Revenant",
};

/**
 * Get enemy display name by ID
 * Returns the ID if no mapping is found
 */
export function getEnemyName(enemyId: string): string {
  return enemyNames[enemyId] || enemyId;
}

/**
 * Check if an enemy ID exists
 */
export function isKnownEnemy(enemyId: string): boolean {
  return enemyId in enemyNames;
}

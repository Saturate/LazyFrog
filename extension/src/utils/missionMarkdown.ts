import { MissionRecord } from '@lazyfrog/types';

// Enemy name mappings
const enemyNames: Record<string, string> = {
	golemBaby: 'Baby Golem',
	slimeKnight: 'Slime Knight',
	slimeBigMouth: 'Chomp Slime',
	slimeCat: 'Cat Slime',
	slimeGems: 'Crystal Slime',
	skeleton: 'Warrior Skeleton',
	skelNoHead: 'Headless Skeleton',
	golemMountain: 'Mountain Golem',
	golemMountainLucky: 'Loaded Mountain Golem',
	golemBoar: 'Boar Golem',
	skelFireHead: 'Flaming Skeleton',
	skelIceHead: 'Ice Flame Skeleton',
	skelArcher: 'Ranger Skeleton',
	skel2Axe: 'Barbarian Skeleton',
	slimeBone: 'Bone Slime',
	slimeBoneLucky: 'Loaded Bone Slime',
	mushroomSmall: 'Bitey Shroom',
	mushroomLarge: 'Erin-guy',
	mushroomLargeBoss: 'Boss Mushroom',
	skelWizard: 'Wizard Skeleton',
	skelGreatSword: 'Swordsman Skeleton',
	skelGreatSwordLucky: 'Loaded Swordsman Skeleton',
	skelAssassin: 'Assassin Skeleton',
	cannibal: 'Shadowbearer',
	darkBat: 'Shadow Wing',
	darkShaman: 'Shadowbringer',
	darkChild: 'Shadowkin',
	darkBigGuy: 'Shadow Brute',
	darkBigGuyLucky: 'Loaded Shadow Brute',
	darkHand: 'Arm of Shadow',
	darkWizard: 'Shadow Conjurer',
	darkGiantHorns: 'Hollowhorn',
	darkWorm: 'Shadow Hatchling',
	darkSpider: 'Skittering Shadow',
	darkDemon: 'Umbral Winged Shadeborn',
	mushroomChild: 'Shroomkin',
	mushroomFrog: 'Sporehead',
	mushroomSoldierLucky: 'Loaded Sporehead',
	mushroomSoldier: 'Sporewarden',
	livingArmor: 'Steel Revenant',
	mushroomMonster: 'Sturdy Sporeborn',
	mushroomTeeth: 'Mawcap',
	woodGolem: 'Heartroot Guardian',
	icyWoodGolem: 'Frostroot Guardian',
	woodOctopus: 'Branchclutch',
	woodRoof: 'Stumpkin',
	robotNo1: 'Y5-Sentry',
	robotNo2: 'KRG-01',
	robotNo3: 'Gen5-HVY',
	robotNo4: 'Medibot-Mark IV',
	robotNo5: 'WasteLogic LX-9',
	robotNo5Lucky: 'Loaded WasteLogic LX-9',
	robotNo6: 'BRX-7 Sentry Chassis',
	robotNo7: 'Minifax Model B',
	robotBoss: 'Slumbering Guardian-X5',
};

// Map name mappings
const mapNames: Record<string, string> = {
	fields: 'Fields',
	outer_temple: 'Outer Temple',
	forbidden_city: 'Forbidden City',
	mossy_forest: 'Mossy Forest',
	mountain_pass: 'Mountain Pass',
	new_eden: 'New Eden',
	ruined_path: 'Ruined Path',
	seaside_cliffs: 'Seaside Cliffs',
};

/**
 * Generate markdown for a mission in Reddit-friendly format
 */
export function generateMissionMarkdown(mission: MissionRecord): string | null {
	if (!mission.encounters || mission.encounters.length === 0) {
		return null;
	}

	const encounters = mission.encounters;
	const stars = '⭐'.repeat(mission.difficulty || 0);
	const mapName = mapNames[mission.environment || ''] || mission.environment || 'Unknown';

	// Build title and header info (use missionTitle which is the Reddit post title)
	const title = mission.missionTitle || mission.foodName || 'Mission';
	let markdown = `### ${stars} ${title}\n`;
	markdown += `**Map:** ${mapName} | **Level:** ${mission.minLevel}-${mission.maxLevel}\n\n`;

	// Build table
	markdown += `| # | Room | Details |\n`;
	markdown += `|---|------|----------|\n`;

	// Process each encounter
	encounters.forEach((enc: any, index: number) => {
		const roomNum = index + 1;
		const roomIcon = getEncounterIcon(enc.type);
		const roomType = getEncounterTypeName(enc.type);
		const details = getEncounterDetails(enc, mission.foodName);

		markdown += `| ${roomNum} | ${roomIcon} ${roomType} | ${details} |\n`;
	});

	return markdown;
}

/**
 * Get emoji icon for encounter type
 */
function getEncounterIcon(type: string): string {
	const icons: Record<string, string> = {
		enemy: '⚔️',
		boss: '👑',
		rushBoss: '👑',
		crossroadsFight: '🔱',
		skillBargain: '🔮',
		abilityChoice: '⛩',
		treasure: '💎',
		investigate: '🏚️',
		statsChoice: '📊',
		blessing: '🙏',
		shopEquipment: '🛒',
		shopAbility: '🛒',
	};
	return icons[type] || '❓';
}

/**
 * Get readable name for encounter type
 */
function getEncounterTypeName(type: string): string {
	const names: Record<string, string> = {
		enemy: 'Battle',
		boss: 'Boss',
		rushBoss: 'Boss',
		crossroadsFight: 'Miniboss',
		skillBargain: 'Monolith',
		abilityChoice: 'Shrine',
		treasure: 'Treasure',
		investigate: 'Hut',
		statsChoice: 'Stat Choice',
		blessing: 'Blessing',
		shopEquipment: 'Vending',
		shopAbility: 'Vending',
	};
	return names[type] || type;
}

/**
 * Get detailed description of encounter
 */
function getEncounterDetails(enc: any, foodName?: string): string {
	switch (enc.type) {
		case 'enemy':
		case 'boss':
		case 'rushBoss':
		case 'crossroadsFight':
			return formatEnemies(enc.enemies || []);

		case 'skillBargain':
			return formatSkillBargain(enc);

		case 'abilityChoice':
			return formatAbilityChoice(enc);

		case 'shopEquipment':
		case 'shopAbility':
			return formatShop(enc);

		case 'treasure':
			return foodName || 'Treasure!';

		case 'investigate':
			return 'Hut';

		default:
			return '';
	}
}

/**
 * Format enemy list
 */
function formatEnemies(enemies: any[]): string {
	if (!enemies || enemies.length === 0) return '???';

	// Count duplicates
	const enemyCounts: Record<string, number> = {};
	enemies.forEach((enemy) => {
		const name = enemyNames[enemy.type] || enemy.type;
		enemyCounts[name] = (enemyCounts[name] || 0) + 1;
	});

	// Format output
	const parts = Object.entries(enemyCounts).map(([name, count]) => {
		if (count > 1) {
			return `${count}× ${name}`;
		}
		return name;
	});

	return parts.join(' · ');
}

/**
 * Format skill bargain details
 */
function formatSkillBargain(enc: any): string {
	const positive = enc.positiveEffect;
	const negative = enc.negativeEffect;

	const posStat = formatStatName(positive?.stat);
	const negStat = formatStatName(negative?.stat);

	return `⬆️${posStat} + ⬇️${negStat}`;
}

/**
 * Format ability choice options
 */
function formatAbilityChoice(enc: any): string {
	const abilities: string[] = [];

	// Extract ability IDs from optionA, optionB, optionC
	if (enc.optionA?.abilityId) abilities.push(formatAbilityName(enc.optionA.abilityId));
	if (enc.optionB?.abilityId) abilities.push(formatAbilityName(enc.optionB.abilityId));
	if (enc.optionC?.abilityId) abilities.push(formatAbilityName(enc.optionC.abilityId));

	if (abilities.length === 0) return '???';

	// Show enchanted indicator if present
	const enchanted = enc.isEnchanted ? '✨ Enchanted  \n' : '';

	// Format as bullet list with proper line breaks
	// Using two spaces + newline for markdown line breaks
	return `${enchanted}• ${abilities.join(' • ')}`;
}

/**
 * Format ability ID to readable name
 */
function formatAbilityName(abilityId: string): string {
	// Convert camelCase to readable format
	// e.g., "IceKnifeOnTurnStart" -> "Ice Knife On Turn Start"
	const readable = abilityId
		.replace(/([A-Z])/g, ' $1')
		.trim()
		.replace(/On Turn Start/i, '(Start)')
		.replace(/On Turn End/i, '(End)')
		.replace(/On Crit/i, '(Crit)')
		.replace(/On Hit/i, '(Hit)')
		.replace(/On Kill/i, '(Kill)');

	return readable;
}

/**
 * Format shop options
 */
function formatShop(enc: any): string {
	// We don't have shop item details in metadata typically
	return 'Shop items available';
}

/**
 * Format stat names for readability
 */
function formatStatName(stat: string | undefined): string {
	if (!stat) return '???';

	const names: Record<string, string> = {
		attack: 'Attack',
		defense: 'Defense',
		speed: 'Speed',
		dodge: 'Dodge',
		maxHp: 'HP',
		critChance: 'Crit',
	};

	return names[stat] || stat;
}

/**
 * Format loot item names for readability
 */
function formatLootName(itemId: string): string {
	// Convert camelCase/PascalCase to readable format
	// e.g., "BatteredBroadsword" -> "Battered Broadsword"
	const readable = itemId.replace(/([A-Z])/g, ' $1').trim();

	return readable;
}

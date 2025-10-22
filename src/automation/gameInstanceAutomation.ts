/**
 * Simple Button-Clicking Automation
 * No metadata required - just clicks buttons as they appear
 */

import { devvitGIAELogger as devvitLogger } from '../utils/logger';
import {
	saveMission,
	MissionRecord,
	markMissionCleared,
	checkMissionClearedInDOM,
	accumulateMissionLoot,
} from '../utils/storage';
import { enemyNames, mapNames } from '../data';
import { extractPostIdFromUrl } from '../content/devvit/utils/extractPostIdFromUrl';

export interface GameInstanceAutomationConfig {
	enabled: boolean;
	abilityTierList: string[]; // Preferred abilities in order
	blessingStatPriority: string[]; // Preferred blessing stats in order (e.g., ['Speed', 'Attack', 'Defense'])
	autoAcceptSkillBargains: boolean;
	skillBargainStrategy: 'always' | 'positive-only' | 'never';
	crossroadsStrategy: 'fight' | 'skip'; // Whether to fight or skip mini boss encounters
	clickDelay: number; // Delay between clicks in ms
}

export const DEFAULT_GIAE_CONFIG: GameInstanceAutomationConfig = {
	enabled: false,
	abilityTierList: ['IceKnifeOnTurnStart', 'LightningOnCrit', 'HealOnFirstTurn'],
	blessingStatPriority: ['Speed', 'Attack', 'Crit', 'Health', 'Defense', 'Dodge'], // Speed first for faster gameplay
	autoAcceptSkillBargains: true,
	skillBargainStrategy: 'positive-only',
	crossroadsStrategy: 'skip', // Skip mini bosses by default (safer/faster)
	clickDelay: 1000,
};

export class GameInstanceAutomationEngine {
	private config: GameInstanceAutomationConfig;
	private intervalId: number | null = null;
	private isProcessing = false;
	private inCombat = false;
	private missionMetadata: any = null;
	private currentPostId: string | null = null;

	constructor(config: GameInstanceAutomationConfig) {
		// Deep merge config, ensuring arrays are properly preserved
		this.config = {
			...DEFAULT_GIAE_CONFIG,
			...config,
			// Ensure arrays are properly set, falling back to defaults if not provided
			abilityTierList: Array.isArray(config.abilityTierList)
				? config.abilityTierList
				: DEFAULT_GIAE_CONFIG.abilityTierList,
			blessingStatPriority: Array.isArray(config.blessingStatPriority)
				? config.blessingStatPriority
				: DEFAULT_GIAE_CONFIG.blessingStatPriority,
		};
		this.setupMessageListener();
	}

	/**
	 * Emit state change event for UI components
	 */
	private emitStateChange(): void {
		window.dispatchEvent(
			new CustomEvent('SS_AUTOMATION_STATE_CHANGE', {
				detail: this.getState(),
			}),
		);
	}

	/**
	 * Broadcast status update to popup
	 */
	private broadcastStatus(
		status: string,
		missionId?: string,
		encounter?: { current: number; total: number },
	): void {
		try {
			chrome.runtime.sendMessage({
				type: 'STATUS_UPDATE',
				status,
				missionId,
				encounter,
			});
		} catch (error) {
			// Silently fail if popup is closed
		}
	}

	/**
	 * Save mission to Chrome storage database
	 * Public so it can be called from content script when initialData is captured early
	 */
	public async saveMissionToDatabase(
		postId: string,
		username: string,
		metadata: any,
	): Promise<void> {
		try {
			const mission = metadata.mission;
			if (!mission) return;

			// Check if mission already exists
			const { getMission } = await import('../utils/storage');
			const existingMission = await getMission(postId);

			// Generate tags for the mission
			const tags = this.generateMissionTags(metadata);

			// Build permalink URL from postId (e.g., t3_1obdqvw -> /r/SwordAndSupperGame/comments/1obdqvw/)
			const permalink = postId.startsWith('t3_')
				? `https://www.reddit.com/r/SwordAndSupperGame/comments/${postId.slice(3)}/`
				: undefined;

			// Use mission author from metadata if available, otherwise use the provided username
			// When enriching, preserve the original author from existing mission
			const missionAuthor = existingMission?.username || metadata.missionAuthorName || username;

			const record: MissionRecord = {
				postId,
				username: missionAuthor,
				timestamp: existingMission?.timestamp || Date.now(), // Keep original timestamp if updating
				metadata,
				tags,
				difficulty: mission.difficulty,
				environment: mission.environment,
				minLevel: mission.minLevel,
				maxLevel: mission.maxLevel,
				missionTitle: metadata.missionTitle,
				foodName: mission.foodName,
				permalink,
				cleared: existingMission?.cleared || false, // Preserve cleared status
			};

			await saveMission(record);

			if (existingMission) {
				// Updating existing mission with enriched metadata
				devvitLogger.log('Mission metadata enriched', {
					postId,
					difficulty: record.difficulty,
					environment: record.environment,
					encounters: mission.encounters?.length,
					tags,
					hadMetadataBefore: !!existingMission.metadata,
				});
			} else {
				// New mission discovered from playing (not previously scanned)
				devvitLogger.log('🆕 NEW MISSION discovered from gameplay', {
					postId,
					difficulty: record.difficulty,
					environment: record.environment,
					encounters: mission.encounters?.length,
					tags,
					permalink,
					foodName: mission.foodName,
				});
			}
		} catch (error) {
			devvitLogger.error('Failed to save mission', { error: String(error) });
		}
	}

	/**
	 * Mark mission as cleared in database
	 */
	private async markMissionAsCleared(postId: string): Promise<void> {
		try {
			devvitLogger.log('Attempting to mark mission as cleared', {
				postId,
				hasChromeRuntime: !!chrome.runtime,
				hasChromeRuntimeId: !!chrome.runtime?.id,
				hasChromeStorage: !!chrome.storage,
				hasChromeStorageLocal: !!chrome.storage?.local,
			});

			await markMissionCleared(postId);
			devvitLogger.log('Mission marked as cleared', { postId });
		} catch (error) {
			devvitLogger.error('Failed to mark mission cleared', {
				error: String(error),
				errorMessage: error instanceof Error ? error.message : 'Unknown error',
				errorStack: error instanceof Error ? error.stack : undefined,
			});
		}
	}

	/**
	 * Navigate directly to the next uncleared mission
	 * This avoids going back to the listing page
	 */
	private async navigateToNextMission(): Promise<void> {
		try {
			devvitLogger.log('Getting next uncleared mission...');

			// Get filters from storage
			const storageData = await chrome.storage.local.get(['automationFilters']);
			const filters = storageData.automationFilters
				? {
						stars: storageData.automationFilters.stars,
						minLevel: storageData.automationFilters.minLevel,
						maxLevel: storageData.automationFilters.maxLevel,
					}
				: undefined;

			devvitLogger.log('Using filters', { filters });

			// Dynamically import to avoid circular dependencies
			const { getNextUnclearedMission } = await import('../utils/storage');
			const nextMission = await getNextUnclearedMission(filters);

			if (nextMission && nextMission.permalink) {
				const { normalizeRedditPermalink } = await import('../utils/url');
				const targetUrl = normalizeRedditPermalink(nextMission.permalink);
				devvitLogger.log('Navigating to next mission', {
					postId: nextMission.postId,
					tags: nextMission.tags,
					permalink: targetUrl,
				});

				this.broadcastStatus('Navigating to mission %missionId%', nextMission.postId);

				// Keep bot session active so automation continues after navigation
				chrome.storage.local.set({
					activeBotSession: true,
					automationConfig: this.config,
				});

				// Navigate directly to next mission (avoids listing page reload)
				window.location.href = targetUrl;
			} else {
				devvitLogger.log('No more uncleared missions - automation complete!');
				this.broadcastStatus('Idle');
				alert('No more uncleared missions available. Automation stopped.');
				this.stop();
			}
		} catch (error) {
			devvitLogger.error('Failed to navigate to next mission', { error: String(error) });
		}
	}

	/**
	 * Generate mission tags (same logic as GameControlPanel)
	 */
	private generateMissionTags(metadata: any): string {
		if (!metadata?.mission) return '';

		const mission = metadata.mission;
		const encounters = mission.encounters || [];
		const tags: string[] = [];

		// Stars
		tags.push(`${mission.difficulty}*`);

		// Level range
		tags.push(`${mission.minLevel} - ${mission.maxLevel}`);

		// Map name
		if (mission.environment && mapNames[mission.environment]) {
			tags.push(mapNames[mission.environment]);
		}

		// Food name
		if (mission.foodName) {
			tags.push(mission.foodName);
		}

		// Boss rush
		if (mission.type === 'bossRush') {
			tags.push('boss rush');
		}

		// Process encounters
		encounters.forEach((encounter: any) => {
			if (encounter.type === 'crossroadsFight' && encounter.enemies?.[0]) {
				let minibossTag = `miniboss ${enemyNames[encounter.enemies[0].type] || encounter.enemies[0].type}`;
				if (mission.minLevel > 60) {
					minibossTag = '2k ' + minibossTag;
				} else if (mission.minLevel > 40) {
					minibossTag = '1k ' + minibossTag;
				}
				tags.push(minibossTag);
			} else if (
				(encounter.type === 'boss' || encounter.type === 'rushBoss') &&
				encounter.enemies?.[0]
			) {
				tags.push(`${enemyNames[encounter.enemies[0].type] || encounter.enemies[0].type} boss`);
			} else if (encounter.type === 'investigate') {
				tags.push('hut');
			}
		});

		return tags.join(' | ');
	}

	/**
	 * Listen to window messages for game state
	 */
	private setupMessageListener(): void {
		window.addEventListener('message', (event: MessageEvent) => {
			try {
				// Log ALL messages to understand what's coming through
				// if (event.data) {
				// 	// Check if this is a devvit-message (the format the game uses)
				// 	const isDevvitMessage = event.data?.type === 'devvit-message';
				// 	const messageType = event.data?.data?.message?.type;

				// 	// Log devvit-messages with more detail
				// 	if (isDevvitMessage) {
				// 		devvitLogger.log('📨 devvit-message received', {
				// 			origin: event.origin,
				// 			messageType: messageType,
				// 			hasMessageData: !!event.data?.data?.message?.data,
				// 			topLevelKeys: Object.keys(event.data).slice(0, 20),
				// 			messageKeys: event.data?.data?.message
				// 				? Object.keys(event.data.data.message).slice(0, 20)
				// 				: [],
				// 			// Include full data for initialData and encounterResult messages
				// 			fullData:
				// 				messageType === 'initialData' ||
				// 				messageType === 'initialDataInn' ||
				// 				messageType === 'encounterResult'
				// 					? event.data
				// 					: undefined,
				// 		});
				// 	}
				// }

				// Check for initialData message (mission metadata)
				// Using the EXACT structure the game uses: event.data.type === "devvit-message"
				if (
					event.data?.type === 'devvit-message' &&
					event.data?.data?.message?.type === 'initialData'
				) {
					this.missionMetadata = event.data.data.message.data?.missionMetadata;
					const postId = event.data.data.message.data?.postId;
					const username = event.data.data.message.data?.username;

					// Store postId for later use (e.g., marking as cleared)
					this.currentPostId = postId;

					devvitLogger.log('Mission metadata received', {
						postId,
						difficulty: this.missionMetadata?.mission?.difficulty,
						environment: this.missionMetadata?.mission?.environment,
						encounters: this.missionMetadata?.mission?.encounters?.length,
					});

					// Broadcast status
					const encounterCount = this.missionMetadata?.mission?.encounters?.length || 0;
					this.broadcastStatus('Starting mission clearing', postId, {
						current: 0,
						total: encounterCount,
					});

					// Save mission to database
					if (this.missionMetadata && postId) {
						this.saveMissionToDatabase(postId, username, this.missionMetadata);
					}

					this.emitStateChange(); // Notify UI
				}

				// Check for combat events
				if (event.data?.type === 'COMBAT_START') {
					this.inCombat = true;
					devvitLogger.log('Combat started - pausing button clicks');
					this.emitStateChange(); // Notify UI
				}

				if (event.data?.type === 'COMBAT_END') {
					this.inCombat = false;
					devvitLogger.log('Combat ended - resuming automation');
					this.emitStateChange(); // Notify UI
				}

				// Check for encounter result with loot (final encounter)
				// Try both possible message structures
				const encounterResult =
					(event.data?.data?.message?.type === 'encounterResult' && event.data.data.message.data) ||
					(event.data?.type === 'devvit-message' &&
						event.data?.data?.message?.type === 'encounterResult' &&
						event.data.data.message.data);

				if (encounterResult) {
					devvitLogger.log('Encounter result received', {
						victory: encounterResult.victory,
						encounterIndex: encounterResult.encounterAction?.encounterIndex,
						lootCount: encounterResult.encounterLoot?.length,
					});

					// Update status with encounter progress
					const encounterIndex = encounterResult.encounterAction?.encounterIndex;
					const encounterCount = this.missionMetadata?.mission?.encounters?.length || 0;
					if (encounterIndex !== undefined && encounterCount > 0) {
						this.broadcastStatus(
							'Clearing %missionId% encounter %current% of %total%',
							this.currentPostId || undefined,
							{
								current: encounterIndex + 1,
								total: encounterCount,
							},
						);
					}

					// If this is a victory and has loot, accumulate it
					if (
						encounterResult.victory &&
						encounterResult.encounterLoot &&
						encounterResult.encounterLoot.length > 0 &&
						this.currentPostId
					) {
						devvitLogger.log('Accumulating encounter loot', {
							postId: this.currentPostId,
							encounterIndex: encounterResult.encounterAction?.encounterIndex,
							loot: encounterResult.encounterLoot,
						});
						accumulateMissionLoot(this.currentPostId, encounterResult.encounterLoot).catch(
							(error) => {
								devvitLogger.error('Failed to accumulate mission loot', {
									error: String(error),
								});
							},
						);
					}
				}

				// Check for mission completion (missionComplete message)
				// Support both message structures
				if (
					event.data?.data?.message?.type === 'missionComplete' ||
					(event.data?.type === 'devvit-message' &&
						event.data?.data?.message?.type === 'missionComplete')
				) {
					const postId = event.data.data.message.data?.postId;
					if (postId) {
						devvitLogger.log('Mission cleared!', { postId });
						this.broadcastStatus('Finished mission, waiting');
						this.markMissionAsCleared(postId);
					}
				}
			} catch (error) {
				// Log parsing errors
				devvitLogger.error('Error parsing message', { error: String(error) });
			}
		});
	}

	/**
	 * Start the automation loop
	 */
	public start(): void {
		if (this.intervalId) {
			devvitLogger.log('Already running');
			return;
		}

		devvitLogger.log('Starting button-clicking automation');
		this.config.enabled = true;
		this.broadcastStatus('Waiting for mission to be ready');

		// Check for buttons every 1500ms (1.5 seconds)
		// This is a fallback since we're not relying on messages
		// Increased from 500ms to reduce performance impact and logs
		this.intervalId = window.setInterval(() => {
			if (this.config.enabled && !this.isProcessing) {
				this.processButtons();
			}
		}, 1500);
	}

	/**
	 * Stop the automation loop
	 */
	public stop(): void {
		devvitLogger.log('Stopping automation');
		this.config.enabled = false;

		if (this.intervalId) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	/**
	 * Update configuration
	 */
	public updateConfig(config: Partial<GameInstanceAutomationConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current state
	 */
	public getState(): any {
		return {
			enabled: this.config.enabled,
			isProcessing: this.isProcessing,
			inCombat: this.inCombat,
			hasMissionMetadata: !!this.missionMetadata,
			missionMetadata: this.missionMetadata, // Include full metadata
			missionDifficulty: this.missionMetadata?.mission?.difficulty,
			missionEnvironment: this.missionMetadata?.mission?.environment,
		};
	}

	/**
	 * Check if mission is cleared by looking for cleared indicators in the DOM
	 */
	private checkMissionCleared(): void {
		// Use utility function to check DOM
		const clearedImage = checkMissionClearedInDOM();
		if (clearedImage) {
			devvitLogger.log('Mission cleared detected via DOM (cleared image found)');

			// Get postId - prioritize the one we stored when initialData was received
			const postId = this.currentPostId;

			if (postId) {
				devvitLogger.log('Marking mission as cleared', { postId });
				this.markMissionAsCleared(postId);
				// DON'T clear currentPostId here - we need it later when clicking Finish button
				// It will be cleared in tryClickContinue after we trigger navigation
			} else {
				devvitLogger.warn('Mission appears cleared but no postId available');
			}
		}
	}

	/**
	 * Check if player is dead (out of lives)
	 * Looks for .lives-container with empty hearts
	 */
	private checkPlayerDead(): boolean {
		const livesContainer = document.querySelector('.lives-container');
		if (!livesContainer) {
			return false; // No lives container means we're not in a mission or lives UI isn't visible
		}

		// Check for empty hearts (Heart_Empty.png)
		const emptyHearts = livesContainer.querySelectorAll('img[src*="Heart_Empty.png"]');
		const totalHearts = livesContainer.querySelectorAll('.liveheart').length;

		// If we have hearts displayed and they're all empty, player is dead
		if (totalHearts > 0 && emptyHearts.length === totalHearts) {
			devvitLogger.log('Player is dead - all hearts empty', {
				totalHearts,
				emptyHearts: emptyHearts.length,
			});
			return true;
		}

		// Also check for "Recover in" text which indicates no lives
		const recoverText = livesContainer.querySelector('.recover-container');
		if (recoverText && recoverText.textContent?.includes('Recover in')) {
			devvitLogger.log('Player is dead - recovery timer found', {
				recoverText: recoverText.textContent,
			});
			return true;
		}

		return false;
	}

	/**
	 * Main logic - detect game state first, then click appropriate button
	 */
	private async processButtons(): Promise<void> {
		this.isProcessing = true;

		try {
			// Check if player is dead (out of lives)
			if (this.checkPlayerDead()) {
				devvitLogger.error('Player is dead, stopping automation');
				this.stop();
				chrome.runtime.sendMessage({
					type: 'ERROR_OCCURRED',
					message: 'Out of lives - player is dead. Automation stopped.',
				});
				this.isProcessing = false;
				return;
			}

			// Check for mission completion indicators
			this.checkMissionCleared();

			// Skip if in combat (let the battle play out)
			if (this.inCombat) {
				this.isProcessing = false;
				return;
			}

			const buttons = this.findAllButtons();

			if (buttons.length === 0) {
				this.isProcessing = false;
				return;
			}

			// STEP 1: Detect game state based on available buttons
			const gameState = this.detectGameState(buttons);

			// Skip logging for in-progress state (combat happening) to reduce spam
			if (gameState === 'in_progress') {
				this.isProcessing = false;
				return;
			}

			if (gameState === 'unknown') {
				devvitLogger.log('Unknown game state, skipping', {
					buttonClasses: buttons.map((b) => b.className),
				});
				this.isProcessing = false;
				return;
			}

			// Log actionable states with button info
			devvitLogger.log('Detected game state', {
				state: gameState,
				buttons: buttons.map((b) => `${b.className}: "${b.textContent?.trim()}"`),
				count: buttons.length,
			});

			// STEP 2: Click the appropriate button based on detected state
			const clickedButton = await this.clickForState(gameState, buttons);

			if (clickedButton) {
				devvitLogger.log('Clicked button', {
					state: gameState,
					button: clickedButton,
				});
				// Wait before next check
				await this.delay(this.config.clickDelay);
			}
		} catch (error) {
			devvitLogger.error('Error processing buttons', { error });
		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * Detect current game state based on available buttons
	 */
	private detectGameState(buttons: HTMLElement[]): string {
		const buttonTexts = buttons.map((b) => b.textContent?.trim().toLowerCase() || '');
		const buttonClasses = buttons.map((b) => b.className);

		// Check for skip button (intro/dialogue)
		if (buttonClasses.some((c) => c.includes('skip-button'))) {
			return 'skip';
		}

		// Check for finish/dismiss button (mission complete) - check classes first, then text
		// This should come before 'continue' check to prioritize mission completion
		if (
			buttonClasses.some((c) => c.includes('dismiss-button')) ||
			buttonTexts.some(
				(t) => t === 'finish' || t.includes('finish') || t === 'dismiss' || t.includes('dismiss'),
			)
		) {
			return 'finish';
		}

		// Check for continue button (intermediate screens)
		if (
			buttonTexts.some((t) => t === 'continue') ||
			buttonClasses.some((c) => c.includes('continue-button'))
		) {
			return 'continue';
		}

		// Check for crossroads (Fight/Skip mini boss)
		if (buttonTexts.includes('fight') && buttonTexts.includes('skip')) {
			return 'crossroads';
		}

		// Check for skill bargains (Accept/Decline)
		if (buttonTexts.includes('accept') && buttonTexts.includes('decline')) {
			return 'skill_bargain';
		}

		// Check for ability choices (multiple skill buttons)
		if (buttonClasses.filter((c) => c.includes('skill-button')).length > 1) {
			return 'ability_choice';
		}

		// Check for battle/advance buttons
		if (buttonClasses.some((c) => c.includes('advance-button'))) {
			return 'battle';
		}

		// Check for in-progress state (combat happening, showing volume/settings buttons)
		if (
			buttonClasses.some(
				(c) => c.includes('volume-icon-button') || c.includes('ui-settings-button'),
			)
		) {
			return 'in_progress';
		}

		return 'unknown';
	}

	/**
	 * Click the appropriate button for the detected game state
	 */
	private async clickForState(state: string, buttons: HTMLElement[]): Promise<string | null> {
		switch (state) {
			case 'skip':
				return this.tryClickSkip(buttons);
			case 'finish':
				return await this.tryClickContinue(buttons); // Handles finish button
			case 'continue':
				return await this.tryClickContinue(buttons);
			case 'crossroads':
				return this.tryClickCrossroads(buttons);
			case 'skill_bargain':
				return this.tryClickSkillBargain(buttons);
			case 'ability_choice':
				return this.tryClickAbility(buttons);
			case 'battle':
				return this.tryClickBattle(buttons);
			default:
				return null;
		}
	}

	/**
	 * Find all clickable game buttons (matching working userscript pattern)
	 */
	private findAllButtons(): HTMLElement[] {
		const buttons: HTMLElement[] = [];

		// Match the working userscript pattern exactly
		// Look for: .advance-button, .skill-button, .skip-button
		const selectors = [
			'.advance-button',
			'.skill-button',
			'.skip-button',
			'button', // Also include regular buttons
		];

		for (const selector of selectors) {
			const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
			for (const element of elements) {
				// For advance-button, check if parent wrapper has button-hidden class
				// If it does, skip this button (it's not clickable yet)
				if (selector === '.advance-button') {
					const parent = element.parentElement;
					if (parent && parent.classList.contains('advance-button-wrapper')) {
						if (parent.classList.contains('button-hidden')) {
							continue; // Skip hidden advance buttons
						}
					}
				}

				// Check if element is visible
				const rect = element.getBoundingClientRect();
				const isVisible = rect.width > 0 && rect.height > 0;

				if (isVisible && !buttons.includes(element)) {
					buttons.push(element);
				}
			}
		}

		return buttons;
	}

	/**
	 * Try to click skip button
	 */
	private tryClickSkip(buttons: HTMLElement[]): string | null {
		const skipButton = buttons.find((b) => b.classList.contains('skip-button'));

		if (skipButton) {
			this.clickElement(skipButton);
			return 'skip-button';
		}

		return null;
	}

	/**
	 * Try to click "Battle" button (or any advance-button)
	 */
	private tryClickBattle(buttons: HTMLElement[]): string | null {
		// Priority 1: Look for "Battle" text
		let battleButton = buttons.find((b) => b.textContent?.trim().toLowerCase() === 'battle');

		// Priority 2: If no "Battle" text, look for .advance-button class
		if (!battleButton) {
			battleButton = buttons.find((b) => b.classList.contains('advance-button'));
		}

		if (battleButton) {
			this.clickElement(battleButton);
			return battleButton.textContent?.trim() || 'advance-button';
		}

		return null;
	}

	/**
	 * Click an element (simple native click like working userscript)
	 */
	private clickElement(element: HTMLElement): void {
		// Just use native click - this is what works in the userscript
		element.click();
	}

	/**
	 * Try to click crossroads mini boss encounter button (Let's Fight / Skip)
	 */
	private tryClickCrossroads(buttons: HTMLElement[]): string | null {
		// Look for "Let's Fight" and "Skip" buttons (crossroads encounter)
		const fightButton = buttons.find((b) => {
			const text = b.textContent?.trim().toLowerCase() || '';
			return text.includes("let's fight") || text.includes('fight');
		});
		const skipButton = buttons.find((b) => {
			const text = b.textContent?.trim().toLowerCase() || '';
			// Only match "Skip" in crossroads context (not general skip-button)
			return text === 'skip' && !b.classList.contains('skip-button');
		});

		// Only process if we have both buttons (it's a crossroads encounter)
		if (fightButton && skipButton) {
			if (this.config.crossroadsStrategy === 'fight') {
				this.clickElement(fightButton);
				return `Crossroads: ${fightButton.textContent?.trim()} (fight strategy)`;
			} else {
				this.clickElement(skipButton);
				return `Crossroads: ${skipButton.textContent?.trim()} (skip strategy)`;
			}
		}

		return null;
	}

	/**
	 * Try to click ability button based on tier list (skill-button class)
	 * Also handles blessing stat choices
	 */
	private tryClickAbility(buttons: HTMLElement[]): string | null {
		// Look for skill buttons
		const skillButtons = buttons.filter((b) => b.classList.contains('skill-button'));

		if (skillButtons.length === 0) {
			return null;
		}

		// Check if this is a blessing encounter (stat choices like "Increase Speed by X%")
		const isBlessing = skillButtons.some((b) => {
			const text = b.textContent?.trim() || '';
			return /Increase (Speed|Attack|Defense|Health|Crit|Dodge) by \d+%/.test(text);
		});

		if (isBlessing) {
			// Handle blessing stat choices based on priority
			// Safety check: ensure blessingStatPriority is an array
			const statPriority = Array.isArray(this.config.blessingStatPriority)
				? this.config.blessingStatPriority
				: DEFAULT_GIAE_CONFIG.blessingStatPriority;

			for (const stat of statPriority) {
				const blessingButton = skillButtons.find((b) => {
					const text = b.textContent?.trim() || '';
					return text.includes(`Increase ${stat}`);
				});

				if (blessingButton) {
					this.clickElement(blessingButton);
					return `Blessing: ${blessingButton.textContent?.trim()}`;
				}
			}
		}

		// Look for ability names from our tier list
		// Safety check: ensure abilityTierList is an array
		const abilityList = Array.isArray(this.config.abilityTierList)
			? this.config.abilityTierList
			: DEFAULT_GIAE_CONFIG.abilityTierList;

		for (const abilityId of abilityList) {
			const abilityButton = skillButtons.find((b) => {
				const text = b.textContent?.trim() || '';
				// Match ability ID or readable name
				return text.includes(abilityId) || this.matchesAbilityName(text, abilityId);
			});

			if (abilityButton) {
				this.clickElement(abilityButton);
				return abilityButton.textContent?.trim() || abilityId;
			}
		}

		// If no preferred ability found, click the first skill button
		if (skillButtons.length > 0) {
			this.clickElement(skillButtons[0]);
			return skillButtons[0].textContent?.trim() || 'skill-button';
		}

		return null;
	}

	/**
	 * Try to click skill bargain button (Accept/Decline)
	 */
	private tryClickSkillBargain(buttons: HTMLElement[]): string | null {
		const acceptButton = buttons.find((b) => b.textContent?.trim().toLowerCase() === 'accept');
		const declineButton = buttons.find((b) => b.textContent?.trim().toLowerCase() === 'decline');

		// Only process if we have both buttons (it's a skill bargain)
		if (acceptButton && declineButton) {
			if (this.config.skillBargainStrategy === 'always') {
				this.clickElement(acceptButton);
				return 'Accept (always strategy)';
			} else if (this.config.skillBargainStrategy === 'never') {
				this.clickElement(declineButton);
				return 'Decline (never strategy)';
			} else if (this.config.skillBargainStrategy === 'positive-only') {
				// For now, default to accept if auto-accept is enabled
				// TODO: Parse the bargain text to determine if it's positive
				if (this.config.autoAcceptSkillBargains) {
					this.clickElement(acceptButton);
					return 'Accept (positive-only strategy - default accept)';
				} else {
					this.clickElement(declineButton);
					return 'Decline (positive-only strategy - default decline)';
				}
			}
		}

		return null;
	}

	/**
	 * Try to click "Continue" or "Finish" button
	 */
	private async tryClickContinue(buttons: HTMLElement[]): Promise<string | null> {
		// Check for "Finish" button or "dismiss-button" class first (mission complete)
		const finishButton = buttons.find((b) => {
			// Check for dismiss-button class
			if (b.classList.contains('dismiss-button')) return true;

			// Check text content
			const text = b.textContent?.trim().toLowerCase() || '';
			return (
				text === 'finish' ||
				text.includes('finish') ||
				text === 'dismiss' ||
				text.includes('dismiss')
			);
		});

		if (finishButton) {
			this.clickElement(finishButton);

			// Mark mission as cleared when clicking Finish/Dismiss
			let postId = this.currentPostId || this.missionMetadata?.postId;

			// Fallback: try to extract postId from URL if still null
			if (!postId) {
				postId = extractPostIdFromUrl(window.location.href);
				devvitLogger.log('Extracted postId from URL as fallback', { postId });
			}

			devvitLogger.log('Finish button clicked, checking postId', {
				currentPostId: this.currentPostId,
				metadataPostId: this.missionMetadata?.postId,
				finalPostId: postId,
			});

			if (postId) {
				devvitLogger.log('Mission cleared! Clicking Finish/Dismiss button', {
					postId,
				});

				// IMPORTANT: Wait for mission to be marked as cleared in storage
				// before notifying background to find next mission
				// This prevents race condition where next mission search finds
				// the same (not-yet-cleared) mission
				await this.markMissionAsCleared(postId);
				devvitLogger.log(
					'Mission marked as cleared in storage. Will emit MISSION_COMPLETED event',
					{
						postId,
					},
				);

				// Notify background that mission is completed
				chrome.runtime.sendMessage({
					type: 'MISSION_COMPLETED',
					missionId: postId,
				});

				// Clear the postId now that background will handle navigation
				this.currentPostId = null;
			} else {
				devvitLogger.warn('Finish button clicked but no postId available!', {
					currentPostId: this.currentPostId,
					metadataPostId: this.missionMetadata?.postId,
					hasMissionMetadata: !!this.missionMetadata,
					url: window.location.href,
				});
			}

			return 'Finish (Mission Complete!)';
		}

		// Then check for "Continue" button
		const continueButton = buttons.find((b) => {
			// Check text content
			const text = b.textContent?.trim().toLowerCase() || '';
			if (text === 'continue') return true;

			// Check for continue-button class
			if (b.classList.contains('continue-button')) return true;

			// Check for img with alt="Continue"
			const img = b.querySelector('img[alt="Continue"]');
			if (img) return true;

			return false;
		});

		if (continueButton) {
			this.clickElement(continueButton);
			return 'Continue';
		}

		return null;
	}

	/**
	 * Match ability readable name to ability ID
	 */
	private matchesAbilityName(buttonText: string, abilityId: string): boolean {
		const nameMap: Record<string, string[]> = {
			IceKnifeOnTurnStart: ['ice knife', 'iceknife'],
			LightningOnCrit: ['lightning', 'crit lightning'],
			HealOnFirstTurn: ['heal', 'healing', 'first turn heal'],
		};

		const variants = nameMap[abilityId] || [];
		const lowerText = buttonText.toLowerCase();
		return variants.some((variant) => lowerText.includes(variant));
	}

	/**
	 * Delay helper
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

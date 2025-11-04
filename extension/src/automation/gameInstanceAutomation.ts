/**
 * Game Instance Automation Engine
 * Smart automation for game missions
 */

import { devvitGIAELogger as logger } from '../utils/logger';
import { GameState } from './GameState';
import { DecisionMaker } from './DecisionMaker';
import { extractPostIdFromUrl } from '../content/devvit/utils/extractPostIdFromUrl';
import { getMission, saveMission } from '../lib/storage/missions';
import type { MissionMetadata, MissionRecord } from '../types';

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
	crossroadsStrategy: 'fight', // Fight mini bosses by default
	clickDelay: 1000,
};

export class GameInstanceAutomationEngine {
	private config: GameInstanceAutomationConfig;
	public gameState: GameState;
	private decisionMaker: DecisionMaker;
	private intervalId: number | null = null;
	private isProcessing = false;

	// Public properties for compatibility
	public currentPostId: string | null = null;
	public missionMetadata: MissionMetadata | null = null;

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

		this.gameState = new GameState();
		this.decisionMaker = new DecisionMaker(this.gameState, this.config);

		this.setupMessageListener();
		logger.log('Game automation engine initialized');
	}

	private setupMessageListener(): void {
		window.addEventListener('message', (event: MessageEvent) => {
			try {
				// initialData
				if (
					event.data?.type === 'devvit-message' &&
					event.data?.data?.message?.type === 'initialData'
				) {
					const data = event.data.data.message.data;
					this.gameState.setMissionData(data.missionMetadata, data.postId);

					// Set properties for compatibility
					this.currentPostId = data.postId;
					this.missionMetadata = data.missionMetadata;

					// Verify/fallback to storage data (fire and forget)
					this.gameState.loadMissionDataFromStorage(data.postId).catch((err) => {
						logger.error('[GIAE] Failed to load mission data from storage', err);
					});

					logger.log('Mission started', {
						postId: data.postId,
						encounters: this.gameState.totalEncounters,
						difficulty: this.gameState.difficulty,
					});

					// Report initial state to background
					this.reportGameState();
				}

				// missionComplete
				if (event.data?.data?.message?.type === 'missionComplete') {
					const postId = event.data.data.message.data?.postId;
					if (postId) {
						logger.log('Mission complete', { postId });
						chrome.runtime.sendMessage({
							type: 'MISSION_COMPLETED',
							postId,
						});
					}
				}
			} catch (error) {
				logger.error('Message error', { error: String(error) });
			}
		});
	}

	start(): void {
		if (this.intervalId) return;

		this.config.enabled = true;
		logger.log('Starting automation');

		this.intervalId = window.setInterval(() => {
			if (this.config.enabled && !this.isProcessing) {
				this.processGame();
			}
		}, 1500);
	}

	stop(): void {
		logger.log('Stopping automation');
		this.config.enabled = false;

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	private async processGame(): Promise<void> {
		this.isProcessing = true;

		try {
			// Proactively load mission data from storage if we have postId but no metadata
			// This handles the case where automation starts before initialData message arrives
			let postId = this.currentPostId;

			// If no postId yet, try extracting from URL
			if (!postId) {
				postId = extractPostIdFromUrl(window.location.href);
				if (postId) {
					logger.log('Extracted postId from URL', { postId });
					this.currentPostId = postId;
					this.gameState.postId = postId;
				}
			}

			// Load metadata from storage if we have postId but no metadata
			if (postId && !this.gameState.missionMetadata) {
				if (!this.gameState._storageLoadAttempted) {
					logger.log('Loading mission metadata from storage (initialData not yet received)');
					await this.gameState.loadMissionDataFromStorage(postId);
				}
			}

			// Update state from DOM
			this.gameState.updateFromDOM();

			// Check if dead
			if (!this.gameState.isAlive()) {
				logger.error('Out of lives');
				this.stop();
				chrome.runtime.sendMessage({
					type: 'ERROR_OCCURRED',
					message: 'Out of lives',
				});
				return;
			}

			// Find buttons
			const buttons = this.findAllButtons();
			if (buttons.length === 0) return;

			// Detect screen
			const screen = this.detectScreen(buttons);
			const screenChanged = this.gameState.currentScreen !== screen;
			this.gameState.currentScreen = screen;

			// Report state update if screen changed
			if (screenChanged) {
				this.reportGameState();
			}

			// Handle screen (if actionable)
			if (screen !== 'unknown' && screen !== 'in_progress') {
				// Log encounter metadata for debugging (but don't use for detection)
				const encounterType = this.gameState.getCurrentEncounterType();
				logger.log('Screen', {
					screen,
					lives: this.gameState.livesRemaining,
					playSafe: this.gameState.shouldPlaySafe(),
					encounter: this.gameState.getProgress(),
					encounterType, // For debugging - compare with detected screen
				});

				await this.handleScreen(screen, buttons);
				await this.delay(this.config.clickDelay || 300);
			}
		} catch (error) {
			logger.error('Process error', { error: String(error) });
		} finally {
			this.isProcessing = false;
		}
	}

	private detectScreen(buttons: HTMLElement[]): string {
		const texts = buttons.map((b) => b.textContent?.trim().toLowerCase() || '');
		const classes = buttons.map((b) => b.className);

		// Inn check
		const tooltip = document.querySelector('.navbar-tooltip');
		if (tooltip?.textContent?.includes('Find and play missions')) {
			return 'inn';
		}

		// ============================================================================
		// PURE DOM-BASED SCREEN DETECTION
		// We don't use metadata for detection because it gets out of sync when we
		// click buttons and advance the counter before the DOM updates
		// ============================================================================

		// Skip button (intro/story)
		if (classes.some((c) => c.includes('skip-button'))) return 'skip';

		// Mission end screen
		if (document.querySelector('.mission-end-footer')) return 'finish';

		// Battle screen (advance button)
		if (classes.some((c) => c.includes('advance-button'))) {
			return 'battle';
		}

		// Crossroads mini-boss (has both "fight" and "nope" buttons)
		if (texts.some((t) => t.includes('fight')) && texts.some((t) => t.includes('nope'))) {
			return 'crossroads';
		}

		// Skill bargain (has "refuse" or both "accept" and "decline")
		if (texts.includes('refuse') || (texts.includes('accept') && texts.includes('decline'))) {
			return 'bargain';
		}

		// Choice screen (multiple skill buttons - blessing or ability choice)
		if (classes.filter((c) => c.includes('skill-button')).length > 1) return 'choice';

		// Continue button
		if (texts.includes('continue')) return 'continue';

		// In progress (only UI buttons visible)
		if (classes.some((c) => c.includes('volume-icon-button'))) {
			return 'in_progress';
		}

		return 'unknown';
	}

	private async handleScreen(screen: string, buttons: HTMLElement[]): Promise<void> {
		let actionTaken = false;

		switch (screen) {
			case 'skip': {
				// Skip intro/story
				const skipBtn = buttons.find((b) => b.classList.contains('skip-button'));
				if (skipBtn) {
					skipBtn.click();
					actionTaken = true;
				}
				break;
			}

			case 'battle': {
				const advanceBtn = buttons.find((b) => b.classList.contains('advance-button'));
				if (advanceBtn) {
					logger.log('Clicking advance button');
					advanceBtn.click();
					actionTaken = true;
				}
				break;
			}

			case 'crossroads': {
				const choice = this.decisionMaker.decideCrossroads();
				logger.log('Crossroads decision', { choice });

				// Button text: "Let's Fight!" or "Nope"
				if (choice === 'fight') {
					const fightBtn = buttons.find((b) => b.textContent?.toLowerCase().includes('fight'));
					if (fightBtn) {
						fightBtn.click();
						actionTaken = true;
					}
				} else {
					// choice === 'skip'
					const skipBtn = buttons.find((b) => b.textContent?.toLowerCase().includes('nope'));
					if (skipBtn) {
						skipBtn.click();
						actionTaken = true;
					}
				}
				break;
			}

			case 'bargain': {
				// Read bargain text from page
				const bargainText = document.body.textContent || '';
				const choice = this.decisionMaker.decideSkillBargain(bargainText);
				logger.log('Bargain decision', {
					choice,
					bargainText: bargainText.substring(0, 200),
				});

				// Find skill buttons
				const skillButtons = buttons.filter((b) => b.classList.contains('skill-button'));
				logger.log('Bargain buttons found', {
					count: skillButtons.length,
					buttons: skillButtons.map((b) => b.textContent?.trim()),
				});

				if (choice === 'accept') {
					// Accept: click the bargain button (NOT "Refuse" or "Decline")
					const acceptBtn = skillButtons.find((b) => {
						const text = b.textContent?.trim().toLowerCase() || '';
						return text !== 'refuse' && text !== 'decline';
					});
					if (acceptBtn) {
						logger.log('Clicking accept button', { text: acceptBtn.textContent?.trim() });
						acceptBtn.click();
						actionTaken = true;
					}
				} else {
					// Decline: click "Refuse" or "Decline" button, or pick last skill button as fallback
					const declineBtn = skillButtons.find((b) => {
						const text = b.textContent?.trim().toLowerCase() || '';
						return text === 'refuse' || text === 'decline';
					});
					if (declineBtn) {
						logger.log('Clicking decline button', { text: declineBtn.textContent?.trim() });
						declineBtn.click();
						actionTaken = true;
					} else if (skillButtons.length > 0) {
						// Fallback: if no explicit decline button (like monolith), click last skill button
						const fallbackBtn = skillButtons[skillButtons.length - 1];
						logger.log('No decline button, clicking last skill button as fallback', {
							text: fallbackBtn.textContent?.trim(),
						});
						fallbackBtn.click();
						actionTaken = true;
					}
				}
				break;
			}

			case 'choice': {
				const skillButtons = buttons.filter((b) => b.classList.contains('skill-button'));

				// Use DOM to determine blessing vs ability choice
				const panelHeader = document.querySelector('.ui-panel-header');
				const headerText = panelHeader?.textContent?.toLowerCase() || '';

				// Try to extract blessing stats from button text
				const blessingStats = skillButtons
					.map((b) => {
						const text = b.textContent?.trim() || '';
						const match = text.match(/Increase (\w+) by \d+%/);
						return match ? match[1] : null;
					})
					.filter((stat): stat is string => !!stat);

				let buttonClicked = false;

				// If we found blessing patterns OR header mentions blessing, it's a blessing choice
				if (blessingStats.length > 0 || headerText.includes('blessing') || headerText.includes('boon')) {
					// Handle blessing (statsChoice)
					logger.log('Blessing detected (DOM)', { headerText, blessingStats });

					if (blessingStats.length > 0) {
						this.recordDiscoveredBlessingStats(blessingStats);

						const chosen = this.decisionMaker.pickBlessing(blessingStats);
						logger.log('Blessing choice', { chosen, available: blessingStats });

						const btn = skillButtons.find((b) =>
							b.textContent?.toLowerCase().includes(chosen.toLowerCase()),
						);
						if (btn) {
							btn.click();
							buttonClicked = true;
						}
					}
				} else {
					// Handle ability choices
					logger.log('Ability choice detected (DOM)', { headerText });

					const abilities = skillButtons.map((b) => b.textContent?.trim() || '');

					if (abilities.length > 0) {
						this.recordDiscoveredAbilities(abilities);

						const chosen = this.decisionMaker.pickAbility(abilities);
						logger.log('Ability choice', { chosen, available: abilities });

						const btn = buttons.find((b) => b.textContent?.includes(chosen));
						if (btn) {
							btn.click();
							buttonClicked = true;
						}
					}
				}

				// Fallback: if no button was clicked, pick the first skill button
				if (!buttonClicked && skillButtons.length > 0) {
					logger.log('No specific choice made, picking first button as fallback', {
						firstButtonText: skillButtons[0].textContent?.trim(),
					});
					skillButtons[0].click();
					buttonClicked = true;
				}

				actionTaken = buttonClicked;
				break;
			}

			case 'continue':
			case 'finish': {
				const btn = buttons.find(
					(b) =>
						b.textContent?.toLowerCase() === 'continue' ||
						b.classList.contains('end-mission-button'),
				);
				if (btn) {
					btn.click();
					actionTaken = true;
				}
				break;
			}

			case 'inn':
				// Mission completion is already handled by the window message listener
				// (setupMessageListener catches 'missionComplete' event from the game)
				// We just need to detect the screen but not send duplicate MISSION_COMPLETED messages
				logger.log('Inn detected (mission complete)', {
					postId: this.gameState.postId,
				});
				actionTaken = true; // No action needed, but we handled it
				break;
		}

		// Global fallback: if no action was taken, click the first available button
		if (!actionTaken && buttons.length > 0) {
			logger.warn('No action taken for screen, clicking first available button as fallback', {
				screen,
				buttonCount: buttons.length,
				firstButton: {
					text: buttons[0].textContent?.trim(),
					classes: buttons[0].className,
				},
			});
			buttons[0].click();
		}
	}

	private findAllButtons(): HTMLElement[] {
		const selectors = ['.advance-button', '.skill-button', '.skip-button', 'button'];
		const buttons: HTMLElement[] = [];

		for (const selector of selectors) {
			document.querySelectorAll(selector).forEach((el) => {
				const rect = el.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					buttons.push(el as HTMLElement);
				}
			});
		}

		return buttons;
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Public API
	updateConfig(config: Partial<GameInstanceAutomationConfig>): void {
		this.config = { ...this.config, ...config };
	}

	getState(): string {
		return this.config.enabled ? 'running' : 'stopped';
	}

	getGameState(): any {
		return {
			enabled: this.config.enabled,
			screen: this.gameState.currentScreen,
			lives: this.gameState.livesRemaining,
			progress: this.gameState.getProgress(),
			postId: this.gameState.postId,
			encounterCurrent: this.gameState.currentEncounter,
			encounterTotal: this.gameState.totalEncounters,
			playSafe: this.gameState.shouldPlaySafe(),
			difficulty: this.gameState.difficulty,
		};
	}

	// Report game state to background service worker
	private reportGameState(): void {
		try {
			chrome.runtime.sendMessage({
				type: 'GAME_STATE_UPDATE',
				gameState: this.getGameState(),
			});
		} catch (error) {
			// Silently fail if background is not available
			logger.error('Failed to report game state', { error: String(error) });
		}
	}

	// Save mission to database
	public async saveMissionToDatabase(
		postId: string,
		username: string,
		metadata: MissionMetadata,
	): Promise<void> {
		try {
			const mission = metadata.mission;
			if (!mission) return;

			const existingMission = await getMission(postId);

			// Build permalink URL from postId
			const permalink = postId.startsWith('t3_')
				? `https://www.reddit.com/r/SwordAndSupperGame/comments/${postId.slice(3)}/`
				: '';

			// Build flat MissionRecord
			const record: MissionRecord = {
				postId,
				timestamp: existingMission?.timestamp || Date.now(),
				permalink,
				missionTitle: metadata.missionTitle || mission.foodName || 'Unknown',
				missionAuthorName: metadata.missionAuthorName || 'Unknown',
				environment: mission.environment,
				encounters: mission.encounters || [],
				minLevel: mission.minLevel,
				maxLevel: mission.maxLevel,
				difficulty: mission.difficulty,
				foodImage: mission.foodImage,
				foodName: mission.foodName,
				authorWeaponId: mission.authorWeaponId,
				chef: mission.chef,
				cart: mission.cart,
				rarity: mission.rarity,
				type: mission.type,
			};

			await saveMission(record);

			if (existingMission) {
				logger.log('Mission data enriched', {
					postId,
					difficulty: record.difficulty,
					environment: record.environment,
				});
			} else {
				logger.log('🆕 NEW MISSION discovered', {
					postId,
					difficulty: record.difficulty,
					foodName: mission.foodName,
				});
			}
		} catch (error) {
			logger.error('Failed to save mission', { error: String(error) });
		}
	}

	/**
	 * Record discovered abilities to storage for user reference
	 */
	private recordDiscoveredAbilities(abilityNames: string[]): void {
		try {
			chrome.storage.local.get(['discoveredAbilities'], (result) => {
				const existing = new Set<string>(result.discoveredAbilities || []);
				let added = false;

				for (const name of abilityNames) {
					if (!existing.has(name)) {
						existing.add(name);
						added = true;
					}
				}

				if (added) {
					chrome.storage.local.set({ discoveredAbilities: Array.from(existing) });
					logger.log('Discovered new abilities', {
						newAbilities: abilityNames.filter((n) => !result.discoveredAbilities?.includes(n)),
						total: existing.size,
					});
				}
			});
		} catch (error) {
			// Silently fail - this is not critical
			logger.error('Failed to record discovered abilities', { error: String(error) });
		}
	}

	/**
	 * Record discovered blessing stats to storage for user reference
	 */
	private recordDiscoveredBlessingStats(statNames: string[]): void {
		try {
			chrome.storage.local.get(['discoveredBlessingStats'], (result) => {
				const existing = new Set<string>(result.discoveredBlessingStats || []);
				let added = false;

				for (const name of statNames) {
					if (!existing.has(name)) {
						existing.add(name);
						added = true;
					}
				}

				if (added) {
					chrome.storage.local.set({ discoveredBlessingStats: Array.from(existing) });
					logger.log('Discovered new blessing stats', {
						newStats: statNames.filter((n) => !result.discoveredBlessingStats?.includes(n)),
						total: existing.size,
					});
				}
			});
		} catch (error) {
			// Silently fail - this is not critical
			logger.error('Failed to record discovered blessing stats', { error: String(error) });
		}
	}
}

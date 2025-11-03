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
			// Note: At index -1 (pre-game), encounterType will be null
			// and we'll rely on DOM detection, which should work fine
			if (screen !== 'unknown' && screen !== 'in_progress') {
				logger.log('Screen', {
					screen,
					lives: this.gameState.livesRemaining,
					playSafe: this.gameState.shouldPlaySafe(),
					encounter: this.gameState.getProgress(),
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

	/**
	 * Advance to next encounter after completing current one
	 */
	private advanceEncounter(): void {
		const previousEncounter = this.gameState.currentEncounter;
		const nextEncounter = previousEncounter + 1;

		this.gameState.onEncounterComplete(nextEncounter);

		logger.log('Encounter advanced', {
			from: previousEncounter,
			to: nextEncounter,
			progress: this.gameState.getProgress(),
		});

		// Report state update to background
		this.reportGameState();
	}

	private detectScreen(buttons: HTMLElement[]): string {
		const texts = buttons.map((b) => b.textContent?.trim().toLowerCase() || '');
		const classes = buttons.map((b) => b.className);

		// Check encounter type from metadata (most reliable)
		const encounterType = this.gameState.getCurrentEncounterType();

		// Inn check
		const tooltip = document.querySelector('.navbar-tooltip');
		if (tooltip?.textContent?.includes('Find and play missions')) {
			return 'inn';
		}

		// Screen detection
		if (classes.some((c) => c.includes('skip-button'))) return 'skip';
		if (document.querySelector('.mission-end-footer')) return 'finish';

		// Crossroads mini-boss detection - primary: encounter type, fallback: button text
		if (
			encounterType === 'crossroadsFight' ||
			(texts.some((t) => t.includes('fight')) && texts.some((t) => t.includes('nope')))
		) {
			return 'crossroads';
		}

		// Check for battle BEFORE bargain to avoid metadata/reality mismatch
		// If we see an advance button, it's definitely a battle regardless of metadata
		if (classes.some((c) => c.includes('advance-button'))) {
			// Warn if metadata doesn't match reality (but not for initial battle at index -1)
			if (this.gameState.currentEncounter !== -1 && encounterType && encounterType !== 'enemy') {
				logger.warn('Battle screen but metadata says different encounter type!', {
					encounterType,
					currentEncounter: this.gameState.currentEncounter,
					totalEncounters: this.gameState.totalEncounters,
					nextEncounterType:
						this.gameState.missionMetadata?.mission?.encounters?.[
							this.gameState.currentEncounter + 1
						]?.type,
				});
			}
			return 'battle';
		}

		// Skill bargain detection - primary: encounter type, fallback: button text
		const isBargainByMetadata = encounterType === 'skillBargain';
		const isBargainByDOM =
			texts.includes('refuse') || (texts.includes('accept') && texts.includes('decline'));

		if (isBargainByMetadata || isBargainByDOM) {
			logger.log('Bargain detection triggered', {
				encounterType,
				isBargainByMetadata,
				isBargainByDOM,
				buttonTexts: texts,
				buttonClasses: classes,
			});
			return 'bargain';
		}

		if (classes.filter((c) => c.includes('skill-button')).length > 1) return 'choice';
		if (texts.includes('continue')) return 'continue';

		// In progress (only UI buttons)
		if (classes.some((c) => c.includes('volume-icon-button'))) {
			return 'in_progress';
		}

		return 'unknown';
	}

	private async handleScreen(screen: string, buttons: HTMLElement[]): Promise<void> {
		switch (screen) {
			case 'skip':
				// Skip intro - doesn't advance encounter counter
				this.clickByClass(buttons, 'skip-button');
				break;

			case 'battle':
				this.clickByClass(buttons, 'advance-button');
				// Battle completed, advance encounter
				this.advanceEncounter();
				break;

			case 'crossroads': {
				const choice = this.decisionMaker.decideCrossroads();
				logger.log('Crossroads decision', { choice });

				// Button text: "Let's Fight!" or "Nope"
				if (choice === 'fight') {
					const fightBtn = buttons.find((b) => b.textContent?.toLowerCase().includes('fight'));
					if (fightBtn) {
						fightBtn.click();
						// Crossroads completed, advance encounter
						this.advanceEncounter();
					}
				} else {
					// choice === 'skip'
					const skipBtn = buttons.find((b) => b.textContent?.toLowerCase().includes('nope'));
					if (skipBtn) {
						skipBtn.click();
						// Crossroads completed, advance encounter
						this.advanceEncounter();
					}
				}
				break;
			}

			case 'bargain': {
				// Read bargain text from page
				const bargainText = document.body.textContent || '';
				const choice = this.decisionMaker.decideSkillBargain(bargainText);
				logger.log('Bargain decision', { choice });

				// Find skill buttons
				const skillButtons = buttons.filter((b) => b.classList.contains('skill-button'));

				if (choice === 'accept') {
					// Accept: click the bargain button (NOT "Refuse" or "Decline")
					const acceptBtn = skillButtons.find((b) => {
						const text = b.textContent?.trim().toLowerCase() || '';
						return text !== 'refuse' && text !== 'decline';
					});
					if (acceptBtn) {
						acceptBtn.click();
						// Bargain completed, advance encounter
						this.advanceEncounter();
					}
				} else {
					// Decline: click "Refuse" or "Decline" button
					const declineBtn = skillButtons.find((b) => {
						const text = b.textContent?.trim().toLowerCase() || '';
						return text === 'refuse' || text === 'decline';
					});
					if (declineBtn) {
						declineBtn.click();
						// Bargain completed, advance encounter
						this.advanceEncounter();
					}
				}
				break;
			}

			case 'choice': {
				const skillButtons = buttons.filter((b) => b.classList.contains('skill-button'));

				// Determine encounter type using metadata (most reliable)
				const encounterType = this.gameState.getCurrentEncounterType();
				const panelHeader = document.querySelector('.ui-panel-header');
				const headerText = panelHeader?.textContent?.toLowerCase() || '';

				// Check encounter type from metadata
				const isBlessing = encounterType === 'statsChoice';
				const isAbility = encounterType === 'abilityChoice';

				// Fallback to DOM inspection if no metadata
				const isBlessingFallback =
					!encounterType && (headerText.includes('blessing') || headerText.includes('boon'));

				let buttonClicked = false;

				if (isBlessing || isBlessingFallback) {
					// Handle blessing (statsChoice)
					logger.log('Blessing detected', {
						method: isBlessing ? 'metadata' : 'header-fallback',
						encounterType,
						headerText,
					});

					// Extract stat names from blessing buttons (e.g., "Speed" from "Increase Speed by 10%")
					const blessingStats = skillButtons
						.map((b) => {
							const text = b.textContent?.trim() || '';
							const match = text.match(/Increase (\w+) by \d+%/);
							return match ? match[1] : null;
						})
						.filter((stat): stat is string => !!stat);

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
					// Handle ability choices (abilityChoice or unknown)
					logger.log('Ability choice detected', {
						method: isAbility ? 'metadata' : 'default',
						encounterType,
						headerText,
					});

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

				// Choice completed (ability or blessing), advance encounter
				if (buttonClicked) {
					this.advanceEncounter();
				}

				break;
			}

			case 'continue':
			case 'finish': {
				const btn = buttons.find(
					(b) =>
						b.textContent?.toLowerCase() === 'continue' ||
						b.classList.contains('end-mission-button'),
				);
				if (btn) btn.click();
				break;
			}

			case 'inn':
				if (this.gameState.postId) {
					logger.log('Inn detected, completing mission', {
						postId: this.gameState.postId,
					});
					chrome.runtime.sendMessage({
						type: 'MISSION_COMPLETED',
						postId: this.gameState.postId,
					});
				}
				break;
		}
	}

	private clickByClass(buttons: HTMLElement[], className: string): void {
		const btn = buttons.find((b) => b.classList.contains(className));
		if (btn) btn.click();
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

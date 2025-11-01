/**
 * Game Instance Automation Engine
 * Smart automation for game missions
 */

import { devvitGIAELogger as logger } from '../utils/logger';
import { GameState } from './GameState';
import { DecisionMaker } from './DecisionMaker';

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
	private gameState: GameState;
	private decisionMaker: DecisionMaker;
	private intervalId: number | null = null;
	private isProcessing = false;

	// Public properties for compatibility
	public currentPostId: string | null = null;
	public missionMetadata: any = null;

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

					logger.log('Mission started', {
						postId: data.postId,
						encounters: this.gameState.totalEncounters,
						difficulty: this.gameState.difficulty,
					});

					// Report initial state to background
					this.reportGameState();
				}

				// encounterResult
				if (event.data?.data?.message?.type === 'encounterResult') {
					const result = event.data.data.message.data;
					const idx = result.encounterAction?.encounterIndex;

					logger.log('encounterResult received', {
						encounterIndex: idx,
						currentEncounter: this.gameState.currentEncounter,
						totalEncounters: this.gameState.totalEncounters,
					});

					if (idx !== undefined) {
						this.gameState.onEncounterComplete(idx);
						logger.log('Encounter complete', {
							encounterIndex: idx,
							progress: this.gameState.getProgress(),
							lives: this.gameState.livesRemaining,
						});

						// Report state update to background
						this.reportGameState();
					}
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
				logger.log('Screen', {
					screen,
					lives: this.gameState.livesRemaining,
					playSafe: this.gameState.shouldPlaySafe(),
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

		// Screen detection
		if (classes.some((c) => c.includes('skip-button'))) return 'skip';
		if (document.querySelector('.mission-end-footer')) return 'finish';
		if (texts.includes('fight') && texts.includes('skip')) return 'crossroads';
		if (texts.includes('accept') && texts.includes('decline')) return 'bargain';
		if (classes.filter((c) => c.includes('skill-button')).length > 1) return 'choice';
		if (classes.some((c) => c.includes('advance-button'))) return 'battle';
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
				this.clickByClass(buttons, 'skip-button');
				break;

			case 'battle':
				this.clickByClass(buttons, 'advance-button');
				break;

			case 'crossroads': {
				const choice = this.decisionMaker.decideCrossroads();
				logger.log('Crossroads decision', { choice });

				const btn = buttons.find((b) => b.textContent?.toLowerCase().includes(choice));
				if (btn) btn.click();
				break;
			}

			case 'bargain': {
				// Read bargain text from page
				const bargainText = document.body.textContent || '';
				const choice = this.decisionMaker.decideSkillBargain(bargainText);
				logger.log('Bargain decision', { choice });

				const btn = buttons.find((b) => b.textContent?.toLowerCase() === choice);
				if (btn) btn.click();
				break;
			}

			case 'choice': {
				const abilities = buttons
					.filter((b) => b.classList.contains('skill-button'))
					.map((b) => b.textContent?.trim() || '');

				const chosen = this.decisionMaker.pickAbility(abilities);
				logger.log('Ability choice', { chosen, available: abilities });

				const btn = buttons.find((b) => b.textContent?.includes(chosen));
				if (btn) btn.click();
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
		metadata: any,
	): Promise<void> {
		try {
			const mission = metadata.mission;
			if (!mission) return;

			// Import storage functions
			const { getMission, saveMission } = await import('../lib/storage/missions');
			const existingMission = await getMission(postId);

			// Build permalink URL from postId
			const permalink = postId.startsWith('t3_')
				? `https://www.reddit.com/r/SwordAndSupperGame/comments/${postId.slice(3)}/`
				: '';

			// Build flat MissionRecord
			const record: any = {
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
				foodImage: mission.foodImage || '',
				foodName: mission.foodName || '',
				authorWeaponId: mission.authorWeaponId || '',
				chef: mission.chef || '',
				cart: mission.cart || '',
				rarity: mission.rarity || 'common',
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
}

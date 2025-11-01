/**
 * V2 Game Instance Automation Engine
 * Clean, simple, smart automation
 */

import { devvitGIAELogger as logger } from '../../utils/logger';
import { GameState } from './GameState';
import { DecisionMaker } from './DecisionMaker';
import type { GameInstanceAutomationConfig } from '../gameInstanceAutomation';

export class GameInstanceAutomationV2 {
	private config: GameInstanceAutomationConfig;
	private gameState: GameState;
	private decisionMaker: DecisionMaker;
	private intervalId: number | null = null;
	private isProcessing = false;

	// Public properties for compatibility with V1 interface
	public currentPostId: string | null = null;
	public missionMetadata: any = null;

	constructor(config: GameInstanceAutomationConfig) {
		this.config = config;
		this.gameState = new GameState();
		this.decisionMaker = new DecisionMaker(this.gameState, config);

		this.setupMessageListener();
		logger.log('[V2] Game automation engine initialized');
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

					// Set properties for compatibility with V1 interface
					this.currentPostId = data.postId;
					this.missionMetadata = data.missionMetadata;

					logger.log('[V2] Mission started', {
						postId: data.postId,
						encounters: this.gameState.totalEncounters,
						difficulty: this.gameState.difficulty,
					});
				}

				// encounterResult
				if (event.data?.data?.message?.type === 'encounterResult') {
					const result = event.data.data.message.data;
					const idx = result.encounterAction?.encounterIndex;

					if (idx !== undefined) {
						this.gameState.onEncounterComplete(idx);
						logger.log('[V2] Encounter complete', {
							progress: this.gameState.getProgress(),
							lives: this.gameState.livesRemaining,
						});
					}
				}

				// missionComplete
				if (event.data?.data?.message?.type === 'missionComplete') {
					const postId = event.data.data.message.data?.postId;
					if (postId) {
						logger.log('[V2] Mission complete', { postId });
						chrome.runtime.sendMessage({
							type: 'MISSION_COMPLETED',
							postId,
						});
					}
				}
			} catch (error) {
				logger.error('[V2] Message error', { error: String(error) });
			}
		});
	}

	start(): void {
		if (this.intervalId) return;

		this.config.enabled = true;
		logger.log('[V2] Starting automation');

		this.intervalId = window.setInterval(() => {
			if (this.config.enabled && !this.isProcessing) {
				this.processGame();
			}
		}, 1500);
	}

	stop(): void {
		logger.log('[V2] Stopping automation');
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
				logger.error('[V2] Out of lives');
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
			this.gameState.currentScreen = screen;

			// Handle screen (if actionable)
			if (screen !== 'unknown' && screen !== 'in_progress') {
				logger.log('[V2] Screen', {
					screen,
					lives: this.gameState.livesRemaining,
					playSafe: this.gameState.shouldPlaySafe(),
				});

				await this.handleScreen(screen, buttons);
				await this.delay(this.config.clickDelay || 300);
			}
		} catch (error) {
			logger.error('[V2] Process error', { error: String(error) });
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
				logger.log('[V2] Crossroads decision', { choice });

				const btn = buttons.find((b) => b.textContent?.toLowerCase().includes(choice));
				if (btn) btn.click();
				break;
			}

			case 'bargain': {
				// Read bargain text from page
				const bargainText = document.body.textContent || '';
				const choice = this.decisionMaker.decideSkillBargain(bargainText);
				logger.log('[V2] Bargain decision', { choice });

				const btn = buttons.find((b) => b.textContent?.toLowerCase() === choice);
				if (btn) btn.click();
				break;
			}

			case 'choice': {
				const abilities = buttons
					.filter((b) => b.classList.contains('skill-button'))
					.map((b) => b.textContent?.trim() || '');

				const chosen = this.decisionMaker.pickAbility(abilities);
				logger.log('[V2] Ability choice', { chosen, available: abilities });

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
					logger.log('[V2] Inn detected, completing mission', {
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

	// Public API (matches V1 interface)
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
			playSafe: this.gameState.shouldPlaySafe(),
			difficulty: this.gameState.difficulty,
		};
	}

	// Compatibility method for V1 interface
	public async saveMissionToDatabase(
		postId: string,
		username: string,
		metadata: any,
	): Promise<void> {
		try {
			const mission = metadata.mission;
			if (!mission) return;

			// Import storage functions
			const { getMission, saveMission } = await import('../../lib/storage/missions');
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
				logger.log('[V2] Mission data enriched', {
					postId,
					difficulty: record.difficulty,
					environment: record.environment,
				});
			} else {
				logger.log('[V2] 🆕 NEW MISSION discovered', {
					postId,
					difficulty: record.difficulty,
					foodName: mission.foodName,
				});
			}
		} catch (error) {
			logger.error('[V2] Failed to save mission', { error: String(error) });
		}
	}
}

/**
 * V2 Game State Tracker
 * Simple DOM-based state tracking
 */

import type { MissionMetadata, EncounterType } from '../types';
import { devvitGIAELogger as logger } from '../utils/logger';

export class GameState {
	// Player state
	livesRemaining: number = 3;

	// Mission progress
	currentEncounter: number = 0;
	totalEncounters: number = 0;

	// Mission info
	postId: string | null = null;
	difficulty: number | null = null;
	missionMetadata: MissionMetadata | null = null; // Full mission metadata including encounters

	// Current screen type
	currentScreen: string = 'unknown';

	/**
	 * Update state from DOM (called every tick)
	 */
	updateFromDOM(): void {
		this.livesRemaining = this.readLivesFromDOM();
	}

	/**
	 * Read lives from .lives-container in DOM
	 */
	private readLivesFromDOM(): number {
		const livesContainer = document.querySelector('.lives-container');
		if (!livesContainer) return 3; // Default

		// Count filled hearts
		const filledHearts = livesContainer.querySelectorAll('img[src*="Heart_Full.png"]').length;
		return filledHearts;
	}

	/**
	 * Set mission data from initialData message
	 */
	setMissionData(metadata: MissionMetadata, postId: string): void {
		this.postId = postId;
		this.missionMetadata = metadata;
		this.totalEncounters = metadata?.mission?.encounters?.length || 0;
		this.difficulty = metadata?.mission?.difficulty || null;

		// Mission always starts with an initial battle (not in encounters array)
		// Set index to -1 to indicate we haven't started the encounters array yet
		this.currentEncounter = -1;

		logger.log('[GameState] Mission data set from initialData', {
			postId,
			totalEncounters: this.totalEncounters,
			startingEncounter: this.currentEncounter,
			firstEncounterType: metadata?.mission?.encounters?.[0]?.type,
			note: 'Starting at -1 (initial battle not in encounters array)',
			hasMetadata: !!metadata,
			hasMission: !!metadata?.mission,
			hasEncounters: !!metadata?.mission?.encounters,
			encountersLength: metadata?.mission?.encounters?.length || 0,
		});
	}

	/**
	 * Load mission metadata from storage as fallback
	 * Called if initialData message doesn't have complete data
	 */
	async loadMissionDataFromStorage(postId: string): Promise<boolean> {
		this._storageLoadAttempted = true;

		try {
			const { getMission } = await import('../lib/storage/missions');
			const mission = await getMission(postId);

			if (!mission?.encounters) {
				logger.warn('[GameState] No encounters in storage for', postId);
				return false;
			}

			// Build metadata structure from MissionRecord
			const storageMetadata: MissionMetadata = {
				mission: {
					encounters: mission.encounters,
					difficulty: mission.difficulty,
					environment: mission.environment,
					minLevel: mission.minLevel,
					maxLevel: mission.maxLevel,
					foodImage: mission.foodImage,
					foodName: mission.foodName,
					authorWeaponId: mission.authorWeaponId || '',
					chef: mission.chef || '',
					cart: mission.cart || '',
					rarity: mission.rarity,
				},
				missionAuthorName: mission.missionAuthorName,
				missionTitle: mission.missionTitle,
				enemyTauntData: [],
			};

			// Compare with existing data if we have it
			if (this.missionMetadata) {
				const initialDataEncounters = this.missionMetadata?.mission?.encounters?.length || 0;
				const storageEncounters = mission.encounters?.length || 0;

				if (initialDataEncounters !== storageEncounters) {
					logger.warn('[GameState] Metadata mismatch!', {
						postId,
						initialDataEncounters,
						storageEncounters,
						initialDataDifficulty: this.missionMetadata?.mission?.difficulty,
						storageDifficulty: mission.difficulty,
					});
				} else {
					logger.log('[GameState] Storage metadata matches initialData');
				}
			} else {
				// No initialData, use storage as fallback
				logger.log('[GameState] Using storage metadata as fallback', {
					postId,
					encountersLength: mission.encounters?.length || 0,
				});

				this.missionMetadata = storageMetadata;
				this.totalEncounters = mission.encounters?.length || 0;
				this.difficulty = mission.difficulty || null;
			}

			return true;
		} catch (error) {
			logger.error('[GameState] Failed to load from storage', { postId, error: String(error) });
			return false;
		}
	}

	// Track if we've tried loading from storage to avoid infinite loops
	public _storageLoadAttempted: boolean = false;

	/**
	 * Get current encounter type from mission metadata
	 *
	 * Note: Returns null for initial battle (currentEncounter === -1)
	 * since the initial battle is not in the encounters array
	 */
	getCurrentEncounterType(): EncounterType | null {
		const encounters = this.missionMetadata?.mission?.encounters;

		logger.log('[GameState] getCurrentEncounterType called:', {
			currentEncounter: this.currentEncounter,
			isInitialBattle: this.currentEncounter === -1,
			hasMetadata: !!this.missionMetadata,
			hasMission: !!this.missionMetadata?.mission,
			hasEncounters: !!encounters,
			encountersLength: encounters?.length || 0,
			encounterAtCurrentIndex: encounters?.[this.currentEncounter],
			encounterAtNextIndex: encounters?.[this.currentEncounter + 1],
			storageLoadAttempted: this._storageLoadAttempted,
		});

		// Initial battle (not in encounters array)
		if (this.currentEncounter === -1) {
			return null; // Will fall back to DOM detection (advance-button)
		}

		// If no metadata and we haven't tried storage yet, suggest loading from storage
		if (!encounters && !this._storageLoadAttempted && this.postId) {
			logger.warn(
				'[GameState] No encounter metadata! Suggest calling loadMissionDataFromStorage()',
			);
		}

		if (!encounters || this.currentEncounter >= encounters.length) {
			return null;
		}

		return encounters[this.currentEncounter]?.type || null;
	}

	/**
	 * Update when encounter completes
	 */
	onEncounterComplete(encounterIndex: number): void {
		logger.log('[GameState] Encounter complete', {
			previousEncounter: this.currentEncounter,
			newEncounter: encounterIndex,
			totalEncounters: this.totalEncounters,
		});
		this.currentEncounter = encounterIndex;
	}

	/**
	 * Get progress string for display
	 */
	getProgress(): string {
		if (this.totalEncounters === 0) return 'Starting';
		if (this.currentEncounter === -1) return 'Pre-Game';
		return `${this.currentEncounter + 1}/${this.totalEncounters}`;
	}

	/**
	 * Should we play safe? (low on lives)
	 */
	shouldPlaySafe(): boolean {
		return this.livesRemaining <= 1;
	}

	/**
	 * Is player still alive?
	 */
	isAlive(): boolean {
		return this.livesRemaining > 0;
	}
}

/**
 * V2 Game State Tracker
 * Simple DOM-based state tracking
 */

export class GameState {
	// Player state
	livesRemaining: number = 3;

	// Mission progress
	currentEncounter: number = 0;
	totalEncounters: number = 0;

	// Mission info
	postId: string | null = null;
	difficulty: number | null = null;

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
	setMissionData(metadata: any, postId: string): void {
		this.postId = postId;
		this.totalEncounters = metadata?.mission?.encounters?.length || 0;
		this.difficulty = metadata?.mission?.difficulty || null;
		this.currentEncounter = 0;
	}

	/**
	 * Update when encounter completes
	 */
	onEncounterComplete(encounterIndex: number): void {
		this.currentEncounter = encounterIndex;
	}

	/**
	 * Get progress string for display
	 */
	getProgress(): string {
		if (this.totalEncounters === 0) return 'Starting';
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

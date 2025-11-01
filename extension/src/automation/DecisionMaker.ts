/**
 * V2 Decision Maker
 * Smart decisions based on player state
 */

import { GameState } from './GameState';

export class DecisionMaker {
	constructor(
		private gameState: GameState,
		private config: any,
	) {}

	/**
	 * Crossroads: Fight or Skip mini boss
	 */
	decideCrossroads(): 'fight' | 'skip' {
		// TODO: Re-enable play-safe logic when health tracking is ready
		// If low on lives, always skip
		// if (this.gameState.shouldPlaySafe()) {
		// 	return 'skip';
		// }

		// Use user config (default: fight)
		return this.config.crossroadsStrategy || 'fight';
	}

	/**
	 * Skill Bargain: Accept or Decline
	 */
	decideSkillBargain(bargainText: string): 'accept' | 'decline' {
		const isPositive = this.isPositiveBargain(bargainText);

		// TODO: Re-enable play-safe logic when health tracking is ready
		// If low on lives, only accept positive bargains
		// if (this.gameState.shouldPlaySafe()) {
		// 	return isPositive ? 'accept' : 'decline';
		// }

		// Use user strategy
		const strategy = this.config.skillBargainStrategy || 'positive-only';
		if (strategy === 'always') return 'accept';
		if (strategy === 'never') return 'decline';

		// Default: positive-only
		return isPositive ? 'accept' : 'decline';
	}

	/**
	 * Pick best ability from choices
	 */
	pickAbility(abilities: string[]): string {
		// Pick first from tier list
		for (const preferred of this.config.abilityTierList || []) {
			if (abilities.includes(preferred)) {
				return preferred;
			}
		}

		// Fallback to first available
		return abilities[0];
	}

	/**
	 * Simple heuristic: more + than - means positive
	 */
	private isPositiveBargain(text: string): boolean {
		const plusCount = (text.match(/\+/g) || []).length;
		const minusCount = (text.match(/-/g) || []).length;
		return plusCount > minusCount;
	}
}

/**
 * Bot State Machine
 *
 * This state machine coordinates all bot automation actions.
 * MutationObservers detect DOM changes and send events to this machine,
 * which decides what actions to take based on the current state.
 */

import { setup, assign, fromPromise } from 'xstate';
import { LevelFilters } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface BotContext {
	filters: LevelFilters;
	currentMissionId: string | null;
	currentMissionPermalink: string | null;
	errorMessage: string | null;
	retryCount: number;
	automationConfig: any;
	completionReason: 'stopped' | 'no_missions' | 'error' | null;
}

export type BotEvent =
	| { type: 'START_BOT'; filters: LevelFilters; config: any }
	| { type: 'STOP_BOT' }
	| { type: 'MISSION_PAGE_LOADED'; missionId: string; permalink: string }
	| { type: 'GAME_LOADER_DETECTED' }
	| { type: 'GAME_DIALOG_OPENED' }
	| { type: 'GAME_IFRAME_DETECTED' }
	| { type: 'AUTOMATION_STARTED' }
	| { type: 'MISSION_COMPLETED'; missionId: string }
	| { type: 'NEXT_MISSION_FOUND'; missionId: string; permalink: string }
	| { type: 'NO_MISSIONS_FOUND' }
	| { type: 'ERROR_OCCURRED'; message: string }
	| { type: 'RETRY' }
	| { type: 'NAVIGATE_TO_MISSION'; missionId: string; permalink: string };

// ============================================================================
// State Machine Definition
// ============================================================================

export const botMachine = setup({
	types: {
		context: {} as BotContext,
		events: {} as BotEvent,
	},
	actions: {
		// Set filters from START_BOT event
		setFilters: assign({
			filters: ({ event }) => {
				if (event.type === 'START_BOT') {
					return event.filters;
				}
				return {
					stars: [1, 2],
					minLevel: 1,
					maxLevel: 340,
					onlyIncomplete: true,
					autoProcess: false,
				};
			},
		}),

		// Set automation config
		setConfig: assign({
			automationConfig: ({ event }) => {
				if (event.type === 'START_BOT') {
					return event.config;
				}
				return {};
			},
		}),

		// Set current mission from event
		setMission: assign({
			currentMissionId: ({ event }) => {
				if (
					event.type === 'MISSION_PAGE_LOADED' ||
					event.type === 'NEXT_MISSION_FOUND' ||
					event.type === 'NAVIGATE_TO_MISSION'
				) {
					return event.missionId;
				}
				return null;
			},
			currentMissionPermalink: ({ event }) => {
				if (
					event.type === 'MISSION_PAGE_LOADED' ||
					event.type === 'NEXT_MISSION_FOUND' ||
					event.type === 'NAVIGATE_TO_MISSION'
				) {
					return event.permalink;
				}
				return null;
			},
		}),

		// Clear mission info
		clearMission: assign({
			currentMissionId: null,
			currentMissionPermalink: null,
		}),

		// Set error message
		setError: assign({
			errorMessage: ({ event }) => {
				if (event.type === 'ERROR_OCCURRED') {
					return event.message;
				}
				return null;
			},
			retryCount: ({ context, event }) => {
				if (event.type === 'ERROR_OCCURRED') {
					return context.retryCount + 1;
				}
				return context.retryCount;
			},
		}),

		// Clear error
		clearError: assign({
			errorMessage: null,
			retryCount: 0,
		}),

		// Reset context on stop
		resetContext: assign({
			currentMissionId: null,
			currentMissionPermalink: null,
			errorMessage: null,
			retryCount: 0,
			completionReason: null,
		}),

		// Set completion reason
		setCompletionReason: assign({
			completionReason: ({ event }) => {
				let reason: 'stopped' | 'no_missions' | 'error' | null = null;
				if (event.type === 'STOP_BOT') {
					reason = 'stopped' as const;
				} else if (event.type === 'NO_MISSIONS_FOUND') {
					reason = 'no_missions' as const;
				} else if (event.type === 'ERROR_OCCURRED') {
					reason = 'error' as const;
				}
				console.log('[BotStateMachine] Setting completion reason', {
					event: event.type,
					reason,
				});
				return reason;
			},
		}),

		// Log state transitions
		logTransition: ({ context, event }) => {
			console.log('[BotStateMachine] Transition:', {
				event: event.type,
				context,
			});
		},
	},
}).createMachine({
	id: 'bot',
	description: 'Overall bot state machine',
	initial: 'idle',
	context: {
		filters: {
			stars: [1, 2],
			minLevel: 1,
			maxLevel: 340,
			onlyIncomplete: true,
			autoProcess: false,
		},
		currentMissionId: null,
		currentMissionPermalink: null,
		errorMessage: null,
		retryCount: 0,
		automationConfig: {},
		completionReason: null,
	},
	states: {
		// ========================================================================
		// IDLE: Bot is stopped, no automation
		// ========================================================================
		idle: {
			entry: ['resetContext', 'logTransition'],
			on: {
				START_BOT: {
					target: 'starting',
					actions: ['setFilters', 'setConfig', 'logTransition'],
				},
			},
		},

		// ========================================================================
		// STARTING: User clicked Start, preparing to find/open mission
		// ========================================================================
		starting: {
			entry: ['logTransition'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['setCompletionReason', 'logTransition'],
				},
				MISSION_PAGE_LOADED: {
					target: 'waitingForGame',
					actions: ['setMission', 'logTransition'],
				},
				NAVIGATE_TO_MISSION: {
					target: 'navigating',
					actions: ['setMission', 'logTransition'],
				},
				NO_MISSIONS_FOUND: {
					target: 'idle',
					actions: ['setCompletionReason', 'logTransition'],
				},
				ERROR_OCCURRED: {
					target: 'error',
					actions: ['setError', 'logTransition'],
				},
			},
		},

		// ========================================================================
		// NAVIGATING: Navigating to a mission page
		// ========================================================================
		navigating: {
			entry: ['logTransition'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['setCompletionReason', 'logTransition'],
				},
				MISSION_PAGE_LOADED: {
					target: 'waitingForGame',
					actions: ['logTransition'],
				},
				ERROR_OCCURRED: {
					target: 'error',
					actions: ['setError', 'setCompletionReason', 'logTransition'],
				},
			},
		},

		// ========================================================================
		// WAITING_FOR_GAME: On mission page, waiting for game loader to appear
		// MutationObserver will send GAME_LOADER_DETECTED when it appears
		// ========================================================================
		waitingForGame: {
			entry: ['logTransition'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['setCompletionReason', 'logTransition'],
				},
				GAME_LOADER_DETECTED: {
					target: 'openingGame',
					actions: ['logTransition'],
				},
				ERROR_OCCURRED: {
					target: 'error',
					actions: ['setError', 'setCompletionReason', 'logTransition'],
				},
			},
		},

		// ========================================================================
		// OPENING_GAME: Clicking game UI to open dialog
		// MutationObserver watches for iframe/dialog to appear
		// ========================================================================
		openingGame: {
			entry: ['logTransition'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['setCompletionReason', 'logTransition'],
				},
				GAME_DIALOG_OPENED: {
					target: 'gameReady',
					actions: ['logTransition'],
				},
				ERROR_OCCURRED: {
					target: 'error',
					actions: ['setError', 'setCompletionReason', 'logTransition'],
				},
			},
		},

		// ========================================================================
		// GAME_READY: Game dialog is open, ready to start automation
		// ========================================================================
		gameReady: {
			entry: ['logTransition'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['setCompletionReason', 'logTransition'],
				},
				AUTOMATION_STARTED: {
					target: 'running',
					actions: ['logTransition'],
				},
				ERROR_OCCURRED: {
					target: 'error',
					actions: ['setError', 'setCompletionReason', 'logTransition'],
				},
			},
		},

		// ========================================================================
		// RUNNING: Automation is actively playing the mission
		// MutationObserver watches for mission completion indicators
		// ========================================================================
		running: {
			entry: ['logTransition'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['setCompletionReason', 'logTransition'],
				},
				MISSION_COMPLETED: {
					target: 'completing',
					actions: ['logTransition'],
				},
				ERROR_OCCURRED: {
					target: 'error',
					actions: ['setError', 'setCompletionReason', 'logTransition'],
				},
			},
		},

		// ========================================================================
		// COMPLETING: Mission finished, preparing to navigate to next
		// ========================================================================
		completing: {
			entry: ['logTransition'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['setCompletionReason', 'logTransition'],
				},
				NEXT_MISSION_FOUND: {
					target: 'navigating',
					actions: ['setMission', 'clearError', 'logTransition'],
				},
				NO_MISSIONS_FOUND: {
					target: 'idle',
					actions: ['setCompletionReason', 'logTransition'],
				},
				ERROR_OCCURRED: {
					target: 'error',
					actions: ['setError', 'setCompletionReason', 'logTransition'],
				},
			},
		},

		// ========================================================================
		// ERROR: Something went wrong, need user intervention or retry
		// ========================================================================
		error: {
			entry: ['logTransition'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['clearError', 'setCompletionReason', 'logTransition'],
				},
				RETRY: {
					target: 'starting',
					actions: ['clearError', 'logTransition'],
				},
			},
		},
	},
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if machine is in a state where MutationObserver should act on GAME_LOADER_DETECTED
 */
export function shouldRespondToLoaderDetection(state: string): boolean {
	return state === 'waitingForGame';
}

/**
 * Check if machine is in a running state (bot is active)
 */
export function isBotRunning(state: string): boolean {
	return !['idle', 'error'].includes(state);
}

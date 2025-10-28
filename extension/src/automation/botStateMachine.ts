/**
 * Bot State Machine
 *
 * This state machine coordinates all bot automation actions.
 * MutationObservers detect DOM changes and send events to this machine,
 * which decides what actions to take based on the current state.
 */

import { setup, assign, fromPromise } from 'xstate';
import { createLogger } from '../utils/logger';
const logger = createLogger('StateMachine');

// ============================================================================
// Types
// ============================================================================

export interface BotContext {
	currentMissionId: string | null;
	currentMissionPermalink: string | null;
	errorMessage: string | null;
	retryCount: number;
	findMissionRetryCount: number;
	completionReason: 'stopped' | 'no_missions' | 'error' | null;
}

export type BotEvent =
	| { type: 'START_BOT' }
	| { type: 'STOP_BOT' }
	| { type: 'MISSION_PAGE_LOADED'; missionId: string; permalink: string }
	| { type: 'GAME_LOADER_DETECTED' }
	| { type: 'GAME_DIALOG_OPENED' }
	| { type: 'GAME_DIALOG_CLOSED' }
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

		// Log why we're going idle (before reset clears it)
		logIdleReason: ({ context, event }) => {
			logger.log('[BotStateMachine] Entering idle state', {
				event: event.type,
				completionReason: context.completionReason,
				errorMessage: context.errorMessage,
				currentMissionId: context.currentMissionId,
			});
		},

		// Reset context on stop
		resetContext: assign({
			currentMissionId: null,
			currentMissionPermalink: null,
			errorMessage: null,
			retryCount: 0,
			findMissionRetryCount: 0,
			completionReason: null,
		}),

		// Increment find mission retry count
		incrementFindMissionRetry: assign({
			findMissionRetryCount: ({ context }) => context.findMissionRetryCount + 1,
		}),

		// Reset find mission retry count
		resetFindMissionRetry: assign({
			findMissionRetryCount: 0,
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

		// Log error state entry
		logError: ({ context, event }) => {
			logger.error('[BotStateMachine] Entered error state', {
				event: event.type,
				errorMessage: context.errorMessage,
				retryCount: context.retryCount,
				currentMissionId: context.currentMissionId,
			});
		},

		// Log state transitions
		logTransition: ({ context, event }) => {
			logger.log(`[BotStateMachine] Transition: ${event.type}`, {
				event: event,
				context,
			});
		},
	},
}).createMachine({
	id: 'bot',
	description: 'Overall bot state machine',
	initial: 'idle',
	context: {
		currentMissionId: null,
		currentMissionPermalink: null,
		errorMessage: null,
		retryCount: 0,
		findMissionRetryCount: 0,
		completionReason: null,
	},
	states: {
		// ========================================================================
		// IDLE: Bot is stopped, no automation
		// ========================================================================
		idle: {
			description: 'Bot is stopped, no automation',
			entry: ['logIdleReason', 'resetContext'],
			on: {
				START_BOT: {
					target: 'starting',
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
					actions: ['setCompletionReason'],
				},
				MISSION_PAGE_LOADED: {
					target: 'gameMission.waitingForGame',
					actions: ['setMission'],
				},
				NAVIGATE_TO_MISSION: {
					target: 'navigating',
					actions: ['setMission'],
				},
				NO_MISSIONS_FOUND: {
					target: 'idle',
					actions: ['setCompletionReason'],
				},
				ERROR_OCCURRED: {
					target: 'error',
					actions: ['setError'],
				},
			},
		},

		// ========================================================================
		// NAVIGATING: Navigating to a mission page
		// ========================================================================
		navigating: {
			description: 'Navigating to a mission page',
			entry: ['logTransition'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['setCompletionReason'],
				},
				MISSION_PAGE_LOADED: {
					target: 'gameMission.waitingForGame',
				},
				ERROR_OCCURRED: {
					description: 'Error occurred while navigating to a mission page',
					target: 'error',
					actions: ['setError', 'setCompletionReason'],
				},
			},
		},

		// ========================================================================
		// gameMission: Nested mission subflow
		// ========================================================================
		gameMission: {
			initial: 'waitingForGame',
			states: {
				waitingForGame: {
					entry: ['logTransition'],
					on: {
						GAME_LOADER_DETECTED: { target: 'openingGame', actions: ['logTransition'] },
						ERROR_OCCURRED: {
							target: '#bot.error',
							actions: ['setError', 'setCompletionReason'],
						},
						STOP_BOT: { target: '#bot.idle', actions: ['setCompletionReason'] },
					},
				},
				openingGame: {
					entry: ['logTransition'],
					on: {
						GAME_DIALOG_OPENED: { target: 'gameReady', actions: ['logTransition'] },
						ERROR_OCCURRED: {
							target: '#bot.error',
							actions: ['setError', 'setCompletionReason'],
						},
						STOP_BOT: { target: '#bot.idle', actions: ['setCompletionReason'] },
					},
				},
				gameReady: {
					entry: ['logTransition'],
					on: {
						AUTOMATION_STARTED: { target: 'running', actions: ['logTransition'] },
						ERROR_OCCURRED: {
							target: '#bot.error',
							actions: ['setError', 'setCompletionReason'],
						},
						STOP_BOT: { target: '#bot.idle', actions: ['setCompletionReason'] },
					},
				},
				running: {
					entry: ['logTransition'],
					on: {
						MISSION_COMPLETED: { target: 'completing', actions: ['logTransition'] },
						ERROR_OCCURRED: {
							target: '#bot.error',
							actions: ['setError', 'setCompletionReason'],
						},
						STOP_BOT: { target: '#bot.idle', actions: ['setCompletionReason'] },
					},
				},
				completing: {
					entry: ['logTransition', 'resetFindMissionRetry'],
					on: {
						NEXT_MISSION_FOUND: {
							target: 'waitingForDialogClose',
							actions: ['setMission', 'clearError', 'resetFindMissionRetry'],
						},
						NO_MISSIONS_FOUND: [
							{
								// If we've retried less than 3 times, increment retry count
								// Internal transition (no target) - stays in completing state without re-entering
								guard: ({ context }) => context.findMissionRetryCount < 3,
								actions: ['incrementFindMissionRetry'],
							},
							{
								// After 3 retries, give up and go idle
								target: '#bot.idle',
								actions: ['setCompletionReason'],
							},
						],
						ERROR_OCCURRED: [
							{
								// If we've retried less than 3 times, increment retry count
								// Internal transition (no target) - stays in completing state without re-entering
								guard: ({ context }) => context.findMissionRetryCount < 3,
								actions: ['incrementFindMissionRetry', 'setError'],
							},
							{
								// After 3 retries, go to error state
								target: '#bot.error',
								actions: ['setError', 'setCompletionReason'],
							},
						],
					},
				},
				waitingForDialogClose: {
					description: 'Waiting for game dialog to close before navigating to next mission',
					entry: ['logTransition'],
					on: {
						GAME_DIALOG_CLOSED: {
							target: '#bot.navigating',
						},
						ERROR_OCCURRED: {
							target: '#bot.error',
							actions: ['setError', 'setCompletionReason'],
						},
						STOP_BOT: {
							target: '#bot.idle',
							actions: ['setCompletionReason'],
						},
					},
				},
			},
		},

		// ========================================================================
		// ERROR: Something went wrong, need user intervention or retry
		// ========================================================================
		error: {
			entry: ['logError'],
			on: {
				STOP_BOT: {
					target: 'idle',
					actions: ['clearError', 'setCompletionReason'],
				},
				RETRY: {
					target: 'starting',
					actions: ['clearError'],
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

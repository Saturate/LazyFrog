/**
 * Background script for Sword & Supper Bot
 * Handles message passing and state coordination
 *
 * THIS IS THE SERVICE WORKER - it persists across page navigations
 * The XState machine lives here to maintain state across page reloads
 */

import { createActor } from 'xstate';
import { BotState, ChromeMessage, LevelFilters } from '../types';
import { extensionLogger } from '../utils/logger';
import { botMachine, isBotRunning } from '../automation/botStateMachine';

// ============================================================================
// State Machine Setup (Lives in Service Worker - persists across page loads!)
// ============================================================================

// Create the state machine actor - will be initialized after checking storage
let botActor: any = null;

// Initialize state machine with persistence
function initializeStateMachine() {
	// Clear any old snapshot data (was causing issues with XState v5)
	chrome.storage.local.remove(['botMachineState']);

	// Create a fresh actor
	botActor = createActor(botMachine);
	botActor.start();

	extensionLogger.log('[StateMachine] Actor started in service worker', {
		initialState: botActor.getSnapshot().value,
	});

	// Subscribe to state changes AFTER actor is created
	subscribeToStateChanges();
}

// Subscribe to state changes
function getPresentationStateName(stateObj: any): string {
	// Flatten nested states to top-level names expected by UI/status
	try {
		if (typeof stateObj?.value === 'string') return stateObj.value;
		if (stateObj?.value && typeof stateObj.value === 'object') {
			// Handle nested structure e.g., { gameMission: 'waitingForGame' }
			if (stateObj.value.gameMission && typeof stateObj.value.gameMission === 'string') {
				return String(stateObj.value.gameMission);
			}
		}
		// Use matches if available (xstate v5)
		if (stateObj?.matches) {
			if (stateObj.matches('gameMission.waitingForGame')) return 'waitingForGame';
			if (stateObj.matches('gameMission.openingGame')) return 'openingGame';
			if (stateObj.matches('gameMission.gameReady')) return 'gameReady';
			if (stateObj.matches('gameMission.running')) return 'running';
			if (stateObj.matches('gameMission.completing')) return 'completing';
		}
	} catch {}
	return String(stateObj?.value ?? 'unknown');
}

function subscribeToStateChanges() {
	botActor.subscribe((state: any) => {
		const context = state.context;
		const presentationState = getPresentationStateName(state);

		extensionLogger.log('[StateMachine] State changed', {
			state: presentationState,
			context,
		});

		// Broadcast state changes to all tabs (so UI can update)
		chrome.tabs.query({}, (tabs) => {
			tabs.forEach((tab) => {
				if (tab.id && tab.url?.includes('reddit.com')) {
					chrome.tabs.sendMessage(tab.id, {
						type: 'STATE_CHANGED',
						state: presentationState,
						context,
					});
				}
			});
		});

		// Handle state transitions
		handleStateTransition(state, context);
	});
}

// Initialize the state machine
initializeStateMachine();

/**
 * Safely send event to state machine (handles null check)
 */
function sendToStateMachine(event: any): boolean {
	if (!botActor) {
		extensionLogger.error('[StateMachine] Actor not initialized, cannot send event', { event });
		return false;
	}
	botActor.send(event);
	return true;
}

/**
 * Safely get state machine snapshot (handles null check)
 */
function getStateMachineSnapshot(): any {
	if (!botActor) {
		extensionLogger.warn('[StateMachine] Actor not initialized, returning null snapshot');
		return null;
	}
	return botActor.getSnapshot();
}

/**
 * Handle state transitions - tell content scripts what actions to take
 */
function handleStateTransition(stateObj: any, context: any): void {
	const presentationState = getPresentationStateName(stateObj);
	extensionLogger.log('[StateTransition] Entered state', { state: presentationState });

	// Update legacy state
	state.isRunning = isBotRunning(presentationState);

	// Nested mission state routing
	if (stateObj?.matches) {
		if (stateObj.matches('gameMission.waitingForGame')) {
			broadcastToReddit({ type: 'CHECK_FOR_GAME_LOADER' });
			return;
		}
		if (stateObj.matches('gameMission.openingGame')) {
			broadcastToReddit({ type: 'CLICK_GAME_UI' });
			return;
		}
		if (stateObj.matches('gameMission.gameReady')) {
			broadcastToAllFrames({ type: 'START_MISSION_AUTOMATION', config: context.automationConfig });
			return;
		}
		if (stateObj.matches('gameMission.completing')) {
			broadcastToReddit({ type: 'FIND_NEXT_MISSION', filters: context.filters });
			return;
		}
	}

	switch (presentationState) {
		case 'navigating':
			// Navigate to the mission URL using chrome.tabs API
			// This ensures proper page reload and content script re-injection
			extensionLogger.log('[StateTransition] Navigating state, checking permalink', {
				hasPermalink: !!context.currentMissionPermalink,
				permalink: context.currentMissionPermalink,
				fullContext: context,
			});

			if (context.currentMissionPermalink) {
				// Find the Reddit tab and navigate it
				chrome.tabs.query({ url: 'https://www.reddit.com/*' }, (tabs) => {
					if (tabs.length > 0 && tabs[0].id) {
						extensionLogger.log('[StateTransition] Navigating tab to mission', {
							tabId: tabs[0].id,
							url: context.currentMissionPermalink,
						});
						chrome.tabs.update(tabs[0].id, {
							url: context.currentMissionPermalink,
						});
					} else {
						extensionLogger.error('[StateTransition] No Reddit tab found!');
					}
				});
			} else {
				extensionLogger.error('[StateTransition] No permalink set! Cannot navigate!', { context });
			}
			break;
	}
}

/**
 * Broadcast message to reddit tabs only
 */
function broadcastToReddit(message: any): void {
	chrome.tabs.query({}, (tabs) => {
		tabs.forEach((tab) => {
			if (tab.id && tab.url?.includes('reddit.com')) {
				chrome.tabs.sendMessage(tab.id, message);
			}
		});
	});
}

/**
 * Broadcast message to all frames in active tab
 */
function broadcastToAllFrames(message: any): void {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		if (tabs[0]?.id) {
			chrome.tabs.sendMessage(tabs[0].id, message, { frameId: undefined });
		}
	});
}

// Extension state (legacy, will be phased out)
const state: BotState = {
	isRunning: false,
	completedLevels: [],
	currentLevel: null,
	filters: {
		stars: [1, 2],
		minLevel: 1,
		maxLevel: 340,
		onlyIncomplete: true,
		autoProcess: false,
	},
};

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
	extensionLogger.log('Received message', { type: message.type });
	extensionLogger.log('From', {
		source: sender.tab ? `tab ${sender.tab.id}` : 'extension',
	});

	switch (message.type) {
		// State management
		case 'GET_STATE':
			sendResponse(state);
			break;

		case 'UPDATE_STATE':
			Object.assign(state, message.state);
			sendResponse({ success: true });
			break;

		case 'LEVEL_COMPLETED':
			state.completedLevels.push(message.level);
			state.currentLevel = null;
			sendResponse({ success: true });
			break;

		// Messages from popup - route to state machine
		case 'START_BOT':
			extensionLogger.log('START_BOT received, sending to state machine');

			if (!botActor) {
				extensionLogger.error('State machine not initialized yet!');
				sendResponse({ error: 'State machine not ready' });
				break;
			}

			// Get automation config
			chrome.storage.local.get(['automationConfig'], (result) => {
				// Send START_BOT event to state machine
				sendToStateMachine({
					type: 'START_BOT',
					filters: message.filters,
					config: result.automationConfig || {},
				});

				// Keep old activeBotSession flag for backwards compat
				chrome.storage.local.set({
					activeBotSession: true,
					automationConfig: result.automationConfig || {},
					automationFilters: message.filters,
				});

				// Tell reddit-content to find first mission
				broadcastToReddit({
					type: 'FIND_NEXT_MISSION',
					filters: message.filters,
				});
			});

			sendResponse({ success: true });
			break;

		case 'STOP_BOT':
			extensionLogger.log('STOP_BOT received, sending to state machine');

			// Send STOP_BOT event to state machine
			sendToStateMachine({ type: 'STOP_BOT' });

			// Clear storage
			chrome.storage.local.remove(['activeBotSession', 'automationFilters']);

			// Stop automation in all frames
			broadcastToAllFrames({ type: 'STOP_MISSION_AUTOMATION' });

			sendResponse({ success: true });
			break;

		// Navigate to mission - route to reddit-content
		case 'NAVIGATE_TO_MISSION':
			extensionLogger.log('Forwarding NAVIGATE_TO_MISSION to reddit-content');
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs[0]?.id) {
					chrome.tabs.sendMessage(
						tabs[0].id,
						{
							type: 'NAVIGATE_TO_MISSION',
							filters: message.filters,
						},
						(response) => {
							sendResponse(response);
						},
					);
				} else {
					sendResponse({ error: 'No active tab' });
				}
			});
			return true; // Will respond asynchronously

		// Open mission iframe - route to reddit-content
		case 'OPEN_MISSION_IFRAME':
			extensionLogger.log('Forwarding OPEN_MISSION_IFRAME to reddit-content');
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs[0]?.id) {
					chrome.tabs.sendMessage(
						tabs[0].id,
						{
							type: 'OPEN_MISSION_IFRAME',
						},
						(response) => {
							sendResponse(response);
						},
					);
				} else {
					sendResponse({ error: 'No active tab' });
				}
			});
			return true; // Will respond asynchronously

		// Start mission automation - broadcast to all frames (including game iframe)
		case 'START_MISSION_AUTOMATION':
			state.isRunning = true;
			extensionLogger.log('Broadcasting START_MISSION_AUTOMATION to all frames');
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs[0]?.id) {
					// Send to ALL frames (including iframes)
					chrome.tabs.sendMessage(
						tabs[0].id,
						{
							type: 'START_MISSION_AUTOMATION',
							config: message.config,
						},
						{ frameId: undefined }, // undefined = all frames
						(response) => {
							if (chrome.runtime.lastError) {
								extensionLogger.warn('Message error', {
									error: chrome.runtime.lastError.message,
								});
							} else {
								extensionLogger.log('Message delivered', { response });
							}
						},
					);
				}
			});
			sendResponse({ success: true });
			break;

		// Stop mission automation - broadcast to all frames
		case 'STOP_MISSION_AUTOMATION':
			state.isRunning = false;
			extensionLogger.log('Broadcasting STOP_MISSION_AUTOMATION to all frames');
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs[0]?.id) {
					chrome.tabs.sendMessage(tabs[0].id, {
						type: 'STOP_MISSION_AUTOMATION',
					});
				}
			});
			sendResponse({ success: true });
			break;

		// Events from content scripts → state machine
		case 'GAME_LOADER_DETECTED':
			extensionLogger.log('GAME_LOADER_DETECTED, sending to state machine');
			sendToStateMachine({ type: 'GAME_LOADER_DETECTED' });
			sendResponse({ success: true });
			break;

		case 'GAME_DIALOG_OPENED':
			extensionLogger.log('GAME_DIALOG_OPENED, sending to state machine');
			sendToStateMachine({ type: 'GAME_DIALOG_OPENED' });
			sendResponse({ success: true });
			break;

		case 'AUTOMATION_READY':
			extensionLogger.log('AUTOMATION_READY, sending AUTOMATION_STARTED to state machine');
			sendToStateMachine({ type: 'AUTOMATION_STARTED' });
			sendResponse({ success: true });
			break;

		case 'MISSION_COMPLETED':
			extensionLogger.log('MISSION_COMPLETED, sending to state machine');
			sendToStateMachine({
				type: 'MISSION_COMPLETED',
				missionId: (message as any).missionId,
			});
			sendResponse({ success: true });
			break;

		case 'MISSION_FOUND':
			extensionLogger.log('MISSION_FOUND, sending event to state machine');
			const missionData = message as any;
			const snapshot = getStateMachineSnapshot();
			const currentState = snapshot?.value as string;

			// If we're completing a mission, this is the NEXT mission
			if (currentState === 'completing') {
				extensionLogger.log('In completing state, sending NEXT_MISSION_FOUND');
				sendToStateMachine({
					type: 'NEXT_MISSION_FOUND',
					missionId: missionData.missionId,
					permalink: missionData.permalink,
				});
			} else if (missionData.isCurrentPage) {
				// Already on mission page (first mission)
				extensionLogger.log('Already on page, sending MISSION_PAGE_LOADED');
				sendToStateMachine({
					type: 'MISSION_PAGE_LOADED',
					missionId: missionData.missionId,
					permalink: missionData.permalink,
				});
			} else {
				// Need to navigate (first mission)
				extensionLogger.log('Need to navigate, sending NAVIGATE_TO_MISSION');
				sendToStateMachine({
					type: 'NAVIGATE_TO_MISSION',
					missionId: missionData.missionId,
					permalink: missionData.permalink,
				});
			}
			sendResponse({ success: true });
			break;

		case 'NO_MISSIONS_FOUND':
			extensionLogger.log('NO_MISSIONS_FOUND, sending to state machine');
			sendToStateMachine({ type: 'NO_MISSIONS_FOUND' });
			sendResponse({ success: true });
			break;

		case 'ERROR_OCCURRED':
			const errorSnapshot = getStateMachineSnapshot();
			extensionLogger.error('ERROR_OCCURRED, sending to state machine', {
				errorMessage: (message as any).message || 'Unknown error',
				currentState: errorSnapshot?.value,
			});
			sendToStateMachine({
				type: 'ERROR_OCCURRED',
				message: (message as any).message || 'Unknown error',
			});
			sendResponse({ success: true });
			break;

		case 'STATUS_UPDATE':
			// Status updates from content scripts - just acknowledge
			// These are used for popup UI updates, background doesn't need to process them
			sendResponse({ success: true });
			break;

		default:
			extensionLogger.warn('Unknown message type', { type: message.type });
			sendResponse({ error: 'Unknown message type: ' + message.type });
	}

	return true; // Keep message channel open for async response
});

// Load saved state from storage on startup
chrome.storage.local.get(['completedLevels', 'automationFilters'], (result) => {
	if (result.completedLevels) {
		state.completedLevels = result.completedLevels;
	}
	if (result.automationFilters) {
		state.filters = result.automationFilters;
	}
});

// Save state periodically
setInterval(() => {
	chrome.storage.local.set({
		completedLevels: state.completedLevels,
		automationFilters: state.filters,
	});
}, 60000); // Every minute

extensionLogger.log('Sword & Supper Bot background script loaded');

/**
 * Content script for Sword & Supper Bot
 * Injects React components and handles game interaction
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import BotControlPanel from '../../components/BotControlPanel';
import { Level, LevelFilters, ChromeMessage } from '../../types';
import {
	findGameIframe,
	isGameDialogOpen,
	parseLevelFromPost,
	getAllLevels,
	filterLevels,
	clickLevel,
	exploreGameLoader,
} from './utils/reddit';
import { redditLogger } from '../../utils/logger';
import { getNextUnclearedMission } from '../../lib/storage/missionQueries';
import { checkMissionClearedInDOM } from '../../lib/storage/domUtils';
import { markMissionCleared } from '../../lib/storage/missions';

// Utility functions
import { safeSendMessage } from './utils/messaging';
import { scannedPostIds, scanForNewMissions, initializeScrollScanning } from './utils/scanning';
import { initializeDebugFunctions } from './utils/debug';
import { installMissionDataHandler } from './utils/missionDataHandler';
import { startPinging, stopPinging } from './utils/keepAlive';
import { navigateToUrl, onUrlChange } from '../../utils/navigation';
import {
	DOM_UPDATE_DELAY,
	GAME_LOADER_CHECK_INTERVAL,
	GAME_LOADER_MAX_WAIT,
} from '../../constants/timing';

// UI components
import { getStatusText } from './ui/statusText';
import { renderControlPanel, unmountControlPanel, initializeControlPanel } from './ui/controlPanel';

// Game interaction
import { clickGameUI, waitForElement } from './game/gameInteraction';
import { checkForExistingLoader, startObserving } from './game/loaderDetection';
import { normalizeRedditPermalink } from '../../utils/url';

// Version and build info (replaced by webpack at build time)
declare const __VERSION__: string;
declare const __BUILD_TIME__: string;

redditLogger.log(
	`Sword & Supper Bot (${__VERSION__}) content script loaded on ${window.location.href}`,
);

// Mission completion detection handled in missionDataHandler.ts

let root: Root | null = null;

// ============================================================================
// State Tracking (Actual state machine lives in background service worker)
// ============================================================================

// Track current state for UI updates (received from background via STATE_CHANGED messages)
let currentBotState: string = 'idle';
let currentBotContext: any = null;

// Check if we're on a mission page and notify background when preview loads
// This runs immediately when content script loads after navigation
// KEY: activeBotSession persists across navigations, so if bot is running and we land on a mission page, report it!
chrome.storage.local.get(['activeBotSession'], (result) => {
	const isCommentsPage = window.location.pathname.includes('/comments/');

	redditLogger.log('[PageLoad] Content script loaded, checking state', {
		hasSession: !!result.activeBotSession,
		pathname: window.location.pathname,
		isCommentsPage,
		fullUrl: window.location.href,
	});

	// If bot is running (activeBotSession) and we're on a mission page, notify background!
	if (result.activeBotSession && isCommentsPage) {
		redditLogger.log('[PageLoad] Active bot session on mission page, will monitor for game loader');
		const postIdMatch = window.location.pathname.match(/\/comments\/([^/]+)/);
		if (postIdMatch) {
			const postId = 't3_' + postIdMatch[1];
			const permalink = window.location.href;

			// Check immediately if loader already exists
			const loader = document.querySelector('shreddit-devvit-ui-loader');
			if (loader) {
				redditLogger.log('[PageLoad] Game loader already present, mission page loaded', {
					postId,
					permalink,
				});

				// Mission was already filtered at selection time - trust it's valid and proceed
				safeSendMessage({
					type: 'MISSION_FOUND',
					missionId: postId,
					permalink,
					isCurrentPage: true,
				});
			} else {
				// Wait for the game loader (preview) to appear in DOM using MutationObserver
				redditLogger.log('[PageLoad] Waiting for game loader to appear...');

				const pageLoadObserver = new MutationObserver(() => {
					const loader = document.querySelector('shreddit-devvit-ui-loader');
					if (loader) {
						redditLogger.log('[PageLoad] Game loader detected, mission page loaded', {
							postId,
							permalink,
						});

						// Mission was already filtered at selection time - trust it's valid and proceed
						safeSendMessage({
							type: 'MISSION_FOUND',
							missionId: postId,
							permalink,
							isCurrentPage: true,
						});

						pageLoadObserver.disconnect();
					}
				});

				// Start observing
				if (document.body) {
					pageLoadObserver.observe(document.body, {
						childList: true,
						subtree: true,
					});
				} else {
					// Wait for body to be ready
					document.addEventListener('DOMContentLoaded', () => {
						pageLoadObserver.observe(document.body, {
							childList: true,
							subtree: true,
						});
					});
				}
			}
		} else {
			redditLogger.warn('[PageLoad] Failed to extract postId from pathname', {
				pathname: window.location.pathname,
			});
		}
	}
});

// Listen for messages from background script and popup
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
	redditLogger.log('Received Chrome message', {
		type: message.type,
		message,
	});

	switch (message.type) {
		// ============================================================================
		// Commands from background service worker
		// ============================================================================

		case 'STATE_CHANGED':
			// Background notifies us of state changes so we can update UI
			const stateMsg = message as any;
			currentBotState = stateMsg.state;
			currentBotContext = stateMsg.context;
			redditLogger.log('[STATE_CHANGED] Updated local state', {
				state: currentBotState,
			});

			// Manage ping based on bot state
			const isRunning = !['idle', 'error'].includes(currentBotState);
			if (isRunning) {
				startPinging();
			} else {
				stopPinging();
			}

			renderControlPanel(currentBotState, currentBotContext);
			sendResponse({ success: true });
			break;

		case 'CHECK_FOR_GAME_LOADER':
			// Background wants us to check if game loader is present
			redditLogger.log('[CHECK_FOR_GAME_LOADER] Checking for loader');

			// First check for inn detection (mission already completed)
			(async () => {
				const { shouldSkipGameDueToInn } = await import('./utils/innDetection');
				if (shouldSkipGameDueToInn()) {
					redditLogger.log(
						'[CHECK_FOR_GAME_LOADER] Skipping game loader check - mission already completed',
					);
					sendResponse({ success: true, skipped: true });
					return;
				}

				// If not completed, proceed with normal game loader detection
				checkForExistingLoader(currentBotState);
				sendResponse({ success: true });
			})();
			return true; // Will respond asynchronously

		case 'CHECK_GAME_DIALOG_STATUS':
			// Background wants to know if game dialog is currently open
			const isOpen = isGameDialogOpen();
			redditLogger.log('[CHECK_GAME_DIALOG_STATUS] Dialog status', { isOpen });
			sendResponse({ isOpen });
			return true; // Will respond synchronously
			break;

		case 'CLICK_GAME_UI':
			// Background wants us to click the game UI
			redditLogger.log('[CLICK_GAME_UI] Clicking game UI');
			clickGameUI().then((success) => {
				sendResponse({ success });
			});
			return true; // Will respond asynchronously
			break;

		case 'NAVIGATE_TO_URL':
			// Background wants us to navigate to a URL
			const navMsg = message as any;
			redditLogger.log('[NAVIGATE_TO_URL] Received message', {
				url: navMsg.url,
				fullMessage: navMsg,
				hasUrl: 'url' in navMsg,
			});

			if (navMsg.url) {
				redditLogger.log('[NAVIGATE_TO_URL] Navigating to', {
					url: navMsg.url,
				});
				navigateToUrl(navMsg.url);
				sendResponse({ success: true });
			} else {
				redditLogger.error('[NAVIGATE_TO_URL] NO URL PROVIDED!', {
					message: navMsg,
				});
				sendResponse({ error: 'No URL provided' });
			}
			break;

		case 'FETCH_REDDIT_USERNAME':
			// Migration requesting username from Reddit context
			redditLogger.log('[FETCH_REDDIT_USERNAME] Fetching username for migration');
			(async () => {
				const { getCurrentRedditUser } = await import('../../lib/reddit/userDetection');
				const username = await getCurrentRedditUser();
				redditLogger.log('[FETCH_REDDIT_USERNAME] Username fetched:', username);
				sendResponse({ success: true, username });
			})();
			return true; // Will respond asynchronously
			break;

		// ============================================================================
		// Legacy / deprecated handlers
		// ============================================================================

		case 'STATUS_UPDATE':
			// Status is now managed by state machine, this message is deprecated but kept for compatibility
			sendResponse({ success: true });
			break;

		case 'START_PROCESSING':
			// Deprecated - now handled by START_BOT event to state machine
			sendResponse({ success: true });
			break;

		case 'STOP_PROCESSING':
			// Deprecated - now handled by STOP_BOT to background
			sendResponse({ success: true });
			break;

		case 'GET_LEVELS':
			const levels = getAllLevels();
			const filtered = filterLevels(levels, message.filters || currentBotContext?.filters);
			sendResponse({ levels: filtered });
			break;

		case 'PLAY_CURRENT_MISSION': {
			// Forward message to game iframe
			redditLogger.log('Received PLAY_CURRENT_MISSION message');
			const playMsg = message as any; // Cast to access config

			// Check if we're on a post detail page or listing page
			const isPostDetail = window.location.pathname.includes('/comments/');
			redditLogger.log('Is post detail page?', { isPostDetail });

			// Try to find iframe - it might be in shadow DOM
			let gameIframe = document.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;

			// If not found, check shadow DOM
			if (!gameIframe) {
				const loader = document.querySelector('shreddit-devvit-ui-loader');
				redditLogger.log('Found loader', { hasLoader: !!loader });
				if (loader?.shadowRoot) {
					gameIframe = loader.shadowRoot.querySelector(
						'iframe[src*="devvit.net"]',
					) as HTMLIFrameElement;
					redditLogger.log('Found iframe in shadow DOM', {
						hasIframe: !!gameIframe,
					});
				}
			}

			redditLogger.log('Game iframe status', {
				hasIframe: !!gameIframe,
				src: gameIframe?.src,
			});

			if (gameIframe) {
				// Game is already loaded - start automation via background
				redditLogger.log('Game iframe found, sending START_MISSION_AUTOMATION');
				chrome.runtime.sendMessage({
					type: 'START_MISSION_AUTOMATION',
				});
				sendResponse({ success: true });
			} else if (!isPostDetail) {
				// We're on listing page - need to open a mission first
				redditLogger.log('No iframe found, looking for mission post to open');
				const allLevels = getAllLevels();
				const filteredLevels = filterLevels(
					allLevels,
					playMsg.filters || currentBotContext?.filters,
				);

				if (filteredLevels.length > 0) {
					const firstMission = filteredLevels[0];
					redditLogger.log('Opening mission', { title: firstMission.title });

					// Open the mission (SPA navigation to mission detail)
					if (firstMission.href) {
						// Store that we need to start automation after page loads
						chrome.storage.local.set({
							activeBotSession: true,
							automationConfig: playMsg.config,
						});

						navigateToUrl(firstMission.href);
						sendResponse({ success: true, action: 'opening_mission' });
					} else {
						sendResponse({ error: 'Mission has no URL' });
					}
				} else {
					sendResponse({ error: 'No missions found matching filters' });
				}
			} else {
				// We're on post detail but no iframe found yet
				// Try to click the game UI to start the mission
				redditLogger.log('On post detail page but no iframe found yet');
				redditLogger.log('Looking for devvit-blocks-renderer to click');

				const loader = document.querySelector('shreddit-devvit-ui-loader');

				// Store that we need to start automation when iframe appears
				chrome.storage.local.set({
					activeBotSession: true,
					automationConfig: playMsg.config,
				});

				// Function to click the game UI
				const clickGameUI = () => {
					if (!loader) return false;

					// Navigate deep into shadow DOM to find clickable container
					const surface = loader.shadowRoot?.querySelector('devvit-surface');
					const renderer = surface?.shadowRoot?.querySelector('devvit-blocks-renderer');
					const clickableContainer = renderer?.shadowRoot?.querySelector('.cursor-pointer');

					if (clickableContainer) {
						redditLogger.log('Found clickable game container in deep shadow DOM');
						(clickableContainer as HTMLElement).click();

						// Wait for modal to open, then click fullscreen
						setTimeout(() => {
							const fullscreenControls = document.querySelector(
								'devvit-fullscreen-web-view-controls',
							);
							const sizeControls = fullscreenControls?.shadowRoot?.querySelector(
								'devvit-web-view-preview-size-controls',
							);
							const fullscreenButton = sizeControls?.shadowRoot?.querySelector(
								'button[aria-label="Toggle fullscreen web view"]',
							);

							if (fullscreenButton) {
								redditLogger.log('Clicking fullscreen button');
								(fullscreenButton as HTMLElement).click();
							} else {
								redditLogger.warn('Fullscreen button not found');
							}
						}, 1000);

						return true;
					}

					redditLogger.warn('Could not find clickable game container');
					return false;
				};

				const clicked = clickGameUI();

				sendResponse({
					success: true,
					action: 'clicking_start',
					message: clicked ? 'Clicking to start mission...' : 'Waiting for mission to load...',
				});
			}
			break;
		}

		case 'NAVIGATE_TO_MISSION': {
			redditLogger.log('[NAVIGATE_TO_MISSION] Finding next uncompleted mission', {
				filters: message.filters,
			});

			// Get next uncompleted mission from database with filters
			const missionFilters = message.filters
				? {
						stars: message.filters.stars,
						minLevel: message.filters.minLevel,
						maxLevel: message.filters.maxLevel,
					}
				: undefined;

			getNextUnclearedMission(missionFilters)
				.then((mission: any) => {
					if (mission && mission.permalink) {
						redditLogger.log('[NAVIGATE_TO_MISSION] Found uncompleted mission', {
							postId: mission.postId,
							missionTitle: mission.missionTitle,
							difficulty: mission.difficulty,
							levelRange: `${mission.minLevel}-${mission.maxLevel}`,
							permalink: mission.permalink,
						});

						// Check if we're already on this mission page
						const currentPath = window.location.pathname;
						const normalized = normalizeRedditPermalink(mission.permalink);
						const missionPath = new URL(normalized).pathname;

						if (currentPath === missionPath) {
							// We're already on the mission page - send MISSION_FOUND event
							redditLogger.log(
								'[NAVIGATE_TO_MISSION] Already on mission page, sending MISSION_FOUND event',
							);
							safeSendMessage({
								type: 'MISSION_FOUND',
								missionId: mission.postId,
								permalink: mission.permalink,
								isCurrentPage: true,
							});

							sendResponse({
								success: true,
								message: `Starting mission: ${mission.missionTitle || mission.postId}`,
							});
						} else {
							// Navigate to the mission page - SPA navigation
							// When page loads, activeBotSession will be detected and game will auto-open
							redditLogger.log('[NAVIGATE_TO_MISSION] Navigating to different page');

							safeSendMessage({
								type: 'NAVIGATE_TO_MISSION',
								missionId: mission.postId,
								permalink: normalized,
							});

							// Actually navigate (SPA style)
							navigateToUrl(normalized);

							sendResponse({
								success: true,
								message: `Navigating to: ${mission.missionTitle || mission.postId}`,
							});
						}
					} else if (mission) {
						redditLogger.warn('[NAVIGATE_TO_MISSION] Mission found but has no permalink', {
							postId: mission.postId,
						});
						safeSendMessage({
							type: 'ERROR_OCCURRED',
							message: 'Mission has no permalink URL',
						});
						alert('Mission found but has no permalink URL');
						sendResponse({ error: 'Mission has no permalink URL' });
					} else {
						redditLogger.warn('[NAVIGATE_TO_MISSION] No uncompleted missions found', {
							filters: missionFilters,
						});
						safeSendMessage({ type: 'NO_MISSIONS_FOUND' });
						alert(
							'No uncleared missions found matching your filters. Try adjusting star difficulty or level range.',
						);
						sendResponse({
							error: 'No uncompleted missions found matching filters.',
						});
					}
				})
				.catch((error) => {
					redditLogger.error('[NAVIGATE_TO_MISSION] Error fetching next mission', {
						error: String(error),
					});
					chrome.runtime.sendMessage({
						type: 'ERROR_OCCURRED',
						message: 'Failed to fetch next mission: ' + String(error),
					});
					alert('Error fetching next mission: ' + String(error));
					sendResponse({
						error: 'Failed to fetch next mission: ' + String(error),
					});
				});
			break;
		}

		case 'OPEN_MISSION_IFRAME': {
			redditLogger.log('Debug Step 2: Open devvit iframe');

			// Check if iframe already exists
			let iframe = findGameIframe();
			if (iframe) {
				redditLogger.log('Iframe already open', {
					src: iframe.src.substring(0, 60) + '...',
				});
				sendResponse({
					success: true,
					message: 'Iframe already open. Ready for Step 3.',
				});
				break;
			}

			// Try to find and click the game UI to start mission
			const loader = document.querySelector('shreddit-devvit-ui-loader');
			if (!loader) {
				redditLogger.warn('No game loader found - are you on a mission post?');
				sendResponse({ error: 'No game loader found on page' });
				break;
			}

			// Navigate deep into shadow DOM to find the clickable game container
			const surface = loader.shadowRoot?.querySelector('devvit-surface');
			const renderer = surface?.shadowRoot?.querySelector('devvit-blocks-renderer');
			const clickableContainer = renderer?.shadowRoot?.querySelector('.cursor-pointer');

			if (clickableContainer) {
				redditLogger.log('Found clickable game container in deep shadow DOM');
				(clickableContainer as HTMLElement).click();

				sendResponse({
					success: true,
					message:
						'Clicked game container. The game will open in a modal. Iframe will load after a few seconds...',
				});

				// Wait a moment for modal to open, then click fullscreen button
				setTimeout(() => {
					const fullscreenControls = document.querySelector('devvit-fullscreen-web-view-controls');
					const sizeControls = fullscreenControls?.shadowRoot?.querySelector(
						'devvit-web-view-preview-size-controls',
					);
					const fullscreenButton = sizeControls?.shadowRoot?.querySelector(
						'button[aria-label="Toggle fullscreen web view"]',
					);

					if (fullscreenButton) {
						redditLogger.log('Clicking fullscreen button');
						(fullscreenButton as HTMLElement).click();
					} else {
						redditLogger.warn('Fullscreen button not found');
					}
				}, 1000);

				// Check for iframe after delay
				const checkInterval = setInterval(() => {
					iframe = findGameIframe();
					if (iframe) {
						redditLogger.log('Iframe loaded successfully', {
							src: iframe.src.substring(0, 100),
						});
						clearInterval(checkInterval);
					}
				}, GAME_LOADER_CHECK_INTERVAL);

				// Stop checking after max wait time
				setTimeout(() => clearInterval(checkInterval), GAME_LOADER_MAX_WAIT);
			} else {
				redditLogger.warn('Could not find clickable game container in shadow DOM');
				redditLogger.log('Loader structure', {
					hasShadowRoot: !!loader.shadowRoot,
					hasSurface: !!surface,
					hasRenderer: !!renderer,
					rendererHasShadowRoot: !!renderer?.shadowRoot,
				});
				sendResponse({
					error: 'Could not find clickable game element. Try manually clicking the game once.',
				});
			}
			break;
		}

		// Note: START_MISSION_AUTOMATION and STOP_MISSION_AUTOMATION are broadcast by background
		// to all frames, so they'll reach the devvit-content script directly.
		// Reddit-content doesn't need to handle these.

		case 'AUTOMATION_READY':
			// Game iframe automation is initialized and ready - forward to background
			redditLogger.log(
				'[AUTOMATION_READY] Game iframe reports automation is ready, forwarding to background',
			);
			safeSendMessage({ type: 'AUTOMATION_READY' });
			sendResponse({ success: true });
			break;

		default:
			sendResponse({ error: 'Unknown message type' });
	}

	return true;
});

// Initialize debug functions
initializeDebugFunctions(currentBotState, currentBotContext, () =>
	renderControlPanel(currentBotState, currentBotContext),
);

// ============================================================================
// MutationObserver - Game Loader Detector (Acts as Sensor for State Machine)
// ============================================================================

// This observer detects when the game loader appears and sends GAME_LOADER_DETECTED event
// The state machine decides whether to act on it based on current state

const observer = new MutationObserver((mutations) => {
	// Check if game loader has appeared
	const loader = document.querySelector('shreddit-devvit-ui-loader');

	if (loader) {
		// Always report to background, let background decide if it should act
		redditLogger.log('[MutationObserver] Game loader detected, reporting to background');
		safeSendMessage({ type: 'GAME_LOADER_DETECTED' });

		// Disconnect observer after sending event to avoid spam
		observer.disconnect();
	}
});

// Start observing when body is available
startObserving(currentBotState);

// Initialize API interceptor to capture mission data from gRPC-Web requests
// This is MORE RELIABLE than DOM scanning!
installMissionDataHandler();

// DOM scanning disabled - API interception is the primary method now
// initializeScrollScanning();

// Initialize control panel when DOM is ready
if (document.readyState === 'loading') {
	// DOM is still loading, wait for DOMContentLoaded
	document.addEventListener('DOMContentLoaded', () =>
		initializeControlPanel(currentBotState, currentBotContext),
	);
} else {
	// DOM is already loaded (in case script runs late)
	initializeControlPanel(currentBotState, currentBotContext);
}

// Listen for storage changes to sync state machine with background script
chrome.storage.onChanged.addListener((changes, namespace) => {
	if (namespace === 'local' && changes.botMachineState) {
		const newState = changes.botMachineState.newValue;
		redditLogger.log('[Storage] Bot machine state changed', { newState });
		// State machine already updates from subscribe(), no need to do anything here
	}
});

// Listen for URL changes (SPA navigation) to handle page transitions
onUrlChange((newUrl) => {
	const isCommentsPage = newUrl.includes('/comments/');

	redditLogger.log('[URL Change] Navigation detected', { newUrl, isCommentsPage });

	// Re-render control panel to check if we should show/hide it on new page
	renderControlPanel(currentBotState, currentBotContext);

	// If bot is active and we navigated to a comments page, check for game loader
	chrome.storage.local.get(['activeBotSession'], (result) => {
		if (result.activeBotSession && isCommentsPage) {
			// Check for game loader after a short delay to let DOM update
			setTimeout(() => {
				checkForExistingLoader(currentBotState);
			}, DOM_UPDATE_DELAY);
		}
	});
});

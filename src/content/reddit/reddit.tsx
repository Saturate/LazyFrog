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
  parseLevelFromPost,
  getAllLevels,
  filterLevels,
  clickLevel,
  exploreGameLoader,
} from './utils/reddit';
import { redditLogger } from '../../utils/logger';
import { getNextUnclearedMission, checkMissionClearedInDOM, markMissionCleared } from '../../utils/storage';

// Version and build info (replaced by webpack at build time)
declare const __VERSION__: string;
declare const __BUILD_TIME__: string;

redditLogger.log('Sword & Supper Bot content script loaded', {
  version: __VERSION__,
  buildTime: __BUILD_TIME__,
  url: window.location.href,
  loadTime: new Date().toISOString(),
});

let root: Root | null = null;
let isRunning = false;
let currentStatus = 'Idle';
let filters: LevelFilters = {
  stars: [1, 2], // Default: 1-2 stars (easiest)
  minLevel: 1,
  maxLevel: 340,
  onlyIncomplete: true,
};

/**
 * Render the React control panel
 */
function renderControlPanel(): void {
  // Remove existing container if any
  let container = document.getElementById('ss-bot-react-root');
  if (container) {
    container.remove();
  }

  // Create new container
  container = document.createElement('div');
  container.id = 'ss-bot-react-root';
  document.body.appendChild(container);

  // Create root and render
  root = createRoot(container);
  root.render(
    <BotControlPanel
      isRunning={isRunning}
      status={currentStatus}
      onStart={() => {
        redditLogger.log('Bot started from control panel');
        isRunning = true;
        currentStatus = 'Starting bot...';
        renderControlPanel();

        // Get automation config and start bot
        chrome.storage.local.get(['automationConfig', 'filters'], (result) => {
          chrome.runtime.sendMessage({
            type: 'START_BOT',
            filters: result.filters || filters,
          });

          // Note: The background script will send NAVIGATE_TO_MISSION which handles
          // opening the game (either by navigating or by calling initializeAutomation if already on page)
          // No need to call initializeAutomation directly here - let NAVIGATE_TO_MISSION handle it
        });
      }}
      onStop={() => {
        redditLogger.log('Bot stopped from control panel');
        isRunning = false;
        currentStatus = 'Idle';
        renderControlPanel();

        chrome.runtime.sendMessage({
          type: 'STOP_BOT',
        });
      }}
      onOpenSettings={() => {
        redditLogger.log('Opening settings');
        // Open the missions page in a new tab
        chrome.tabs.create({
          url: chrome.runtime.getURL('missions.html'),
        });
      }}
    />
  );
}

/**
 * Unmount the React control panel
 */
function unmountControlPanel(): void {
  const container = document.getElementById('ss-bot-react-root');
  if (container && root) {
    root.unmount();
    container.remove();
    root = null;
  }
}

/**
 * Update status and re-render control panel
 */
function updateStatus(status: string): void {
  currentStatus = status;
  if (root) {
    renderControlPanel();
  }
}

// Listen for messages from background script and popup
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  redditLogger.log('Received Chrome message', { type: message.type });

  switch (message.type) {
    case 'STATUS_UPDATE':
      updateStatus((message as any).status);
      sendResponse({ success: true });
      break;

    case 'START_PROCESSING':
      isRunning = true;
      filters = { ...filters, ...message.filters };
      updateStatus('Bot started');
      sendResponse({ success: true });
      break;

    case 'STOP_PROCESSING':
      isRunning = false;
      updateStatus('Idle');
      sendResponse({ success: true });
      break;

    case 'GET_LEVELS':
      const levels = getAllLevels();
      const filtered = filterLevels(levels, message.filters || filters);
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
          gameIframe = loader.shadowRoot.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
          redditLogger.log('Found iframe in shadow DOM', { hasIframe: !!gameIframe });
        }
      }

      redditLogger.log('Game iframe status', { hasIframe: !!gameIframe, src: gameIframe?.src });

      if (gameIframe) {
        // Game is already loaded - start automation via background
        redditLogger.log('Game iframe found, sending START_MISSION_AUTOMATION');
        chrome.runtime.sendMessage({
          type: 'START_MISSION_AUTOMATION',
          config: playMsg.config
        });
        sendResponse({ success: true });
      } else if (!isPostDetail) {
        // We're on listing page - need to open a mission first
        redditLogger.log('No iframe found, looking for mission post to open');
        const allLevels = getAllLevels();
        const filteredLevels = filterLevels(allLevels, playMsg.filters || filters);

        if (filteredLevels.length > 0) {
          const firstMission = filteredLevels[0];
          redditLogger.log('Opening mission', { title: firstMission.title });

          // Open the mission (will reload the page to mission detail)
          if (firstMission.href) {
            // Store that we need to start automation after page loads
            chrome.storage.local.set({
              activeBotSession: true,
              automationConfig: playMsg.config
            });

            window.location.href = firstMission.href;
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
          automationConfig: playMsg.config
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
              const fullscreenControls = document.querySelector('devvit-fullscreen-web-view-controls');
              const sizeControls = fullscreenControls?.shadowRoot?.querySelector('devvit-web-view-preview-size-controls');
              const fullscreenButton = sizeControls?.shadowRoot?.querySelector('button[aria-label="Toggle fullscreen web view"]');

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
          message: clicked ? 'Clicking to start mission...' : 'Waiting for mission to load...'
        });
      }
      break;
    }

    case 'NAVIGATE_TO_MISSION': {
      redditLogger.log('Debug Step 1: Navigate to next uncompleted mission', {
        filters: message.filters
      });

      // Broadcast status
      chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        status: 'Looking for next mission...',
      });

      // Get next uncompleted mission from database with filters
      const missionFilters = message.filters ? {
        stars: message.filters.stars,
        minLevel: message.filters.minLevel,
        maxLevel: message.filters.maxLevel
      } : undefined;

      getNextUnclearedMission(missionFilters).then((mission: any) => {
        if (mission && mission.permalink) {
          redditLogger.log('Found uncompleted mission in database', {
            postId: mission.postId,
            tags: mission.tags,
            difficulty: mission.difficulty,
            levelRange: `${mission.minLevel}-${mission.maxLevel}`,
            permalink: mission.permalink,
          });

          // Check if we're already on this mission page
          const currentPath = window.location.pathname;
          const missionPath = new URL(mission.permalink).pathname;

          if (currentPath === missionPath) {
            // We're already on the mission page, just start the game instead of navigating
            redditLogger.log('Already on mission page, starting game directly');
            chrome.runtime.sendMessage({
              type: 'STATUS_UPDATE',
              status: 'Starting mission...',
            });

            // Ensure activeBotSession is set before calling initializeAutomation
            // This guarantees the flag is in storage before we check for it
            chrome.storage.local.get(['automationConfig'], (result) => {
              redditLogger.log('[NAVIGATE_TO_MISSION] Setting activeBotSession flag', {
                hasConfig: !!result.automationConfig,
                filters: missionFilters
              });

              chrome.storage.local.set({
                activeBotSession: true,
                automationConfig: result.automationConfig || {},
                automationFilters: missionFilters
              }, () => {
                redditLogger.log('[NAVIGATE_TO_MISSION] activeBotSession flag set, calling initializeAutomation');

                // Verify the flag was actually set
                chrome.storage.local.get(['activeBotSession'], (verifyResult) => {
                  redditLogger.log('[NAVIGATE_TO_MISSION] Verified activeBotSession in storage', {
                    active: verifyResult.activeBotSession
                  });

                  // Wait a bit for storage to fully propagate, then initialize
                  setTimeout(() => {
                    redditLogger.log('[NAVIGATE_TO_MISSION] About to call initializeAutomation');
                    initializeAutomation();
                  }, 300);
                });
              });
            });

            sendResponse({
              success: true,
              message: `Starting mission: ${mission.tags || mission.postId}`,
            });
          } else {
            // Navigate to the mission page
            chrome.runtime.sendMessage({
              type: 'STATUS_UPDATE',
              status: 'Navigating to mission %missionId%',
              missionId: mission.postId,
            });

            window.location.href = mission.permalink;
            sendResponse({
              success: true,
              message: `Navigating to: ${mission.tags || mission.postId}`,
            });
          }
        } else if (mission) {
          redditLogger.warn('Mission found but has no permalink', { postId: mission.postId });
          chrome.runtime.sendMessage({
            type: 'STATUS_UPDATE',
            status: 'Idle',
          });
          alert('Mission found but has no permalink URL');
          sendResponse({ error: 'Mission has no permalink URL' });
        } else {
          redditLogger.warn('No uncompleted missions found matching filters', { filters: missionFilters });
          chrome.runtime.sendMessage({
            type: 'STATUS_UPDATE',
            status: 'Idle',
          });
          alert('No uncleared missions found matching your filters. Try adjusting star difficulty or level range.');
          sendResponse({ error: 'No uncompleted missions found matching filters.' });
        }
      }).catch((error) => {
        redditLogger.error('Error fetching next mission', { error: String(error) });
        chrome.runtime.sendMessage({
          type: 'STATUS_UPDATE',
          status: 'Idle',
        });
        alert('Error fetching next mission: ' + String(error));
        sendResponse({ error: 'Failed to fetch next mission: ' + String(error) });
      });
      break;
    }

    case 'OPEN_MISSION_IFRAME': {
      redditLogger.log('Debug Step 2: Open devvit iframe');

      // Check if iframe already exists
      let iframe = findGameIframe();
      if (iframe) {
        redditLogger.log('Iframe already open', { src: iframe.src.substring(0, 60) + '...' });
        sendResponse({ success: true, message: 'Iframe already open. Ready for Step 3.' });
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

        sendResponse({ success: true, message: 'Clicked game container. The game will open in a modal. Iframe will load after a few seconds...' });

        // Wait a moment for modal to open, then click fullscreen button
        setTimeout(() => {
          const fullscreenControls = document.querySelector('devvit-fullscreen-web-view-controls');
          const sizeControls = fullscreenControls?.shadowRoot?.querySelector('devvit-web-view-preview-size-controls');
          const fullscreenButton = sizeControls?.shadowRoot?.querySelector('button[aria-label="Toggle fullscreen web view"]');

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
            redditLogger.log('Iframe loaded successfully', { src: iframe.src.substring(0, 100) });
            clearInterval(checkInterval);
          }
        }, 500);

        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
      } else {
        redditLogger.warn('Could not find clickable game container in shadow DOM');
        redditLogger.log('Loader structure', {
          hasShadowRoot: !!loader.shadowRoot,
          hasSurface: !!surface,
          hasRenderer: !!renderer,
          rendererHasShadowRoot: !!renderer?.shadowRoot
        });
        sendResponse({ error: 'Could not find clickable game element. Try manually clicking the game once.' });
      }
      break;
    }

    // Note: START_MISSION_AUTOMATION and STOP_MISSION_AUTOMATION are broadcast by background
    // to all frames, so they'll reach the devvit-content script directly.
    // Reddit-content doesn't need to handle these.

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true;
});

// Load saved filters
chrome.storage.local.get(['filters'], (result) => {
  if (result.filters) {
    filters = result.filters;
  }
});

// Expose debug functions to window for console testing
(window as any).autoSupperDebug = {
  getAllLevels,
  parseLevelFromPost,
  filterLevels,
  filters,
  isRunning,
  currentStatus,
  renderControlPanel,
  testSelectors: () => {
    redditLogger.log('Testing selectors');
    const selectors = [
      '[data-testid="post-container"]',
      'shreddit-post',
      '[data-click-id="background"]',
      'article',
      '[id^="t3_"]'
    ];
    selectors.forEach(sel => {
      const found = document.querySelectorAll(sel);
      redditLogger.log(`Selector "${sel}"`, { count: found.length });
    });
  }
};

redditLogger.log('Debug functions available: window.autoSupperDebug');

// Use MutationObserver to detect when game loader appears instead of fixed delay
const initializeAutomation = () => {
  redditLogger.log('[initializeAutomation] Called - checking for active bot session');

  chrome.storage.local.get(['activeBotSession', 'automationConfig'], (result) => {
    redditLogger.log('[initializeAutomation] Storage check result', {
      hasActiveBotSession: !!result.activeBotSession,
      hasAutomationConfig: !!result.automationConfig
    });

    if (result.activeBotSession) {
      redditLogger.log('Active bot session detected, automatically opening mission');

      // Broadcast friendly status
      chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        status: 'Loading next mission...',
      });

      // First check if iframe already exists (e.g., after a manual refresh)
      const checkForExistingIframe = (): HTMLIFrameElement | null => {
        let gameIframe = document.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
        if (gameIframe) return gameIframe;

        const loader = document.querySelector('shreddit-devvit-ui-loader');
        if (loader?.shadowRoot) {
          gameIframe = loader.shadowRoot.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
          if (gameIframe) return gameIframe;

          const webView = loader.shadowRoot.querySelector('devvit-blocks-web-view');
          if (webView?.shadowRoot) {
            gameIframe = webView.shadowRoot.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
            if (gameIframe) return gameIframe;
          }
        }
        return null;
      };

      const existingIframe = checkForExistingIframe();
      if (existingIframe) {
        redditLogger.log('Iframe already exists (page was refreshed), starting automation immediately');

        // Wait a bit for game to be ready, then start automation
        setTimeout(() => {
          const clearedImage = checkMissionClearedInDOM();

          if (clearedImage) {
            redditLogger.warn('Mission already cleared, skipping');
            chrome.storage.local.remove(['activeBotSession']);

            const postIdMatch = window.location.pathname.match(/\/comments\/([^/]+)/);
            if (postIdMatch) {
              const postId = 't3_' + postIdMatch[1];
              markMissionCleared(postId).then(() => {
                chrome.storage.local.get(['filters'], (filterResult) => {
                  chrome.runtime.sendMessage({
                    type: 'NAVIGATE_TO_MISSION',
                    filters: filterResult.filters,
                  });
                });
              });
            }
          } else {
            redditLogger.log('Starting automation on existing iframe');
            // Keep activeBotSession flag so bot continues running
            chrome.runtime.sendMessage({
              type: 'START_MISSION_AUTOMATION',
              config: result.automationConfig
            });
          }
        }, 2000);
        return;
      }

      // No iframe found, need to click to open it
      // Broadcast status
      chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        status: 'Opening mission...',
      });

      // First, try to click the game UI to open it
      const tryClickGame = () => {
        const loader = document.querySelector('shreddit-devvit-ui-loader');
        if (!loader) {
          redditLogger.log('No loader found yet, will retry');
          return false;
        }

        // Navigate deep into shadow DOM to find clickable container
        const surface = loader.shadowRoot?.querySelector('devvit-surface');
        const renderer = surface?.shadowRoot?.querySelector('devvit-blocks-renderer');

        redditLogger.log('Shadow DOM elements found:', {
          hasLoader: !!loader,
          hasSurface: !!surface,
          hasRenderer: !!renderer,
          rendererHasShadowRoot: !!renderer?.shadowRoot
        });

        const clickableContainer = renderer?.shadowRoot?.querySelector('.cursor-pointer');

        if (clickableContainer) {
          redditLogger.log('Found clickable game container, clicking to open mission');
          (clickableContainer as HTMLElement).click();

          // Wait for modal to open, then click fullscreen and start automation
          setTimeout(() => {
            const fullscreenControls = document.querySelector('devvit-fullscreen-web-view-controls');
            const sizeControls = fullscreenControls?.shadowRoot?.querySelector('devvit-web-view-preview-size-controls');
            const fullscreenButton = sizeControls?.shadowRoot?.querySelector('button[aria-label="Toggle fullscreen web view"]');

            if (fullscreenButton) {
              redditLogger.log('Clicking fullscreen button');
              (fullscreenButton as HTMLElement).click();
            } else {
              redditLogger.warn('Fullscreen button not found');
            }

            // Wait for iframe to load and game to initialize, then start automation
            setTimeout(() => {
              redditLogger.log('Game should be ready, checking if mission is cleared');
              const clearedImage = checkMissionClearedInDOM();

              if (clearedImage) {
                redditLogger.warn('Mission is already cleared! Moving to next mission');
                chrome.storage.local.remove(['activeBotSession']);
                const postIdMatch = window.location.pathname.match(/\/comments\/([^/]+)/);
                if (postIdMatch) {
                  const postId = 't3_' + postIdMatch[1];
                  markMissionCleared(postId).then(() => {
                    chrome.storage.local.get(['automationFilters'], (filterResult) => {
                      chrome.runtime.sendMessage({
                        type: 'NAVIGATE_TO_MISSION',
                        filters: filterResult.automationFilters,
                      });
                    });
                  });
                }
              } else {
                redditLogger.log('Mission not cleared, starting automation');
                // Keep activeBotSession so bot continues running
                chrome.runtime.sendMessage({
                  type: 'START_MISSION_AUTOMATION',
                  config: result.automationConfig
                });
              }
            }, 3000); // Wait 3 seconds for game to load
          }, 1000);

          return true;
        }

        redditLogger.log('Clickable container not found yet, will retry');
        return false;
      };

      // Try clicking immediately
      const clickedImmediately = tryClickGame();
      redditLogger.log('First click attempt result:', { clicked: clickedImmediately });

      if (!clickedImmediately) {
        redditLogger.log('Starting retry loop for game click...');
        // If we couldn't click immediately, keep trying for longer
        let clickAttempts = 0;
        const maxClickAttempts = 20; // 10 seconds total (enough time for Reddit to load)
        const clickInterval = setInterval(() => {
          clickAttempts++;
          if (tryClickGame() || clickAttempts >= maxClickAttempts) {
            clearInterval(clickInterval);
            if (clickAttempts >= maxClickAttempts) {
              redditLogger.error('Could not find game to click after 10 seconds. Reddit page may not have loaded properly.');
              // Clear pending automation since we failed
              chrome.storage.local.remove(['activeBotSession']);
              chrome.runtime.sendMessage({
                type: 'STATUS_UPDATE',
                status: 'Failed to open mission. Try manually refreshing the page.',
              });
            }
          }
        }, 500);
      }
    }
  });
};

// Set up MutationObserver to watch for game loader appearing in DOM
let automationInitialized = false;

const observer = new MutationObserver((mutations) => {
  // Check if game loader has appeared
  const loader = document.querySelector('shreddit-devvit-ui-loader');

  if (loader && !automationInitialized) {
    redditLogger.log('Game loader detected in DOM, initializing automation');
    automationInitialized = true;
    observer.disconnect(); // Stop observing once we've found it

    // Give shadow DOM a moment to render, then initialize
    setTimeout(() => {
      initializeAutomation();
    }, 1000);
  }
});

// Start observing the document for changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Also try immediately in case the loader is already there
const existingLoader = document.querySelector('shreddit-devvit-ui-loader');
if (existingLoader) {
  redditLogger.log('Game loader already in DOM, initializing immediately');
  automationInitialized = true;
  observer.disconnect();
  setTimeout(() => {
    initializeAutomation();
  }, 1000);
}

// Fallback: if nothing happens within 10 seconds, try anyway
setTimeout(() => {
  if (!automationInitialized) {
    redditLogger.warn('Timeout waiting for game loader, attempting initialization anyway');
    automationInitialized = true;
    observer.disconnect();
    initializeAutomation();
  }
}, 10000);

// Track which posts we've already scanned
const scannedPostIds = new Set<string>();

// Debounced scroll handler to scan for new missions
let scrollTimeout: number | null = null;
let lastScrollScan = 0;
const SCROLL_SCAN_DELAY = 2000; // Wait 2 seconds after scrolling stops
const SCROLL_SCAN_COOLDOWN = 5000; // Don't scan more than once every 5 seconds

function scanForNewMissions(reason: string = 'scroll'): void {
  const now = Date.now();

  // Cooldown check - don't scan too frequently
  if (now - lastScrollScan < SCROLL_SCAN_COOLDOWN) {
    redditLogger.log('Skipping scan - too soon since last scan', { reason });
    return;
  }

  lastScrollScan = now;
  redditLogger.log(`Scan triggered: ${reason}`);

  const levels = getAllLevels();
  redditLogger.log('Scan complete', { levelsFound: levels.length, reason });
}

window.addEventListener('scroll', () => {
  // Clear existing timeout
  if (scrollTimeout !== null) {
    clearTimeout(scrollTimeout);
  }

  // Set new timeout - scan when user stops scrolling
  scrollTimeout = window.setTimeout(() => {
    scanForNewMissions('scroll');
    scrollTimeout = null;
  }, SCROLL_SCAN_DELAY);
}, { passive: true });

redditLogger.log('Scroll-based scanning enabled');

// Initialize control panel on page load and restore bot state
setTimeout(() => {
  redditLogger.log('Initializing control panel');

  // Check if bot is running by checking for active session
  chrome.storage.local.get(['activeBotSession'], (result) => {
    if (result.activeBotSession) {
      redditLogger.log('Active bot session detected, restoring bot state');
      isRunning = true;
      currentStatus = 'Bot running...';
    }
    renderControlPanel();
  });
}, 1000);

// Listen for storage changes to update bot state in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.activeBotSession) {
    const newValue = changes.activeBotSession.newValue;
    const oldValue = changes.activeBotSession.oldValue;

    if (newValue && !oldValue) {
      // Bot was started
      redditLogger.log('Bot session started');
      isRunning = true;
      currentStatus = 'Bot running...';
      renderControlPanel();
    } else if (!newValue && oldValue) {
      // Bot was stopped
      redditLogger.log('Bot session stopped');
      isRunning = false;
      currentStatus = 'Idle';
      renderControlPanel();
    }
  }
});

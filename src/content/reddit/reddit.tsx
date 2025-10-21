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

// ============================================================================
// Extension Context Error Handling
// ============================================================================

/**
 * Safely send message to background script with proper error handling
 * Shows user-friendly message if extension context is invalidated
 */
function safeSendMessage(message: any, callback?: (response: any) => void): void {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        handleExtensionContextError(chrome.runtime.lastError);
        return;
      }
      if (callback) {
        callback(response);
      }
    });
  } catch (error) {
    handleExtensionContextError(error);
  }
}

/**
 * Handle extension context invalidation with user-friendly message
 */
function handleExtensionContextError(error: any): void {
  const errorMsg = String(error.message || error);

  if (errorMsg.includes('Extension context invalidated')) {
    // Show user-friendly notification
    showExtensionReloadNotification();

    redditLogger.log('[ExtensionContext] Extension was updated/reloaded, page needs refresh', {
      error: errorMsg,
      url: window.location.href,
    });
  } else {
    redditLogger.error('[ExtensionContext] Runtime error', {
      error: errorMsg,
    });
  }
}

/**
 * Show notification to user that extension was updated
 */
function showExtensionReloadNotification(): void {
  // Remove any existing notification
  const existingNotification = document.getElementById('autosupper-reload-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification banner
  const notification = document.createElement('div');
  notification.id = 'autosupper-reload-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <div style="font-size: 24px;">🔄</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 4px;">AutoSupper Extension Updated</div>
        <div style="font-size: 13px; opacity: 0.95; margin-bottom: 12px;">
          The extension was updated or reloaded. Please refresh this page to continue using the bot.
        </div>
        <button id="autosupper-reload-btn" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          transition: transform 0.2s;
        ">
          Reload Page Now
        </button>
      </div>
      <button id="autosupper-close-notification" style="
        background: transparent;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        opacity: 0.8;
        transition: opacity 0.2s;
      ">×</button>
    </div>
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    #autosupper-reload-btn:hover {
      transform: scale(1.05);
    }
    #autosupper-close-notification:hover {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Add event listeners
  const reloadBtn = document.getElementById('autosupper-reload-btn');
  const closeBtn = document.getElementById('autosupper-close-notification');

  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      notification.remove();
    });
  }

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }
  }, 30000);
}

// ============================================================================
// State Tracking (Actual state machine lives in background service worker)
// ============================================================================

// Track current state for UI updates (received from background via STATE_CHANGED messages)
let currentBotState: string = 'idle';
let currentBotContext: any = null;

// Check if we're on a mission page and notify background when preview loads
chrome.storage.local.get(['activeBotSession'], (result) => {
  const isCommentsPage = window.location.pathname.includes('/comments/');

  redditLogger.log('[PageLoad] Checking for active bot session', {
    hasSession: !!result.activeBotSession,
    pathname: window.location.pathname,
    isCommentsPage,
    fullUrl: window.location.href,
  });

  if (result.activeBotSession && isCommentsPage) {
    redditLogger.log('[PageLoad] Active session detected on comments page, will monitor for game loader');
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

        safeSendMessage({
          type: 'MISSION_PAGE_LOADED',
          missionId: postId,
          permalink,
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

            safeSendMessage({
              type: 'MISSION_PAGE_LOADED',
              missionId: postId,
              permalink,
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wait for an element to appear in the DOM using MutationObserver
 * More efficient than polling with setTimeout/setInterval
 */
function waitForElement(
  selector: string,
  timeout: number = 5000,
  rootElement: Element | Document = document
): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    const existingElement = rootElement.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    // Set up MutationObserver
    const observer = new MutationObserver(() => {
      const element = rootElement.querySelector(selector);
      if (element) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(element);
      }
    });

    // Start observing
    const targetNode = rootElement === document ? document.body : rootElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    } else {
      clearTimeout(timeoutId);
      resolve(null);
    }
  });
}

/**
 * Get human-readable status text for current state
 */
function getStatusText(state: string, context: any): string {
  switch (state) {
    case 'idle':
      // Show reason for being idle if available
      if (context?.completionReason === 'no_missions') {
        return 'Idle - No more missions';
      } else if (context?.completionReason === 'stopped') {
        return 'Idle - Stopped';
      } else if (context?.completionReason === 'error') {
        return `Idle - Error: ${context?.errorMessage || 'Unknown'}`;
      }
      return 'Idle';
    case 'starting':
      return 'Starting...';
    case 'navigating':
      return 'Navigating...';
    case 'waitingForGame':
      return 'Waiting for game...';
    case 'openingGame':
      return 'Opening game...';
    case 'gameReady':
      return 'Starting automation...';
    case 'running':
      return 'Running';
    case 'completing':
      return 'Finding next mission...';
    case 'error':
      return `Error: ${context?.errorMessage || 'Unknown'}`;
    default:
      return 'Unknown state';
  }
}

/**
 * Check for existing game loader and report to background
 */
function checkForExistingLoader(): boolean {
  const existingLoader = document.querySelector('shreddit-devvit-ui-loader');
  if (existingLoader) {
    redditLogger.log('[checkForExistingLoader] Game loader found in DOM', { state: currentBotState });
    safeSendMessage({ type: 'GAME_LOADER_DETECTED' });
    return true;
  }

  // Loader not found yet, make sure observer is active
  redditLogger.log('[checkForExistingLoader] Loader not found, ensuring observer is active');
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  return false;
}

/**
 * Click the game UI to open the mission dialog
 */
async function clickGameUI(): Promise<boolean> {
  const loader = document.querySelector('shreddit-devvit-ui-loader');
  if (!loader) {
    redditLogger.warn('[clickGameUI] No loader found');
    chrome.runtime.sendMessage({ type: 'ERROR_OCCURRED', message: 'Game loader not found' });
    return false;
  }

  // Navigate deep into shadow DOM to find clickable container
  const surface = loader.shadowRoot?.querySelector('devvit-surface');
  const renderer = surface?.shadowRoot?.querySelector('devvit-blocks-renderer');
  const clickableContainer = renderer?.shadowRoot?.querySelector('.cursor-pointer');

  if (clickableContainer) {
    redditLogger.log('[clickGameUI] Found clickable container, clicking');
    (clickableContainer as HTMLElement).click();

    // Wait for fullscreen controls to appear using MutationObserver
    const fullscreenControls = await waitForElement('devvit-fullscreen-web-view-controls', 3000);

    if (fullscreenControls) {
      redditLogger.log('[clickGameUI] Fullscreen controls found, waiting for animation to complete');

      // Wait for animation to complete (dialog slide-in, etc.)
      await new Promise(resolve => setTimeout(resolve, 800));

      redditLogger.log('[clickGameUI] Exploring shadow DOM for fullscreen button', {
        hasShadowRoot: !!fullscreenControls.shadowRoot,
      });

      const sizeControls = fullscreenControls.shadowRoot?.querySelector('devvit-web-view-preview-size-controls');
      redditLogger.log('[clickGameUI] Size controls', {
        found: !!sizeControls,
        hasShadowRoot: !!sizeControls?.shadowRoot,
      });

      // Try multiple selectors for the fullscreen button
      let fullscreenButton = sizeControls?.shadowRoot?.querySelector('button[aria-label="Toggle fullscreen web view"]') as HTMLElement;

      if (!fullscreenButton) {
        // Try without aria-label
        fullscreenButton = sizeControls?.shadowRoot?.querySelector('button') as HTMLElement;
        redditLogger.log('[clickGameUI] Tried generic button selector', { found: !!fullscreenButton });
      }

      if (!fullscreenButton) {
        // Try in fullscreenControls directly
        fullscreenButton = fullscreenControls.shadowRoot?.querySelector('button') as HTMLElement;
        redditLogger.log('[clickGameUI] Tried button in fullscreenControls', { found: !!fullscreenButton });
      }

      if (fullscreenButton) {
        redditLogger.log('[clickGameUI] Clicking fullscreen button');
        fullscreenButton.click();

        // Wait a bit for fullscreen to engage, then signal dialog opened
        await new Promise(resolve => setTimeout(resolve, 500));
        safeSendMessage({ type: 'GAME_DIALOG_OPENED' });
      } else {
        redditLogger.error('[clickGameUI] Fullscreen button not found after trying all selectors', {
          fullscreenControlsHTML: fullscreenControls.innerHTML?.substring(0, 200),
          hasShadowRoot: !!fullscreenControls.shadowRoot,
          shadowRootHTML: fullscreenControls.shadowRoot?.innerHTML?.substring(0, 200),
        });
        safeSendMessage({ type: 'ERROR_OCCURRED', message: 'Fullscreen button not found' });
      }
    } else {
      redditLogger.warn('[clickGameUI] Fullscreen controls did not appear');
      safeSendMessage({ type: 'ERROR_OCCURRED', message: 'Fullscreen controls not found' });
    }

    return true;
  }

  redditLogger.warn('[clickGameUI] Clickable container not found');
  chrome.runtime.sendMessage({ type: 'ERROR_OCCURRED', message: 'Clickable container not found' });
  return false;
}

/**
 * Render the React control panel
 * Uses state received from background via STATE_CHANGED messages
 */
function renderControlPanel(): void {
  // Use state received from background
  const isRunning = !['idle', 'error'].includes(currentBotState);
  const status = getStatusText(currentBotState, currentBotContext);

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
      status={status}
      onStart={() => {
        redditLogger.log('[ControlPanel] Start button clicked');

        // Get filters and send START_BOT to background
        chrome.storage.local.get(['filters'], (result) => {
          const filters = result.filters || {
            stars: [1, 2],
            minLevel: 1,
            maxLevel: 340,
            onlyIncomplete: true,
            autoProcess: false,
          };

          safeSendMessage({
            type: 'START_BOT',
            filters,
          });
        });
      }}
      onStop={() => {
        redditLogger.log('[ControlPanel] Stop button clicked');
        safeSendMessage({ type: 'STOP_BOT' });
      }}
      onOpenSettings={() => {
        redditLogger.log('[ControlPanel] Opening settings');
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

// Listen for messages from background script and popup
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  redditLogger.log('Received Chrome message', { type: message.type });

  switch (message.type) {
    // ============================================================================
    // Commands from background service worker
    // ============================================================================

    case 'STATE_CHANGED':
      // Background notifies us of state changes so we can update UI
      const stateMsg = message as any;
      currentBotState = stateMsg.state;
      currentBotContext = stateMsg.context;
      redditLogger.log('[STATE_CHANGED] Updated local state', { state: currentBotState });
      renderControlPanel();
      sendResponse({ success: true });
      break;

    case 'CHECK_FOR_GAME_LOADER':
      // Background wants us to check if game loader is present
      redditLogger.log('[CHECK_FOR_GAME_LOADER] Checking for loader');
      checkForExistingLoader();
      sendResponse({ success: true });
      break;

    case 'CLICK_GAME_UI':
      // Background wants us to click the game UI
      redditLogger.log('[CLICK_GAME_UI] Clicking game UI');
      clickGameUI().then(success => {
        sendResponse({ success });
      });
      return true; // Will respond asynchronously
      break;

    case 'FIND_NEXT_MISSION':
      // Background wants us to find the next uncompleted mission
      redditLogger.log('[FIND_NEXT_MISSION] Finding next mission', { filters: message.filters });
      const findMsg = message as any;
      getNextUnclearedMission({
        stars: findMsg.filters.stars,
        minLevel: findMsg.filters.minLevel,
        maxLevel: findMsg.filters.maxLevel,
      }).then((mission: any) => {
        redditLogger.log('[FIND_NEXT_MISSION] Search complete', {
          found: !!mission,
          missionId: mission?.postId,
          permalink: mission?.permalink,
        });

        if (mission && mission.permalink) {
          // Check if we're already on this page
          const isCurrentPage = window.location.href === mission.permalink || window.location.pathname.includes(mission.postId.replace('t3_', ''));

          redditLogger.log('[FIND_NEXT_MISSION] Sending MISSION_FOUND', {
            missionId: mission.postId,
            isCurrentPage,
          });

          safeSendMessage({
            type: 'MISSION_FOUND',
            missionId: mission.postId,
            permalink: mission.permalink,
            isCurrentPage,
          });
        } else {
          redditLogger.log('[FIND_NEXT_MISSION] No missions available, sending NO_MISSIONS_FOUND');
          safeSendMessage({ type: 'NO_MISSIONS_FOUND' });
        }
      }).catch((error) => {
        redditLogger.error('[FIND_NEXT_MISSION] Error finding mission', { error: String(error) });
        chrome.runtime.sendMessage({
          type: 'ERROR_OCCURRED',
          message: 'Failed to find next mission: ' + String(error),
        });
      });
      sendResponse({ success: true });
      break;

    case 'NAVIGATE_TO_URL':
      // Background wants us to navigate to a URL
      const navMsg = message as any;
      redditLogger.log('[NAVIGATE_TO_URL] Navigating to', { url: navMsg.url });
      window.location.href = navMsg.url;
      sendResponse({ success: true });
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
        const filteredLevels = filterLevels(allLevels, playMsg.filters || currentBotContext?.filters);

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
      redditLogger.log('[NAVIGATE_TO_MISSION] Finding next uncompleted mission', {
        filters: message.filters
      });

      // Get next uncompleted mission from database with filters
      const missionFilters = message.filters ? {
        stars: message.filters.stars,
        minLevel: message.filters.minLevel,
        maxLevel: message.filters.maxLevel
      } : undefined;

      getNextUnclearedMission(missionFilters).then((mission: any) => {
        if (mission && mission.permalink) {
          redditLogger.log('[NAVIGATE_TO_MISSION] Found uncompleted mission', {
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
            // We're already on the mission page - send MISSION_PAGE_LOADED event
            redditLogger.log('[NAVIGATE_TO_MISSION] Already on mission page, sending MISSION_PAGE_LOADED event');
            safeSendMessage({
              type: 'MISSION_PAGE_LOADED',
              missionId: mission.postId,
              permalink: mission.permalink,
            });

            sendResponse({
              success: true,
              message: `Starting mission: ${mission.tags || mission.postId}`,
            });
          } else {
            // Navigate to the mission page - navigation will reload page
            // When page loads, activeBotSession will be detected and game will auto-open
            redditLogger.log('[NAVIGATE_TO_MISSION] Navigating to different page');

            safeSendMessage({
              type: 'NAVIGATE_TO_MISSION',
              missionId: mission.postId,
              permalink: mission.permalink,
            });

            // Actually navigate
            window.location.href = mission.permalink;

            sendResponse({
              success: true,
              message: `Navigating to: ${mission.tags || mission.postId}`,
            });
          }
        } else if (mission) {
          redditLogger.warn('[NAVIGATE_TO_MISSION] Mission found but has no permalink', { postId: mission.postId });
          safeSendMessage({
            type: 'ERROR_OCCURRED',
            message: 'Mission has no permalink URL',
          });
          alert('Mission found but has no permalink URL');
          sendResponse({ error: 'Mission has no permalink URL' });
        } else {
          redditLogger.warn('[NAVIGATE_TO_MISSION] No uncompleted missions found', { filters: missionFilters });
          safeSendMessage({ type: 'NO_MISSIONS_FOUND' });
          alert('No uncleared missions found matching your filters. Try adjusting star difficulty or level range.');
          sendResponse({ error: 'No uncompleted missions found matching filters.' });
        }
      }).catch((error) => {
        redditLogger.error('[NAVIGATE_TO_MISSION] Error fetching next mission', { error: String(error) });
        chrome.runtime.sendMessage({
          type: 'ERROR_OCCURRED',
          message: 'Failed to fetch next mission: ' + String(error),
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

    case 'AUTOMATION_READY':
      // Game iframe automation is initialized and ready - forward to background
      redditLogger.log('[AUTOMATION_READY] Game iframe reports automation is ready, forwarding to background');
      safeSendMessage({ type: 'AUTOMATION_READY' });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true;
});

// Expose debug functions to window for console testing
(window as any).autoSupperDebug = {
  getAllLevels,
  parseLevelFromPost,
  filterLevels,
  getState: () => ({ state: currentBotState, context: currentBotContext }),
  sendEvent: (event: any) => safeSendMessage(event),
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

// OLD initializeAutomation function - NO LONGER USED (replaced by state machine)
// Kept for reference, may be removed later
const initializeAutomation_DEPRECATED = () => {
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
                  safeSendMessage({
                    type: 'NAVIGATE_TO_MISSION',
                    filters: filterResult.filters,
                  });
                });
              });
            }
          } else {
            redditLogger.log('Starting automation on existing iframe');
            // Keep activeBotSession flag so bot continues running
            safeSendMessage({
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
                      safeSendMessage({
                        type: 'NAVIGATE_TO_MISSION',
                        filters: filterResult.automationFilters,
                      });
                    });
                  });
                }
              } else {
                redditLogger.log('Mission not cleared, starting automation');
                // Keep activeBotSession so bot continues running
                safeSendMessage({
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
              safeSendMessage({
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
function startObserving() {
  if (document.body) {
    redditLogger.log('[MutationObserver] Starting to observe DOM for game loader');
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Check immediately in case the loader is already there
    checkForExistingLoader();
  } else {
    // Body not ready yet, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
      redditLogger.log('[MutationObserver] DOM ready, starting to observe');
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      checkForExistingLoader();
    });
  }
}

startObserving();

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

// Initialize control panel when DOM is ready
function initializeControlPanel() {
  redditLogger.log('Initializing control panel');
  renderControlPanel();
}

if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
  document.addEventListener('DOMContentLoaded', initializeControlPanel);
} else {
  // DOM is already loaded (in case script runs late)
  initializeControlPanel();
}

// Listen for storage changes to sync state machine with background script
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.botMachineState) {
    const newState = changes.botMachineState.newValue;
    redditLogger.log('[Storage] Bot machine state changed', { newState });
    // State machine already updates from subscribe(), no need to do anything here
  }
});

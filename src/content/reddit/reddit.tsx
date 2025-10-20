/**
 * Content script for Sword & Supper Bot
 * Injects React components and handles game interaction
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import LevelControlPanel from '../../components/LevelControlPanel';
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

redditLogger.log('Sword & Supper Bot content script loaded');
redditLogger.log('Current URL', { url: window.location.href });
redditLogger.log('Load time', { time: new Date().toISOString() });

let root: Root | null = null;
let isRunning = false;
let filters: LevelFilters = {
  stars: [1, 2], // Default: 1-2 stars (easiest)
  minLevel: 1,
  maxLevel: 340,
  onlyIncomplete: true,
};

/**
 * Render the React control panel
 */
function renderControlPanel(levels: Level[]): void {
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
    <LevelControlPanel
      levels={levels}
      filters={filters}
      isRunning={isRunning}
      onFilterChange={(newFilters) => {
        filters = newFilters;
        chrome.storage.local.set({ filters });
        processLevels();
      }}
      onStart={() => {
        isRunning = true;
        processLevels();
      }}
      onStop={() => {
        isRunning = false;
        unmountControlPanel();
      }}
      onLevelClick={clickLevel}
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
 * Main processing function
 */
function processLevels(): void {
  if (!isRunning) return;

  redditLogger.log('Processing levels with filters', { filters });

  // Get all levels
  const allLevels = getAllLevels();

  // Filter levels
  const filteredLevels = filterLevels(allLevels, filters);

  redditLogger.log('Filtered levels', { count: filteredLevels.length });

  // Render React component
  renderControlPanel(filteredLevels);

  // Send results to popup
  chrome.runtime.sendMessage({
    type: 'LEVELS_FOUND',
    levels: filteredLevels.map((l) => ({
      title: l.title,
      stars: l.stars,
      levelNumber: l.levelNumber,
      levelRange: l.levelRange,
      levelRangeMin: l.levelRangeMin,
      levelRangeMax: l.levelRangeMax,
      isCompleted: l.isCompleted,
      href: l.href,
    })),
  });
}

// Listen for messages from background script and popup
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  redditLogger.log('Received Chrome message', { type: message.type });

  switch (message.type) {
    case 'START_PROCESSING':
      isRunning = true;
      filters = { ...filters, ...message.filters };
      processLevels();
      sendResponse({ success: true });
      break;

    case 'STOP_PROCESSING':
      isRunning = false;
      unmountControlPanel();
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
              pendingAutomation: true,
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
          pendingAutomation: true,
          automationConfig: playMsg.config
        });

        // Function to click the game UI
        const clickGameUI = () => {
          // Try to find devvit-blocks-renderer or clickable game element
          let clickableElement = null;

          if (loader) {
            // Try devvit-blocks-renderer
            clickableElement = loader.querySelector('devvit-blocks-renderer');

            // Try first div with data-block-type
            if (!clickableElement) {
              clickableElement = loader.querySelector('[data-block-type]');
            }

            // Try any div with pointer-events-auto class
            if (!clickableElement) {
              clickableElement = loader.querySelector('.pointer-events-auto');
            }
          }

          if (clickableElement) {
            redditLogger.log('Found clickable element, clicking');
            (clickableElement as HTMLElement).click();
            return true;
          }

          // If nothing found, try clicking the loader itself at the button position
          if (loader) {
            redditLogger.log('Clicking loader at estimated button position');
            const rect = loader.getBoundingClientRect();
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + rect.height - 80
            });
            loader.dispatchEvent(clickEvent);
            return true;
          }

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
      redditLogger.log('Debug Step 1: Navigate to mission permalink');
      const debugMsg = message as any;
      const allLevels = getAllLevels();
      const filteredLevels = filterLevels(allLevels, debugMsg.filters || filters);

      if (filteredLevels.length > 0) {
        const firstMission = filteredLevels[0];
        redditLogger.log('Found mission', { title: firstMission.title });

        if (firstMission.href) {
          redditLogger.log('Navigating to', { href: firstMission.href });
          window.location.href = firstMission.href;
          sendResponse({ success: true, message: `Navigating to: ${firstMission.title}` });
        } else {
          sendResponse({ error: 'Mission has no URL' });
        }
      } else {
        redditLogger.warn('No missions found matching filters');
        sendResponse({ error: 'No missions found matching filters' });
      }
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
  processLevels,
  filterLevels,
  filters,
  isRunning,
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

// Initial scan when page loads
setTimeout(() => {
  redditLogger.log('Initial page scan starting');
  const levels = getAllLevels();
  redditLogger.log('Scan complete', { levelsFound: levels.length });
  if (levels.length > 0) {
    redditLogger.log('First 3 levels', { levels: levels.slice(0, 3) });
  }

  // Check if we have pending automation from a previous page
  chrome.storage.local.get(['pendingAutomation', 'automationConfig'], (result) => {
    if (result.pendingAutomation) {
      redditLogger.log('Found pending automation, waiting for iframe');

      // Function to find iframe in nested shadow DOMs
      const findGameIframe = (): HTMLIFrameElement | null => {
        // Try direct search first
        let gameIframe = document.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
        if (gameIframe) return gameIframe;

        // Search in loader's shadow root
        const loader = document.querySelector('shreddit-devvit-ui-loader');
        if (loader?.shadowRoot) {
          gameIframe = loader.shadowRoot.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
          if (gameIframe) return gameIframe;

          // Search in nested shadow DOMs (devvit-blocks-web-view)
          const webView = loader.shadowRoot.querySelector('devvit-blocks-web-view');
          if (webView?.shadowRoot) {
            gameIframe = webView.shadowRoot.querySelector('iframe[src*="devvit.net"]') as HTMLIFrameElement;
            if (gameIframe) return gameIframe;
          }
        }

        return null;
      };

      // Wait for iframe to load
      const checkIframe = setInterval(() => {
        const gameIframe = findGameIframe();

        if (gameIframe) {
          redditLogger.log('Iframe loaded, starting automation');
          redditLogger.log('Iframe src', { src: gameIframe.src.substring(0, 100) });
          clearInterval(checkIframe);

          // Clear pending flag
          chrome.storage.local.remove(['pendingAutomation']);

          // Start automation via background
          chrome.runtime.sendMessage({
            type: 'START_MISSION_AUTOMATION',
            config: result.automationConfig
          });
          redditLogger.log('Sent START_MISSION_AUTOMATION message');
        }
      }, 500); // Check every 500ms

      // Stop checking after 10 seconds
      setTimeout(() => {
        clearInterval(checkIframe);
        chrome.storage.local.remove(['pendingAutomation']);
      }, 10000);
    }
  });
}, 3000); // Increased to 3 seconds

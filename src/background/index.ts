/**
 * Background script for Sword & Supper Bot
 * Handles message passing and state coordination
 */

import { BotState, ChromeMessage, LevelFilters } from '../types';
import { extensionLogger } from '../utils/logger';

// Extension state
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
  extensionLogger.log('From', { source: sender.tab ? `tab ${sender.tab.id}` : 'extension' });

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

    // Messages from popup - route to appropriate content script
    case 'START_BOT':
      state.isRunning = true;
      state.filters = message.filters;

      // Get automation config and mark bot session as active
      chrome.storage.local.get(['automationConfig'], (result) => {
        // Mark bot session as active so automation continues after navigation
        // Include filters so they're available after page reload
        chrome.storage.local.set({
          activeBotSession: true,
          automationConfig: result.automationConfig || {},
          automationFilters: message.filters
        });

        extensionLogger.log('Starting automation with filters', {
          stars: message.filters.stars,
          minLevel: message.filters.minLevel,
          maxLevel: message.filters.maxLevel
        });

        // Start full automation: navigate to first mission
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            extensionLogger.log('Starting automation - navigating to first mission');

            // Send status update
            chrome.runtime.sendMessage({
              type: 'STATUS_UPDATE',
              status: 'Looking for missions matching filters...',
            });

            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'NAVIGATE_TO_MISSION',
              filters: message.filters,
            }, (response) => {
              if (chrome.runtime.lastError) {
                extensionLogger.error('Failed to send NAVIGATE_TO_MISSION', {
                  error: chrome.runtime.lastError.message
                });
                chrome.runtime.sendMessage({
                  type: 'STATUS_UPDATE',
                  status: 'Idle',
                });
              }
            });
          } else {
            extensionLogger.error('No active tab found');
            chrome.runtime.sendMessage({
              type: 'STATUS_UPDATE',
              status: 'Idle',
            });
          }
        });
      });

      sendResponse({ success: true });
      break;

    case 'STOP_BOT':
      state.isRunning = false;

      // Clear active bot session flag and filters
      chrome.storage.local.remove(['activeBotSession', 'automationFilters']);

      // Forward to reddit-content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          extensionLogger.log('Forwarding STOP_PROCESSING to reddit-content');
          chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_PROCESSING' });
        }
      });

      // Also stop mission automation if running
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_MISSION_AUTOMATION' });
        }
      });

      sendResponse({ success: true });
      break;

    // Navigate to mission - route to reddit-content
    case 'NAVIGATE_TO_MISSION':
      extensionLogger.log('Forwarding NAVIGATE_TO_MISSION to reddit-content');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'NAVIGATE_TO_MISSION',
            filters: message.filters,
          }, (response) => {
            sendResponse(response);
          });
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
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'OPEN_MISSION_IFRAME',
          }, (response) => {
            sendResponse(response);
          });
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
                extensionLogger.warn('Message error', { error: chrome.runtime.lastError.message });
              } else {
                extensionLogger.log('Message delivered', { response });
              }
            }
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
          chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_MISSION_AUTOMATION' });
        }
      });
      sendResponse({ success: true });
      break;

    // Notification from devvit-content that automation is ready
    case 'AUTOMATION_READY':
      extensionLogger.log('Automation ready in game iframe');
      sendResponse({ success: true });
      break;

    default:
      extensionLogger.warn('Unknown message type', { type: message.type });
      sendResponse({ error: 'Unknown message type: ' + message.type });
  }

  return true; // Keep message channel open for async response
});

// Load saved state from storage on startup
chrome.storage.local.get(['completedLevels', 'filters'], (result) => {
  if (result.completedLevels) {
    state.completedLevels = result.completedLevels;
  }
  if (result.filters) {
    state.filters = result.filters;
  }
});

// Save state periodically
setInterval(() => {
  chrome.storage.local.set({
    completedLevels: state.completedLevels,
    filters: state.filters,
  });
}, 60000); // Every minute

extensionLogger.log('Sword & Supper Bot background script loaded');

/**
 * Background script for Sword & Supper Bot
 * Handles message passing and state coordination
 */

import { BotState, ChromeMessage, LevelFilters } from '../types';

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
  console.log('Background received message:', message);

  switch (message.type) {
    case 'GET_STATE':
      sendResponse(state);
      break;

    case 'START_BOT':
      state.isRunning = true;
      state.filters = message.filters;

      // Send message to content script to start processing
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'START_PROCESSING',
            filters: message.filters,
          });
        }
      });
      sendResponse({ success: true });
      break;

    case 'STOP_BOT':
      state.isRunning = false;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_PROCESSING' });
        }
      });
      sendResponse({ success: true });
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

    default:
      sendResponse({ error: 'Unknown message type' });
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

console.log('Sword & Supper Bot background script loaded');

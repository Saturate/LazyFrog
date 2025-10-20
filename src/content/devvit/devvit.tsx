/**
 * Game script - Runs inside the game iframe (*.devvit.net)
 * This is where we interact with the actual Sword & Supper game
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import GameControlPanel from '../../components/GameControlPanel';
import {
  SimpleAutomationEngine,
  DEFAULT_SIMPLE_CONFIG,
  SimpleAutomationConfig,
} from '../../automation/simpleAutomation';
import {
  MissionAutomationEngine,
} from '../../automation/missionAutomation';
import {
  analyzeGamePage,
  extractGameState,
  clickButton,
  getClickableElements,
} from './utils/dom';
import { devvitLogger } from '../../utils/logger';
import * as storage from '../../utils/storage';

devvitLogger.log('Script loaded', { url: window.location.href });

let root: Root | null = null;
let simpleAutomation: SimpleAutomationEngine | null = null;
let metadataEngine: MissionAutomationEngine | null = null; // For capturing metadata only

/**
 * Inject React control panel into the game
 */
function injectControlPanel(): void {
  devvitLogger.log('Injecting control panel');

  // Remove existing container if any
  let container = document.getElementById('ss-game-control-root');
  if (container) {
    container.remove();
  }

  // Create new container
  container = document.createElement('div');
  container.id = 'ss-game-control-root';

  // Try to find #app element and insert before it, otherwise append to body
  const appElement = document.getElementById('app');
  if (appElement && appElement.parentElement) {
    appElement.parentElement.insertBefore(container, appElement);
    devvitLogger.log('Injecting control panel before #app');
  } else {
    document.body.appendChild(container);
    devvitLogger.log('Injecting control panel to body');
  }

  // Create root and render
  root = createRoot(container);
  root.render(<GameControlPanel gameState={extractGameState()} />);

  devvitLogger.log('Control panel injected successfully');
}

/**
 * Initialize automation engines
 */
function initializeAutomation(): void {
  if (simpleAutomation) {
    devvitLogger.warn('Automation already initialized');
    return;
  }

  devvitLogger.log('Initializing automation engines');

  // Load config from storage
  chrome.storage.local.get(['automationConfig'], (result) => {
    const config = result.automationConfig || {};

    // Initialize simple button-clicking automation
    const simpleConfig: SimpleAutomationConfig = {
      enabled: false, // Will be enabled when user clicks button
      abilityTierList: config.abilityTierList || DEFAULT_SIMPLE_CONFIG.abilityTierList,
      blessingStatPriority: config.blessingStatPriority || DEFAULT_SIMPLE_CONFIG.blessingStatPriority,
      autoAcceptSkillBargains: config.autoAcceptSkillBargains !== undefined
        ? config.autoAcceptSkillBargains
        : DEFAULT_SIMPLE_CONFIG.autoAcceptSkillBargains,
      skillBargainStrategy: config.skillBargainStrategy || DEFAULT_SIMPLE_CONFIG.skillBargainStrategy,
      crossroadsStrategy: config.crossroadsStrategy || DEFAULT_SIMPLE_CONFIG.crossroadsStrategy,
      clickDelay: 1000,
    };

    simpleAutomation = new SimpleAutomationEngine(simpleConfig);

    // Also initialize metadata capture engine (for future use)
    metadataEngine = new MissionAutomationEngine({
      ...config,
      enabled: false, // Don't run automation, just capture metadata
    });
    metadataEngine.startConsoleMonitoring();

    devvitLogger.log('Automation engines initialized');
    devvitLogger.log('Config', { config: simpleConfig });

    // Notify background script that automation is ready
    chrome.runtime.sendMessage({
      type: 'AUTOMATION_READY',
      config: simpleConfig,
    });
  });
}

/**
 * Toggle automation on/off
 */
function toggleAutomation(enabled: boolean): void {
  devvitLogger.log('toggleAutomation called', { enabled });
  if (!simpleAutomation) {
    devvitLogger.error('Automation not initialized');
    return;
  }

  if (enabled) {
    simpleAutomation.start();
    devvitLogger.log('Automation started');
  } else {
    simpleAutomation.stop();
    devvitLogger.log('Automation stopped');
  }

  devvitLogger.log('Automation state', { state: simpleAutomation.getState() });
}

/**
 * Update automation configuration
 */
function updateAutomationConfig(config: any): void {
  if (!simpleAutomation) {
    devvitLogger.error('Automation not initialized');
    return;
  }

  const simpleConfig: Partial<SimpleAutomationConfig> = {
    abilityTierList: config.abilityTierList,
    blessingStatPriority: config.blessingStatPriority,
    autoAcceptSkillBargains: config.autoAcceptSkillBargains,
    skillBargainStrategy: config.skillBargainStrategy,
    crossroadsStrategy: config.crossroadsStrategy,
  };

  simpleAutomation.updateConfig(simpleConfig);

  // Save to storage
  chrome.storage.local.set({ automationConfig: config });
}

/**
 * Get automation state
 */
function getAutomationState(): any {
  if (!simpleAutomation) {
    return { error: 'Automation not initialized' };
  }
  return simpleAutomation.getState();
}

// Listen for messages from Chrome extension (via background script)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  devvitLogger.log('Received Chrome message', { type: message.type });

  switch (message.type) {
    case 'START_MISSION_AUTOMATION':
      if (message.config) {
        updateAutomationConfig(message.config);
      }
      toggleAutomation(true);
      sendResponse({ success: true });
      break;

    case 'STOP_MISSION_AUTOMATION':
      toggleAutomation(false);
      sendResponse({ success: true });
      break;

    default:
      devvitLogger.warn('Unknown message type', { type: message.type });
      sendResponse({ error: 'Unknown message type: ' + message.type });
  }

  return true; // Keep channel open for async response
});

// Inject control panel as early as possible
setTimeout(() => {
  injectControlPanel();
}, 500);

// Initial analysis after a delay
setTimeout(() => {
  devvitLogger.log('Running initial game analysis');
  analyzeGamePage();
  extractGameState();

  // Initialize mission automation
  initializeAutomation();
}, 2000);

// Export functions for use in console
(window as any).ssBot = {
  analyze: analyzeGamePage,
  getState: extractGameState,
  clickButton,
  injectControls: injectControlPanel,
  getClickable: getClickableElements,
  // Automation functions
  startAutomation: () => toggleAutomation(true),
  stopAutomation: () => toggleAutomation(false),
  getAutomationState: () => simpleAutomation?.getState(),
  getMetadata: () => metadataEngine?.getState(),
  // Storage/database functions
  storage: {
    getAllMissions: storage.getAllMissions,
    getMission: storage.getMission,
    searchMissions: storage.searchMissions,
    clearAllMissions: storage.clearAllMissions,
    getStats: storage.getStorageStats,
    getUserOptions: storage.getUserOptions,
    saveUserOptions: storage.saveUserOptions,
    getNextUncompletedMission: storage.getNextUncompletedMission,
    getUncompletedMissions: storage.getUncompletedMissions,
    markCompleted: storage.markMissionCompleted,
  },
};

devvitLogger.log('Bot functions available in console via window.ssBot');

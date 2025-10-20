/**
 * Game script - Runs inside the game iframe (*.devvit.net)
 * This is where we interact with the actual Sword & Supper game
 */

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

// Version and build info (replaced by webpack at build time)
declare const __VERSION__: string;
declare const __BUILD_TIME__: string;

devvitLogger.log('Devvit content script loaded', {
  version: __VERSION__,
  buildTime: __BUILD_TIME__,
  url: window.location.href,
  loadTime: new Date().toISOString(),
});

let simpleAutomation: SimpleAutomationEngine | null = null;
let metadataEngine: MissionAutomationEngine | null = null; // For capturing metadata only

// Set up message listener IMMEDIATELY to catch initialData
// This must be before the game sends the message!
window.addEventListener('message', (event: MessageEvent) => {
  try {
    // Check for devvit-message with initialData
    if (event.data?.type === 'devvit-message') {
      const messageType = event.data?.data?.message?.type;

      devvitLogger.log('[Devvit] 📨 devvit-message received (early listener)', {
        messageType,
        origin: event.origin,
        hasMessageData: !!event.data?.data?.message?.data,
        timestamp: new Date().toISOString(),
      });

      // If it's initialData, store it for later processing
      if (messageType === 'initialData') {
        devvitLogger.log('[Devvit] ✅ initialData captured!', {
          postId: event.data?.data?.message?.data?.postId,
          username: event.data?.data?.message?.data?.username,
          difficulty: event.data?.data?.message?.data?.missionMetadata?.mission?.difficulty,
          environment: event.data?.data?.message?.data?.missionMetadata?.mission?.environment,
        });

        // Store the data globally so we can access it after automation engine initializes
        (window as any).__capturedInitialData = event.data.data.message.data;
      }
    }
  } catch (error) {
    devvitLogger.error('[Devvit] Error in early message listener', { error: String(error) });
  }
});

devvitLogger.log('[Devvit] Early message listener installed');

// Control panel removed - now using BotControlPanel in reddit context

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
  chrome.storage.local.get(['automationConfig'], async (result) => {
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

    // Check if we already captured initialData before the automation engine was ready
    const capturedData = (window as any).__capturedInitialData;
    if (capturedData) {
      devvitLogger.log('[Devvit] Processing previously captured initialData', {
        postId: capturedData.postId,
        username: capturedData.username,
      });

      // Manually trigger the save since the automation engine wasn't listening yet
      const missionMetadata = capturedData.missionMetadata;
      const postId = capturedData.postId;
      const username = capturedData.username;

      if (missionMetadata && postId && simpleAutomation) {
        // Save the captured mission data to database
        await simpleAutomation.saveMissionToDatabase(postId, username, missionMetadata);

        // IMPORTANT: Also set currentPostId so it's available when mission completes
        // This is normally set by the message listener, but since we captured it early, we need to set it manually
        (simpleAutomation as any).currentPostId = postId;
        (simpleAutomation as any).missionMetadata = missionMetadata;

        devvitLogger.log('[Devvit] Set currentPostId from captured initialData', { postId });
      }

      // Clear the captured data
      delete (window as any).__capturedInitialData;
    }

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

// Control panel removed - now handled in reddit context

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
    getNextUnclearedMission: storage.getNextUnclearedMission,
    getUnclearedMissions: storage.getUnclearedMissions,
    markCleared: storage.markMissionCleared,
  },
};

devvitLogger.log('Bot functions available in console via window.ssBot');

/**
 * Game script - Runs inside the game iframe (*.devvit.net)
 * This is where we interact with the actual Sword & Supper game
 */

import {
  GameInstanceAutomationEngine,
  DEFAULT_GIAE_CONFIG,
  GameInstanceAutomationConfig,
} from '../../automation/gameInstanceAutomation';
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

let gameAutomation: GameInstanceAutomationEngine | null = null;

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

// ============================================================================
// Extension Context Error Handling
// ============================================================================

/**
 * Safely send message to background script with proper error handling
 */
function safeSendMessage(message: any, callback?: (response: any) => void): void {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = String(chrome.runtime.lastError.message || chrome.runtime.lastError);
        if (errorMsg.includes('Extension context invalidated')) {
          devvitLogger.log('[ExtensionContext] Extension was updated/reloaded', {
            error: errorMsg,
          });
          // Game iframe - no UI to show notification, just log
        } else {
          devvitLogger.error('[ExtensionContext] Runtime error', { error: errorMsg });
        }
        return;
      }
      if (callback) {
        callback(response);
      }
    });
  } catch (error) {
    const errorMsg = String(error);
    if (errorMsg.includes('Extension context invalidated')) {
      devvitLogger.log('[ExtensionContext] Extension was updated/reloaded', { error: errorMsg });
    } else {
      devvitLogger.error('[ExtensionContext] Runtime error', { error: errorMsg });
    }
  }
}

// Control panel removed - now using BotControlPanel in reddit context

/**
 * Initialize automation engine
 */
function initializeAutomation(): void {
  if (gameAutomation) {
    devvitLogger.warn('Automation already initialized');
    return;
  }

  devvitLogger.log('Initializing game instance automation engine');

  // Load config from storage
  chrome.storage.local.get(['automationConfig'], async (result) => {
    const config = result.automationConfig || {};

    // Initialize game instance automation engine
    const giaeConfig: GameInstanceAutomationConfig = {
      enabled: false, // Will be enabled when user clicks button
      abilityTierList: config.abilityTierList || DEFAULT_GIAE_CONFIG.abilityTierList,
      blessingStatPriority: config.blessingStatPriority || DEFAULT_GIAE_CONFIG.blessingStatPriority,
      autoAcceptSkillBargains: config.autoAcceptSkillBargains !== undefined
        ? config.autoAcceptSkillBargains
        : DEFAULT_GIAE_CONFIG.autoAcceptSkillBargains,
      skillBargainStrategy: config.skillBargainStrategy || DEFAULT_GIAE_CONFIG.skillBargainStrategy,
      crossroadsStrategy: config.crossroadsStrategy || DEFAULT_GIAE_CONFIG.crossroadsStrategy,
      clickDelay: 1000,
    };

    gameAutomation = new GameInstanceAutomationEngine(giaeConfig);

    devvitLogger.log('Game instance automation engine initialized');
    devvitLogger.log('Config', { config: giaeConfig });

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

      if (missionMetadata && postId && gameAutomation) {
        // Save the captured mission data to database
        await gameAutomation.saveMissionToDatabase(postId, username, missionMetadata);

        // IMPORTANT: Also set currentPostId so it's available when mission completes
        // This is normally set by the message listener, but since we captured it early, we need to set it manually
        (gameAutomation as any).currentPostId = postId;
        (gameAutomation as any).missionMetadata = missionMetadata;

        devvitLogger.log('[Devvit] Set currentPostId from captured initialData', { postId });
      }

      // Clear the captured data
      delete (window as any).__capturedInitialData;
    }

    // Notify background script that automation is ready
    safeSendMessage({
      type: 'AUTOMATION_READY',
      config: giaeConfig,
    });

    // Process any pending START_MISSION_AUTOMATION message
    if (pendingStartMessage) {
      devvitLogger.log('Processing queued START_MISSION_AUTOMATION message');
      if (pendingStartMessage.config) {
        updateAutomationConfig(pendingStartMessage.config);
      }
      toggleAutomation(true);
      pendingStartMessage = null;
    }
  });
}

/**
 * Toggle automation on/off
 */
function toggleAutomation(enabled: boolean): void {
  devvitLogger.log('toggleAutomation called', { enabled });
  if (!gameAutomation) {
    devvitLogger.error('Automation not initialized');
    return;
  }

  if (enabled) {
    gameAutomation.start();
    devvitLogger.log('Automation started');
  } else {
    gameAutomation.stop();
    devvitLogger.log('Automation stopped');
  }

  devvitLogger.log('Automation state', { state: gameAutomation.getState() });
}

/**
 * Update automation configuration
 */
function updateAutomationConfig(config: any): void {
  if (!gameAutomation) {
    devvitLogger.error('Automation not initialized');
    return;
  }

  const giaeConfig: Partial<GameInstanceAutomationConfig> = {
    abilityTierList: config.abilityTierList,
    blessingStatPriority: config.blessingStatPriority,
    autoAcceptSkillBargains: config.autoAcceptSkillBargains,
    skillBargainStrategy: config.skillBargainStrategy,
    crossroadsStrategy: config.crossroadsStrategy,
  };

  gameAutomation.updateConfig(giaeConfig);

  // Save to storage
  chrome.storage.local.set({ automationConfig: config });
}

/**
 * Get automation state
 */
function getAutomationState(): any {
  if (!gameAutomation) {
    return { error: 'Automation not initialized' };
  }
  return gameAutomation.getState();
}

// Queue for messages received before automation is ready
let pendingStartMessage: any = null;

// Listen for messages from Chrome extension (via background script)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  devvitLogger.log('Received Chrome message', { type: message.type });

  switch (message.type) {
    case 'START_MISSION_AUTOMATION':
      if (!gameAutomation) {
        // Automation not ready yet, queue the message
        devvitLogger.log('Automation not ready, queuing START_MISSION_AUTOMATION');
        pendingStartMessage = message;
        sendResponse({ success: true, queued: true });
      } else {
        if (message.config) {
          updateAutomationConfig(message.config);
        }
        toggleAutomation(true);
        sendResponse({ success: true });
      }
      break;

    case 'STOP_MISSION_AUTOMATION':
      toggleAutomation(false);
      sendResponse({ success: true });
      break;

    case 'STATE_CHANGED':
      // Ignore state changes - only reddit-content needs these
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
  getAutomationState: () => gameAutomation?.getState(),
  getMetadata: () => gameAutomation?.getState(),
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

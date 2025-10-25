/**
 * Debug utilities for console testing
 */

import { redditLogger } from '../../../utils/logger';
import { getAllLevels, parseLevelFromPost, filterLevels } from './reddit';
import { safeSendMessage } from './messaging';

/**
 * Initialize debug functions in window for console access
 */
export function initializeDebugFunctions(
  currentBotState: string,
  currentBotContext: any,
  renderControlPanel: () => void
): void {
  (window as any).autoSupperDebug = {
    getAllLevels,
    parseLevelFromPost,
    filterLevels,
    getState: () => ({ state: currentBotState, context: currentBotContext }),
    sendEvent: (event: any) => safeSendMessage(event),
    renderControlPanel,
    testSelectors: () => {
      redditLogger.log("Testing selectors");
      const selectors = [
        '[data-testid="post-container"]',
        "shreddit-post",
        '[data-click-id="background"]',
        "article",
        '[id^="t3_"]',
      ];
      selectors.forEach((sel) => {
        const found = document.querySelectorAll(sel);
        redditLogger.log(`Selector "${sel}"`, { count: found.length });
      });
    },
  };

  redditLogger.log("Debug functions available: window.autoSupperDebug");
}

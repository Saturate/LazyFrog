/**
 * React control panel management
 */

import React from "react";
import { createRoot, Root } from "react-dom/client";
import BotControlPanel from "../../../components/BotControlPanel";
import { redditLogger } from "../../../utils/logger";
import { safeSendMessage } from "../utils/messaging";
import { getStatusText } from "./statusText";
import { isOnSwordAndSupperSubreddit } from "../utils/subreddit";

let root: Root | null = null;

/**
 * Render the React control panel
 * Uses state received from background via STATE_CHANGED messages
 */
export function renderControlPanel(
  currentBotState: string,
  currentBotContext: any
): void {
  // Check if we should show the panel on this subreddit
  const shouldShow = isOnSwordAndSupperSubreddit();

  // Use state received from background
  const isRunning = !["idle", "error"].includes(currentBotState);
  const status = getStatusText(currentBotState, currentBotContext);

  // Get or create container
  let container = document.getElementById("ss-bot-react-root");

  if (!container) {
    // Create new container only if it doesn't exist
    container = document.createElement("div");
    container.id = "ss-bot-react-root";
    container.setAttribute("data-lazyfrog-panel", "true");
    document.body.appendChild(container);

    // Create root only once
    root = createRoot(container);
    redditLogger.log("[ControlPanel] Created new root");
  }

  // Render (updates existing root if already created)
  if (root) {
    root.render(
      <BotControlPanel
        isRunning={isRunning}
        status={status}
        shouldShow={shouldShow}
        onStart={() => {
          redditLogger.log("[ControlPanel] Start button clicked");

          safeSendMessage({
            type: "START_BOT",
          });
        }}
        onStop={() => {
          redditLogger.log("[ControlPanel] Stop button clicked");
          safeSendMessage({ type: "STOP_BOT" });
        }}
        onOpenSettings={() => {
          redditLogger.log("[ControlPanel] Opening settings");
          // Open the popup page (which has filter settings) in a new tab
          chrome.tabs.create({
            url: chrome.runtime.getURL("popup.html"),
          });
        }}
      />
    );
  }
}

/**
 * Unmount the React control panel
 */
export function unmountControlPanel(): void {
  const container = document.getElementById("ss-bot-react-root");
  if (container && root) {
    root.unmount();
    container.remove();
    root = null;
  }
}

/**
 * Initialize control panel when DOM is ready
 */
export function initializeControlPanel(
  currentBotState: string,
  currentBotContext: any
): void {
  redditLogger.log("Initializing control panel");
  renderControlPanel(currentBotState, currentBotContext);
}

/**
 * React control panel management
 */

import React from "react";
import { createRoot, Root } from "react-dom/client";
import BotControlPanel from "../../../components/BotControlPanel";
import { redditLogger } from "../../../utils/logger";
import { safeSendMessage } from "../utils/messaging";
import { getStatusText } from "./statusText";

let root: Root | null = null;

/**
 * Render the React control panel
 * Uses state received from background via STATE_CHANGED messages
 */
export function renderControlPanel(
  currentBotState: string,
  currentBotContext: any
): void {
  // Use state received from background
  const isRunning = !["idle", "error"].includes(currentBotState);
  const status = getStatusText(currentBotState, currentBotContext);

  // Remove existing container if any
  let container = document.getElementById("ss-bot-react-root");
  if (container) {
    container.remove();
  }

  // Create new container
  container = document.createElement("div");
  container.id = "ss-bot-react-root";
  document.body.appendChild(container);

  // Create root and render
  root = createRoot(container);
  root.render(
    <BotControlPanel
      isRunning={isRunning}
      status={status}
      onStart={() => {
        redditLogger.log("[ControlPanel] Start button clicked");

        // Get filters and send START_BOT to background
        chrome.storage.local.get(["filters"], (result) => {
          const filters = result.filters || {
            stars: [1, 2],
            minLevel: 1,
            maxLevel: 340,
          };

          safeSendMessage({
            type: "START_BOT",
            filters,
          });
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

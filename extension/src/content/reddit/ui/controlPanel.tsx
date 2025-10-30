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
  // Only show control panel on Sword & Supper subreddits
  if (!isOnSwordAndSupperSubreddit()) {
    redditLogger.log("[ControlPanel] Not on Sword & Supper subreddit, skipping render");
    unmountControlPanel(); // Remove panel if it exists from previous navigation
    return;
  }

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
  // Check subreddit before initializing
  if (!isOnSwordAndSupperSubreddit()) {
    redditLogger.log("Not on Sword & Supper subreddit, skipping control panel initialization");
    return;
  }

  redditLogger.log("Initializing control panel on Sword & Supper subreddit");
  renderControlPanel(currentBotState, currentBotContext);
}

/**
 * Game UI interaction - clicking and shadow DOM navigation
 */

import { redditLogger } from '../../../utils/logger';
import { safeSendMessage } from '../utils/messaging';

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeout: number = 5000,
  rootElement: Element | Document = document
): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    const existingElement = rootElement.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    // Set up MutationObserver
    const observer = new MutationObserver(() => {
      const element = rootElement.querySelector(selector);
      if (element) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(element);
      }
    });

    // Start observing
    const targetNode = rootElement === document ? document.body : rootElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    } else {
      clearTimeout(timeoutId);
      resolve(null);
    }
  });
}

/**
 * Click the game UI to open the mission dialog
 * Navigates deep into shadow DOM and handles fullscreen button clicking
 */
export async function clickGameUI(): Promise<boolean> {
  const loader = document.querySelector("shreddit-devvit-ui-loader");
  if (!loader) {
    redditLogger.warn("[clickGameUI] No loader found");
    chrome.runtime.sendMessage({
      type: "ERROR_OCCURRED",
      message: "Game loader not found",
    });
    return false;
  }

  // Wait for shadow DOM to render (retry up to 10 times with 500ms delay)
  let clickableContainer: Element | null | undefined = null;
  for (let i = 0; i < 10; i++) {
    // Navigate deep into shadow DOM to find clickable container
    const surface = loader.shadowRoot?.querySelector("devvit-surface");
    const renderer = surface?.shadowRoot?.querySelector(
      "devvit-blocks-renderer"
    );
    clickableContainer = renderer?.shadowRoot?.querySelector(".cursor-pointer");

    if (clickableContainer) {
      redditLogger.log("[clickGameUI] Found clickable container on attempt", {
        attempt: i + 1,
      });
      break;
    }

    redditLogger.log("[clickGameUI] Shadow DOM not ready, waiting...", {
      attempt: i + 1,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (clickableContainer) {
    redditLogger.log("[clickGameUI] Found clickable container, clicking");
    (clickableContainer as HTMLElement).click();

    // Wait for fullscreen controls to appear using MutationObserver
    const fullscreenControls = await waitForElement(
      "devvit-fullscreen-web-view-controls",
      3000
    );

    if (fullscreenControls) {
      redditLogger.log(
        "[clickGameUI] Fullscreen controls found, waiting for animation to complete"
      );

      // Wait for animation to complete (dialog slide-in, etc.)
      await new Promise((resolve) => setTimeout(resolve, 800));

      redditLogger.log(
        "[clickGameUI] Exploring shadow DOM for fullscreen button",
        {
          hasShadowRoot: !!fullscreenControls.shadowRoot,
        }
      );

      const sizeControls = fullscreenControls.shadowRoot?.querySelector(
        "devvit-web-view-preview-size-controls"
      );
      redditLogger.log("[clickGameUI] Size controls", {
        found: !!sizeControls,
        hasShadowRoot: !!sizeControls?.shadowRoot,
      });

      // Try multiple selectors for the fullscreen button
      let fullscreenButton = sizeControls?.shadowRoot?.querySelector(
        'button[aria-label="Toggle fullscreen web view"]'
      ) as HTMLElement;

      if (!fullscreenButton) {
        // Try without aria-label
        fullscreenButton = sizeControls?.shadowRoot?.querySelector(
          "button"
        ) as HTMLElement;
        redditLogger.log("[clickGameUI] Tried generic button selector", {
          found: !!fullscreenButton,
        });
      }

      if (!fullscreenButton) {
        // Try in fullscreenControls directly
        fullscreenButton = fullscreenControls.shadowRoot?.querySelector(
          "button"
        ) as HTMLElement;
        redditLogger.log("[clickGameUI] Tried button in fullscreenControls", {
          found: !!fullscreenButton,
        });
      }

      if (fullscreenButton) {
        redditLogger.log("[clickGameUI] Clicking fullscreen button");
        fullscreenButton.click();

        // Wait a bit for fullscreen to engage, then signal dialog opened
        await new Promise((resolve) => setTimeout(resolve, 500));
        safeSendMessage({ type: "GAME_DIALOG_OPENED" });
      } else {
        redditLogger.error(
          "[clickGameUI] Fullscreen button not found after trying all selectors",
          {
            fullscreenControlsHTML: fullscreenControls.innerHTML?.substring(
              0,
              200
            ),
            hasShadowRoot: !!fullscreenControls.shadowRoot,
            shadowRootHTML: fullscreenControls.shadowRoot?.innerHTML?.substring(
              0,
              200
            ),
          }
        );
        safeSendMessage({
          type: "ERROR_OCCURRED",
          message: "Fullscreen button not found",
        });
      }
    } else {
      redditLogger.warn("[clickGameUI] Fullscreen controls did not appear");
      safeSendMessage({
        type: "ERROR_OCCURRED",
        message: "Fullscreen controls not found",
      });
    }

    return true;
  }

  redditLogger.warn("[clickGameUI] Clickable container not found");
  chrome.runtime.sendMessage({
    type: "ERROR_OCCURRED",
    message: "Clickable container not found",
  });
  return false;
}

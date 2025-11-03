/**
 * Game UI interaction - clicking and shadow DOM navigation
 */

import { redditLogger } from '../../../utils/logger';
import { safeSendMessage } from '../utils/messaging';
import { querySelectorDeep } from 'query-selector-shadow-dom';

// Enable/disable fullscreen mode when clicking game UI
const ENABLE_FULLSCREEN = false;

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(
	selector: string,
	timeout: number = 5000,
	rootElement: Element | Document = document,
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

		// Start observing - ensure we have a valid Node
		const targetNode = rootElement === document ? document.body : (rootElement as Element);

		// Validate targetNode is a valid Node before observing
		if (targetNode && targetNode instanceof Node) {
			try {
				observer.observe(targetNode, {
					childList: true,
					subtree: true,
				});
			} catch (error) {
				redditLogger.error('[waitForElement] Failed to observe node', {
					error: String(error),
					selector,
					targetNodeType: targetNode ? (targetNode as any).constructor?.name : 'null',
				});
				clearTimeout(timeoutId);
				resolve(null);
			}
		} else {
			redditLogger.warn('[waitForElement] Invalid target node for observation', {
				selector,
				hasTargetNode: !!targetNode,
				targetNodeType: targetNode ? (targetNode as any).constructor?.name : 'null',
			});
			clearTimeout(timeoutId);
			resolve(null);
		}
	});
}

/**
 * Find the clickable game preview element in the shadow DOM
 * Uses querySelectorDeep to pierce through shadow roots automatically
 */
function findGamePreviewElement(): Element | null {
	// Try specific selectors in order of specificity
	// querySelectorDeep automatically searches through all shadow DOMs
	const specificDiv = querySelectorDeep('devvit-blocks-renderer div>div>div');
	if (specificDiv) return specificDiv;

	const cursorPointer = querySelectorDeep('devvit-blocks-renderer .cursor-pointer');
	if (cursorPointer) return cursorPointer;

	// Fallback: find renderer and get first child
	const renderer = querySelectorDeep('devvit-blocks-renderer');
	if (renderer?.shadowRoot?.firstElementChild) {
		return renderer.shadowRoot.firstElementChild;
	}

	return null;
}

/**
 * Wait for the game preview to render in the shadow DOM using polling
 */
function waitForGamePreview(timeoutMs: number = 35000): Promise<Element | null> {
	return new Promise((resolve) => {
		const startTime = Date.now();
		const pollInterval = 500; // Check every 500ms

		const checkForElement = () => {
			const element = findGamePreviewElement();
			if (element) {
				const elapsed = Date.now() - startTime;
				redditLogger.log('[clickGameUI] Game preview found', { elapsed });
				resolve(element);
				return;
			}

			// Check if timeout exceeded
			if (Date.now() - startTime >= timeoutMs) {
				redditLogger.warn('[clickGameUI] Timeout waiting for game preview');
				resolve(null);
				return;
			}

			// Keep polling
			setTimeout(checkForElement, pollInterval);
		};

		checkForElement();
	});
}

/**
 * Find the game dialog iframe inside shadow DOM
 * Uses querySelectorDeep to pierce through shadow roots automatically
 */
function findDialogIframe(): Element | null {
	// Search for devvit iframe anywhere in shadow DOMs
	// This is more robust than hardcoding the path
	const iframe = querySelectorDeep('iframe[src*="devvit.net"]');
	if (iframe) {
		redditLogger.log('[findDialogIframe] Found devvit iframe', {
			src: (iframe as HTMLIFrameElement).src?.substring(0, 60),
		});
		return iframe;
	}

	// Fallback: try to find any iframe inside devvit-blocks-web-view
	const webViewIframe = querySelectorDeep('devvit-blocks-web-view iframe');
	if (webViewIframe) {
		redditLogger.log('[findDialogIframe] Found iframe in devvit-blocks-web-view');
		return webViewIframe;
	}

	return null;
}

/**
 * Wait for the game dialog to open after clicking
 */
function waitForGameDialog(timeoutMs: number = 20000): Promise<boolean> {
	return new Promise((resolve) => {
		const startTime = Date.now();
		const pollInterval = 500; // Check every 500ms
		let fullscreenHandled = false;

		const checkForDialog = () => {
			const iframe = findDialogIframe();

			// Dialog opened successfully
			if (iframe) {
				// Handle fullscreen if enabled
				if (ENABLE_FULLSCREEN && !fullscreenHandled) {
					// Use querySelectorDeep to find fullscreen button
					const button =
						querySelectorDeep('button[aria-label="Toggle fullscreen web view"]') ||
						querySelectorDeep('devvit-web-view-preview-size-controls button');

					if (button) {
						redditLogger.log('[clickGameUI] Enabling fullscreen');
						(button as HTMLElement).click();
						fullscreenHandled = true;
					}
				}

				// Done if fullscreen not needed or already handled
				if (!ENABLE_FULLSCREEN || fullscreenHandled) {
					const elapsed = Date.now() - startTime;
					redditLogger.log('[clickGameUI] Dialog opened', { elapsed });
					resolve(true);
					return;
				}
			}

			// Check if timeout exceeded
			if (Date.now() - startTime >= timeoutMs) {
				if (iframe) {
					redditLogger.warn('[clickGameUI] Dialog opened but fullscreen timeout');
					resolve(true);
				} else {
					redditLogger.warn('[clickGameUI] Dialog did not open');
					chrome.runtime.sendMessage({
						type: 'ERROR_OCCURRED',
						message: 'Game dialog did not appear',
					});
					resolve(false);
				}
				return;
			}

			// Keep polling
			setTimeout(checkForDialog, pollInterval);
		};

		checkForDialog();
	});
}

/**
 * Click the game UI to open the mission dialog
 */
export async function clickGameUI(): Promise<boolean> {
	// Step 0: Check if game dialog is already open
	const existingIframe = findDialogIframe();
	if (existingIframe) {
		redditLogger.log('[clickGameUI] Game dialog already open, skipping preview click');
		safeSendMessage({ type: 'GAME_DIALOG_OPENED' });
		return true;
	}

	// Step 1: Wait for game preview to render
	const gamePreview = await waitForGamePreview();
	if (!gamePreview) {
		redditLogger.warn('[clickGameUI] Game preview not found after 35s timeout');
		return false;
	}

	// Step 2: Click the game preview
	redditLogger.log('[clickGameUI] Clicking game preview');
	(gamePreview as HTMLElement).click();

	// Step 3: Wait for dialog to open
	const success = await waitForGameDialog();
	if (success) {
		safeSendMessage({ type: 'GAME_DIALOG_OPENED' });
	}

	return success;
}

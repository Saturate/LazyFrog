/**
 * Safe messaging utilities for Reddit content script
 * Handles extension context errors gracefully
 */

import { redditLogger } from '../../../utils/logger';

/**
 * Safely send message to background script with proper error handling
 * Shows user-friendly message if extension context is invalidated
 */
export function safeSendMessage(message: any, callback?: (response: any) => void): void {
	try {
		chrome.runtime.sendMessage(message, (response) => {
			if (chrome.runtime.lastError) {
				handleExtensionContextError(chrome.runtime.lastError);
				return;
			}
			if (callback) {
				callback(response);
			}
		});
	} catch (error) {
		handleExtensionContextError(error);
	}
}

/**
 * Handle extension context invalidation with user-friendly message
 */
function handleExtensionContextError(error: any): void {
	const errorMsg = String(error.message || error);

	if (errorMsg.includes('Extension context invalidated')) {
		// Show user-friendly notification
		showExtensionReloadNotification();

		redditLogger.log('[ExtensionContext] Extension was updated/reloaded, page needs refresh', {
			error: errorMsg,
			url: window.location.href,
		});
	} else {
		redditLogger.error('[ExtensionContext] Runtime error', {
			error: errorMsg,
		});
	}
}

/**
 * Show notification to user that extension was updated
 */
function showExtensionReloadNotification(): void {
	// Remove any existing notification
	const existingNotification = document.getElementById('lazyfrog-reload-notification');
	if (existingNotification) {
		existingNotification.remove();
	}

	// Create notification banner
	const notification = document.createElement('div');
	notification.id = 'lazyfrog-reload-notification';
	notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;

	notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">🔄 LazyFrog Extension Updated</div>
        <div style="font-size: 14px; opacity: 0.95; margin-bottom: 12px;">The extension was updated or reloaded. Please refresh this page.</div>
        <button id="lazyfrog-reload-btn" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: transform 0.1s;
        ">Reload Page Now</button>
      </div>
      <button id="lazyfrog-close-notification" style="
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        opacity: 0.8;
        transition: opacity 0.2s;
      ">×</button>
    </div>
  `;

	// Add animation keyframes
	const style = document.createElement('style');
	style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
    #lazyfrog-reload-btn:hover {
      transform: scale(1.05);
      opacity: 1;
    }
  `;
	document.head.appendChild(style);

	document.body.appendChild(notification);

	// Add event listeners
	const reloadBtn = document.getElementById('lazyfrog-reload-btn');
	const closeBtn = document.getElementById('lazyfrog-close-notification');

	if (reloadBtn) {
		reloadBtn.addEventListener('click', () => {
			window.location.reload();
		});
	}

	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			notification.remove();
		});
	}

	// Auto-dismiss after 30 seconds
	setTimeout(() => {
		if (notification.parentElement) {
			notification.style.animation = 'slideOut 0.3s ease-in';
			setTimeout(() => notification.remove(), 300);
		}
	}, 30000);
}

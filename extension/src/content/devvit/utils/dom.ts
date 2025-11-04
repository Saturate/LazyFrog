/**
 * Game DOM utility functions
 * Functions for analyzing, extracting state, and interacting with the game DOM
 */

/**
 * Click a button by text content
 */
export function clickButton(buttonText: string): boolean {
	const buttons = Array.from(document.querySelectorAll('button'));
	const targetButton = buttons.find((btn) =>
		btn.textContent?.trim().toLowerCase().includes(buttonText.toLowerCase()),
	);

	if (targetButton) {
		console.log('[DEVVIT] 🖱️ Clicking button:', buttonText);
		targetButton.click();
		return true;
	} else {
		console.log('[DEVVIT] ❌ Button not found:', buttonText);
		return false;
	}
}

/**
 * Get all clickable elements
 */
export function getClickableElements(): Element[] {
	const clickable: Element[] = [];

	// Buttons
	clickable.push(...Array.from(document.querySelectorAll('button')));

	// Links
	clickable.push(...Array.from(document.querySelectorAll('a')));

	// Elements with click handlers
	clickable.push(...Array.from(document.querySelectorAll('[onclick]')));

	return clickable;
}

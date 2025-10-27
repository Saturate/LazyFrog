/**
 * DOM-related utility functions for missions
 */

/**
 * Check if mission is cleared by looking for cleared indicators in the DOM
 * Returns the cleared image element if found, null otherwise
 */
export function checkMissionClearedInDOM(): HTMLImageElement | null {
	// Check for cleared image (the cleared/done banner)
	// This image appears when a mission has been cleared
	const clearedImages = Array.from(
		document.querySelectorAll('img[src*="fxlui9egtgbf1.png"]'),
	) as HTMLImageElement[];
	return clearedImages.length > 0 ? clearedImages[0] : null;
}

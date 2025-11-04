/**
 * Devvit Content Script Entry Point for WXT
 * Runs in game iframe to handle automation
 */

export default defineContentScript({
	matches: ['https://*.devvit.net/*'],
	runAt: 'document_start',
	allFrames: true, // Run in all frames including iframes

	async main() {
		// Import the main devvit content script logic
		// This will execute all the top-level code in devvit.tsx
		await import('../src/content/devvit/devvit');
	},
});

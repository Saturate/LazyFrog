/**
 * Reddit Content Script Entry Point for WXT
 * Injects React components and handles game interaction
 */

export default defineContentScript({
	matches: ['https://www.reddit.com/*'],
	runAt: 'document_start',

	async main() {
		// Inject unlisted scripts into page context
		const fetchInterceptorUrl = browser.runtime.getURL('fetchInterceptor.js');
		const missionDataFetcherUrl = browser.runtime.getURL('missionDataFetcher.js');

		const scriptFetch = document.createElement('script');
		scriptFetch.src = fetchInterceptorUrl;
		scriptFetch.type = 'text/javascript';
		(document.head || document.documentElement).appendChild(scriptFetch);

		const scriptMission = document.createElement('script');
		scriptMission.src = missionDataFetcherUrl;
		scriptMission.type = 'text/javascript';
		(document.head || document.documentElement).appendChild(scriptMission);

		// Import the main reddit content script logic
		// This will execute all the top-level code in reddit.tsx
		await import('../src/content/reddit/reddit');
	},
});

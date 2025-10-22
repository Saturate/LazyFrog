/**
 * Mission Data Handler for Reddit Devvit RenderPostContent
 * Handles raw mission data from fetch interceptor and parses it using utilities
 */

import { redditLogger } from '../../../utils/logger';
import { saveMission, MissionRecord } from '../../../utils/storage';
import { parseMissionData, MissionData } from '../../../utils/parseMissionData';

/**
 * Save mission data from API response
 */
async function saveMissionFromAPI(data: MissionData): Promise<void> {
	if (!data.difficulty || data.difficulty === 0) {
		return;
	}

	try {
		// Check if mission already exists
		const { getMission } = await import('../../../utils/storage');
		const existingMission = await getMission(data.postId);

		const record: MissionRecord = {
			postId: data.postId,
			username: existingMission?.username || data.authorName || 'unknown',
			timestamp: existingMission?.timestamp || Date.now(),
			metadata: existingMission?.metadata || null,
			tags: existingMission?.tags,
			difficulty: data.difficulty,
			environment: data.environment,
			minLevel: data.minLevel,
			maxLevel: data.maxLevel,
			foodName: data.foodName || data.title || 'Unknown Mission',
			permalink: (await import('../../../utils/url')).normalizeRedditPermalink(`t3_${data.postId}`),
			cleared: existingMission?.cleared || false,
			clearedAt: existingMission?.clearedAt,
		};

		await saveMission(record);

		redditLogger.log(`✅ Saved mission from API: ${data.postId}`, {
			name: data.foodName || data.title,
			difficulty: data.difficulty,
			levels: `${data.minLevel}-${data.maxLevel}`,
			fullData: data,
		});
	} catch (error) {
		redditLogger.error('❌ Failed to save mission from API', {
			error: error instanceof Error ? error.message : String(error),
			errorStack: error instanceof Error ? error.stack : undefined,
			postId: data.postId,
		});
	}
}

/**
 * Inject script into page context to intercept fetch calls
 * Content scripts run in isolated world, so we need to inject into the actual page
 */
function injectPageScript(): void {
	const scriptUrl = chrome.runtime.getURL('fetchInterceptor.js');
	redditLogger.log('🔧 Attempting to inject fetch interceptor', { scriptUrl });

	const script = document.createElement('script');
	script.src = scriptUrl;
	script.onload = () => {
		redditLogger.log('✅ Fetch interceptor script loaded successfully');
		script.remove();
	};
	script.onerror = (error) => {
		redditLogger.error('❌ Failed to load fetch interceptor script', { error: String(error) });
	};

	const target = document.head || document.documentElement;
	if (target) {
		target.appendChild(script);
		redditLogger.log('📝 Script tag appended to DOM', { targetTag: target.tagName });
	} else {
		redditLogger.error('❌ No document.head or documentElement available for injection');
	}
}

/**
 * Install mission data handler to capture and process RenderPostContent requests
 * This sets up both the injected script AND event listener in content script
 */
export function installMissionDataHandler(): void {
	// Inject script into page context
	injectPageScript();

	// Listen for raw mission data events from the injected script
	window.addEventListener('autosupper:raw-mission-data', async (event: Event) => {
		const customEvent = event as CustomEvent;
		const { postId, arrayBuffer } = customEvent.detail;

		if (postId && arrayBuffer) {
			// Use our utility to parse the mission data
			const data = parseMissionData(arrayBuffer, postId);
			if (data && data.difficulty) {
				await saveMissionFromAPI(data);
			}
		}
	});

	redditLogger.log('Mission data handler installed - listening for raw mission data events');
}


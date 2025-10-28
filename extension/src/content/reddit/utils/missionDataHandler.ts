/**
 * Mission Data Handler for Reddit Devvit RenderPostContent
 * Handles raw mission data from fetch interceptor and parses it using utilities
 */

import { redditLogger } from '../../../utils/logger';
import { saveMission } from '../../../lib/storage/missions';
import { MissionRecord } from '../../../lib/storage/types';
import { parseMissionData, MissionData } from '../../../utils/parseMissionData';
import { fetchLevelFromRedditAPI } from '../../../utils/redditAPI';

/**
 * Save mission data from API response
 */
async function saveMissionFromAPI(data: MissionData): Promise<void> {
	// Normalize postId by stripping t3_ prefix to ensure consistency with imported missions
	// The devvit-post header may include the t3_ prefix, but we store missions without it
	const normalizedPostId = data.postId.startsWith('t3_') ? data.postId.slice(3) : data.postId;

	// Validate that we have all required data before saving
	if (!data.difficulty || data.difficulty === 0) {
		redditLogger.log('⚠️ Skipping mission: no difficulty data', { postId: normalizedPostId });
		return;
	}

	// Try to get levels from protobuf, fallback to Reddit JSON API if missing
	if (data.minLevel === undefined || data.maxLevel === undefined) {
		redditLogger.log('⚠️ Missing level data from protobuf, trying Reddit API fallback', {
			postId: normalizedPostId,
			difficulty: data.difficulty,
		});

		const levelData = await fetchLevelFromRedditAPI(normalizedPostId);
		if (levelData && levelData.minLevel !== undefined && levelData.maxLevel !== undefined) {
			data.minLevel = levelData.minLevel;
			data.maxLevel = levelData.maxLevel;
			redditLogger.log('✅ Retrieved levels from Reddit API', {
				postId: normalizedPostId,
				minLevel: data.minLevel,
				maxLevel: data.maxLevel,
			});
		} else {
			redditLogger.log('❌ Could not retrieve levels from Reddit API, skipping mission', {
				postId: normalizedPostId,
			});
			return;
		}
	}

	// Sanity check: maxLevel should be >= minLevel
	if (data.maxLevel < data.minLevel) {
		redditLogger.error('⚠️ Skipping mission: invalid level range', {
			postId: normalizedPostId,
			minLevel: data.minLevel,
			maxLevel: data.maxLevel,
		});
		return;
	}

	try {
		// Check if mission already exists using normalized postId
		const { getMission } = await import('../../../lib/storage/missions');
		const existingMission = await getMission(normalizedPostId);

		const record: MissionRecord = {
			postId: normalizedPostId,
			username: existingMission?.username || data.authorName || 'unknown',
			timestamp: existingMission?.timestamp || Date.now(),
			metadata: existingMission?.metadata || null,
			tags: existingMission?.tags,
			difficulty: data.difficulty,
			environment: data.environment,
			minLevel: data.minLevel,
			maxLevel: data.maxLevel,
			foodName: data.foodName || data.title || 'Unknown Mission',
			permalink: (await import('../../../utils/url')).normalizeRedditPermalink(normalizedPostId),
			cleared: existingMission?.cleared || false,
			clearedAt: existingMission?.clearedAt,
		};

		await saveMission(record);

		if (existingMission) {
			redditLogger.log(`✅ Updated existing mission from API: ${normalizedPostId}`, {
				name: data.foodName || data.title,
				difficulty: data.difficulty,
				levels: `${data.minLevel}-${data.maxLevel}`,
				hadMetadataBefore: !!existingMission.metadata,
			});
		} else {
			redditLogger.log(`✅ Saved new mission from API: ${normalizedPostId}`, {
				name: data.foodName || data.title,
				difficulty: data.difficulty,
				levels: `${data.minLevel}-${data.maxLevel}`,
			});
		}
	} catch (error) {
		redditLogger.error('❌ Failed to save mission from API', {
			error: error instanceof Error ? error.message : String(error),
			errorStack: error instanceof Error ? error.stack : undefined,
			postId: normalizedPostId,
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


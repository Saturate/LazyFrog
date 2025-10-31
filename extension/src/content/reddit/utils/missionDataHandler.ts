/**
 * Mission Data Handler for Reddit Devvit RenderPostContent
 * Handles raw mission data from fetch interceptor and parses it using utilities
 */

import { redditLogger } from '../../../utils/logger';
import { saveMission } from '../../../lib/storage/missions';
import { parseMissionData, MissionData } from '../../../utils/parseMissionData';
import { safeSendMessage } from './messaging';
import { convertMissionDataToRecord, isCompleteMissionData } from '../../../utils/missionDataConverter';

/**
 * Save mission data from API response
 */
async function saveMissionFromAPI(data: MissionData): Promise<void> {
	// First check if we have complete mission data from the protobuf
	if (isCompleteMissionData(data)) {
		const record = convertMissionDataToRecord(data);
		if (record) {
			try {
				// Check if mission already exists to preserve timestamp
				const { getMission } = await import('../../../lib/storage/missions');
				const existingMission = await getMission(data.postId);
				if (existingMission?.timestamp) {
					record.timestamp = existingMission.timestamp;
				}

				await saveMission(record);
				redditLogger.log(`Saved complete mission from RenderPostContent: ${data.postId}`, {
					name: data.foodName,
					difficulty: data.difficulty,
					levels: `${data.minLevel}-${data.maxLevel}`,
					encounters: data.encounters?.length || 0,
				});
				return;
			} catch (error) {
				redditLogger.error('Failed to save complete mission from RenderPostContent', {
					error: error instanceof Error ? error.message : String(error),
					postId: data.postId,
				});
				// Fall through to legacy save method
			}
		}
	}

	// If we reach here, we don't have complete data
	// Log what we're missing for debugging
	const missing: string[] = [];
	if (!data.difficulty) missing.push('difficulty');
	if (!data.minLevel) missing.push('minLevel');
	if (!data.maxLevel) missing.push('maxLevel');
	if (!data.environment) missing.push('environment');
	if (!data.foodName) missing.push('foodName');
	if (!data.encounters || data.encounters.length === 0) missing.push('encounters');

	redditLogger.warn('Incomplete mission data from RenderPostContent - cannot save', {
		postId: data.postId,
		missingFields: missing,
		hasData: {
			difficulty: !!data.difficulty,
			levels: !!(data.minLevel && data.maxLevel),
			environment: !!data.environment,
			foodName: !!data.foodName,
			encounters: data.encounters?.length || 0,
		},
	});
}

/**
 * Inject script into page context to intercept fetch calls
 * Content scripts run in isolated world, so we need to inject into the actual page
 */
function injectPageScript(): void {
	const scriptUrl = chrome.runtime.getURL('fetchInterceptor.js');
	redditLogger.log('Attempting to inject fetch interceptor', { scriptUrl });

	const script = document.createElement('script');
	script.src = scriptUrl;
	script.onload = () => {
		redditLogger.log('Fetch interceptor script loaded successfully');
		script.remove();
	};
	script.onerror = (error) => {
		redditLogger.error('Failed to load fetch interceptor script', { error: String(error) });
	};

	const target = document.head || document.documentElement;
	if (target) {
		target.appendChild(script);
		redditLogger.log('Script tag appended to DOM', { targetTag: target.tagName });
	} else {
		redditLogger.error('No document.head or documentElement available for injection');
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
			if (data) {
				// Save to database if it has mission data
				if (data.difficulty) {
					await saveMissionFromAPI(data);
				}

				// Check for mission completion
				if (data.isInnPost === true) {
					redditLogger.log(
						'[missionDataHandler] Mission completion detected from PostRenderContent',
						{
							postId: data.postId,
						},
					);

					await handleMissionCompletionFromData(data.postId);
				}
			}
		}
	});

	redditLogger.log('Mission data handler installed - listening for raw mission data events');
}

/**
 * Handle mission completion from PostRenderContent data
 */
async function handleMissionCompletionFromData(postId: string): Promise<void> {
	redditLogger.log('[missionDataHandler] Handling mission completion', {
		postId,
	});

	// Notify background script - it will handle marking as cleared
	safeSendMessage({
		type: 'MISSION_COMPLETED',
		postId,
		source: 'postrendercontent-data',
	});
}

/**
 * API Interception for Reddit Devvit RenderPostContent
 * Intercepts gRPC-Web requests to get mission data directly from API
 */

import { redditLogger } from '../../../utils/logger';
import { saveMission, MissionRecord } from '../../../utils/storage';

interface MissionData {
  postId: string;
  difficulty?: number; // Star rating (1-5)
  minLevel?: number;
  maxLevel?: number;
  environment?: string;
  foodName?: string;
  foodImage?: string;
  authorName?: string;
  title?: string;
}

/**
 * Parse protobuf response to extract mission data
 * Protocol buffers use varint encoding, this is a simplified parser
 */
function parseMissionData(arrayBuffer: ArrayBuffer, postId: string): MissionData | null {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);

    const data: MissionData = { postId };

    // Extract difficulty (appears after "difficulty" string followed by encoded double)
    const difficultyMatch = text.match(/difficulty[\x00-\x1f]*?([\x00-\x05])/);
    if (difficultyMatch) {
      // The byte after "difficulty" marker contains the star count (1-5)
      const difficultyByte = difficultyMatch[1].charCodeAt(0);
      // In the protobuf, 0x40 = 2.0 (2 stars), it's IEEE 754 double
      // For now, we'll extract it from the raw bytes around "difficulty"
      const diffIndex = text.indexOf('difficulty');
      if (diffIndex >= 0 && diffIndex + 15 < text.length) {
        // difficulty field is followed by varint tag, then 8-byte double
        const dataView = new DataView(arrayBuffer, diffIndex + 12, 8);
        const difficultyValue = dataView.getFloat64(0, true); // little-endian
        data.difficulty = Math.round(difficultyValue);
      }
    }

    // Extract minLevel
    const minLevelMatch = text.match(/minLevel[\x00-\x1f]*([\x00-\xff]{8})/);
    if (minLevelMatch) {
      const minIndex = text.indexOf('minLevel');
      if (minIndex >= 0) {
        const dataView = new DataView(arrayBuffer, minIndex + 10, 8);
        data.minLevel = Math.round(dataView.getFloat64(0, true));
      }
    }

    // Extract maxLevel
    const maxLevelMatch = text.match(/maxLevel[\x00-\x1f]*([\x00-\xff]{8})/);
    if (maxLevelMatch) {
      const maxIndex = text.indexOf('maxLevel');
      if (maxIndex >= 0) {
        const dataView = new DataView(arrayBuffer, maxIndex + 10, 8);
        data.maxLevel = Math.round(dataView.getFloat64(0, true));
      }
    }

    // Extract environment (e.g., "mossy_forest")
    const envMatch = text.match(/environment[\x00-\x1f]*([a-z_]+)/);
    if (envMatch) {
      data.environment = envMatch[1];
    }

    // Extract foodName (e.g., "Smoked Kielbasa")
    const foodNameMatch = text.match(/foodName[\x00-\x1f]*([A-Za-z0-9 ]+)/);
    if (foodNameMatch) {
      data.foodName = foodNameMatch[1].trim();
    }

    // Extract authorName
    const authorMatch = text.match(/authorName[\x00-\x1f]*([a-zA-Z0-9_-]+)/);
    if (authorMatch) {
      data.authorName = authorMatch[1];
    }

    // Extract title
    const titleMatch = text.match(/title[\x00-\x1f]*([A-Za-z0-9 ]+)/);
    if (titleMatch) {
      data.title = titleMatch[1].trim();
    }

    redditLogger.log('Parsed mission data from API', {
      postId,
      difficulty: data.difficulty,
      minLevel: data.minLevel,
      maxLevel: data.maxLevel,
      foodName: data.foodName,
    });

    return data;
  } catch (error) {
    redditLogger.error('Failed to parse mission data', {
      error: error instanceof Error ? error.message : String(error),
      postId,
    });
    return null;
  }
}

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
      permalink: `https://www.reddit.com/comments/${data.postId}`,
      cleared: existingMission?.cleared || false,
      clearedAt: existingMission?.clearedAt,
    };

    await saveMission(record);

    redditLogger.log(`✅ Saved mission from API: ${data.postId}`, {
      name: data.foodName || data.title,
      difficulty: data.difficulty,
      levels: `${data.minLevel}-${data.maxLevel}`,
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
 * Install fetch interceptor to capture RenderPostContent requests
 * This sets up both the injected script AND event listener in content script
 */
export function installAPIInterceptor(): void {
  // Inject script into page context
  injectPageScript();

  // Listen for mission data events from the injected script
  window.addEventListener('autosupper:mission-data', async (event: Event) => {
    const customEvent = event as CustomEvent;
    const data = customEvent.detail;

    if (data && data.difficulty) {
      await saveMissionFromAPI(data);
    }
  });

  redditLogger.log('API interceptor installed - listening for mission data events');

  // Old isolated-world interceptor (doesn't work, keeping for reference)
  // Check if already installed
  if ((window.fetch as any).__autoSupperIntercepted) {
    return;
  }

  // Save original fetch
  const originalFetch = window.fetch;

  // Intercept fetch calls
  window.fetch = async function(...args: Parameters<typeof fetch>): Promise<Response> {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : resource.toString());

    // Debug: Log ALL fetch calls to see if interceptor is working
    if (url.includes('reddit.com') || url.includes('devvit')) {
      redditLogger.log('🔍 Fetch intercepted', { url: url.substring(0, 100) });
    }

    // Debug: Log ALL fetch calls to devvit-gateway
    if (url.includes('devvit-gateway.reddit.com')) {
      redditLogger.log('🔍 Devvit API call detected', { url: url.substring(0, 100) });
    }

    // Check if this is a RenderPostContent request
    if (url.includes('devvit.reddit.custom_post.v1alpha.CustomPost/RenderPostContent')) {
      redditLogger.log('✅ Intercepted RenderPostContent request', { url });

      // Extract postId from headers
      const headers = config?.headers as Record<string, string>;
      const postId = headers?.['devvit-post'];

      // Call original fetch
      const response = await originalFetch.apply(this, args);

      // Clone response so we can read it
      const clonedResponse = response.clone();

      // Parse response asynchronously
      if (postId) {
        clonedResponse.arrayBuffer().then(async (buffer) => {
          const data = parseMissionData(buffer, postId);
          if (data && data.difficulty) {
            await saveMissionFromAPI(data);
          }
        }).catch((err) => {
          redditLogger.error('Failed to parse API response', {
            error: err instanceof Error ? err.message : String(err),
            postId,
          });
        });
      }

      return response;
    }

    // For non-RenderPostContent requests, just pass through
    return originalFetch.apply(this, args);
  };

  // Mark as intercepted
  (window.fetch as any).__autoSupperIntercepted = true;

  redditLogger.log('API interceptor installed - monitoring RenderPostContent requests', {
    fetchType: typeof window.fetch,
    isNative: window.fetch.toString().includes('[native code]'),
  });
}

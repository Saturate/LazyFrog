/**
 * Fetch interceptor injected into page context (NOT content script)
 * This runs in the same context as Reddit's code, so it can intercept their fetch calls
 */

(function () {
  'use strict';

  console.log('[AutoSupper] Installing fetch interceptor in page context');

  // Save original fetch
  const originalFetch = window.fetch;

  // Track intercepted data to pass to content script
  const interceptedMissions = [];

  // Parse protobuf response to extract mission data
  function parseMissionData(arrayBuffer, postId) {
    try {
      const uint8Array = new Uint8Array(arrayBuffer);
      const text = new TextDecoder().decode(uint8Array);

      // Minimal logging in production
      console.log('[AutoSupper] Parsing response, size:', text.length);

      const data = { postId };

      // Extract difficulty (star rating) - try different offsets
      const diffIndex = text.indexOf('difficulty');

      if (diffIndex >= 0) {
        // Try multiple offsets to find the right one
        const offsets = [10, 11, 12, 13, 14, 15, 16, 17, 18];
        for (const offset of offsets) {
          if (diffIndex + offset + 8 <= arrayBuffer.byteLength) {
            try {
              const dataView = new DataView(arrayBuffer, diffIndex + offset, 8);
              const difficultyValue = dataView.getFloat64(0, true);
              // Valid difficulty should be 1-5
              if (difficultyValue >= 1 && difficultyValue <= 5) {
                data.difficulty = Math.round(difficultyValue);
                break;
              }
            } catch (e) {
              // Continue trying other offsets
            }
          }
        }
      }

      // Extract minLevel
      const minIndex = text.indexOf('minLevel');
      if (minIndex >= 0 && minIndex + 15 < text.length) {
        try {
          const dataView = new DataView(arrayBuffer, minIndex + 10, 8);
          data.minLevel = Math.round(dataView.getFloat64(0, true));
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Extract maxLevel
      const maxIndex = text.indexOf('maxLevel');
      if (maxIndex >= 0 && maxIndex + 15 < text.length) {
        try {
          const dataView = new DataView(arrayBuffer, maxIndex + 10, 8);
          data.maxLevel = Math.round(dataView.getFloat64(0, true));
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Extract environment
      const envMatch = text.match(/environment[\x00-\x1f]*([a-z_]+)/);
      if (envMatch) {
        data.environment = envMatch[1];
      }

      // Extract foodName
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

      console.log('[AutoSupper] Parsed mission data:', data);
      return data;
    } catch (error) {
      console.error('[AutoSupper] Failed to parse mission data:', error);
      return null;
    }
  }

  // Override fetch
  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : resource.toString());

    // Check if this is a RenderPostContent request
    if (url.includes('devvit.reddit.custom_post.v1alpha.CustomPost/RenderPostContent')) {
      console.log('[AutoSupper] ✅ Intercepted RenderPostContent:', url);

      // Extract postId from headers (can be in different formats)
      let headers = config?.headers || {};

      // If headers is a Headers object, convert to plain object
      if (headers instanceof Headers) {
        const plainHeaders = {};
        headers.forEach((value, key) => {
          plainHeaders[key] = value;
        });
        headers = plainHeaders;
      }

      const postId = headers['devvit-post'];
      console.log('[AutoSupper] Headers:', headers, postId);

      // Call original fetch
      const response = await originalFetch.apply(this, args);

      // Clone response to read it
      const clonedResponse = response.clone();

      // Parse response asynchronously
      if (postId) {
        clonedResponse.arrayBuffer().then((buffer) => {
          const data = parseMissionData(buffer, postId);

          if (data && data.difficulty) {
            // Dispatch custom event to content script
            window.dispatchEvent(new CustomEvent('autosupper:mission-data', {
              detail: data
            }));
            //console.log('[AutoSupper] ✅ Saved mission:', postId, `(${data.difficulty}★)`, data.foodName || 'Unknown');
          }
        }).catch((err) => {
          console.error('[AutoSupper] Failed to parse response:', err);
        });
      }

      return response;
    }

    // For other requests, just pass through
    return originalFetch.apply(this, args);
  };

  console.log('[AutoSupper] Fetch interceptor installed successfully');
})();

/**
 * Fetch interceptor injected into page context (NOT content script)
 * This runs in the same context as Reddit's code, so it can intercept their fetch calls
 */

(function () {
  'use strict';

  console.log('[LazyFrog] Installing fetch interceptor in page context');

  // Save original fetch
  const originalFetch = window.fetch;

  // Track intercepted data to pass to content script
  const interceptedMissions = [];

  // Override fetch
  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : resource.toString());

    // Check if this is a RenderPostContent request
    if (url.includes('CustomPost/RenderPostContent')) {
      //console.log('[LazyFrog] Intercepted RenderPostContent:', url);

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
      //console.log('[LazyFrog] Headers:', headers, postId);

      // Call original fetch
      const response = await originalFetch.apply(this, args);

      // Clone response to read it
      const clonedResponse = response.clone();

      // Pass raw response data to content script for parsing
      if (postId) {
        clonedResponse.arrayBuffer().then((buffer) => {
          // Dispatch raw data to content script - let it handle parsing
          window.dispatchEvent(new CustomEvent('autosupper:raw-mission-data', {
            detail: {
              postId: postId,
              arrayBuffer: buffer
            }
          }));
          //console.log('[LazyFrog] Passed raw mission data to content script:', postId);
        }).catch((err) => {
          console.error('[LazyFrog] Failed to get response buffer:', err);
        });
      }

      return response;
    }

    // For other requests, just pass through
    return originalFetch.apply(this, args);
  };

  console.log('[LazyFrog] Fetch interceptor installed successfully');
})();

/**
 * Mission Data Fetcher - Injected into page context
 * Fetches mission data from Reddit's Devvit gateway using protobuf
 * Runs in page context to avoid CORS issues and access Reddit's cookies
 *
 * NOTE: This script receives pre-built request bodies from the content script
 * which are created using @devvit/protos UIRequest.encode()
 */

(function () {
  'use strict';

  // Listen for fetch requests from content script
  window.addEventListener('autosupper:fetch-mission-request', async (event) => {
    const { postId, requestId, requestBody } = event.detail;

    try {
      // requestBody is already built properly by content script using @devvit/protos
      // Convert from array to Uint8Array if needed
      const body = requestBody instanceof Uint8Array
        ? requestBody
        : new Uint8Array(requestBody);

      // Make the fetch request to Reddit's Devvit gateway
      const response = await fetch(
        'https://devvit-gateway.reddit.com/devvit.reddit.custom_post.v1alpha.CustomPost/RenderPostContent',
        {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'accept': '*/*',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'content-type': 'application/grpc-web+proto',
            'devvit-accept-language': 'en-GB',
            'devvit-accept-timezone': 'Europe/Copenhagen',
            'devvit-actor': 'main',
            'devvit-installation': '7f2e80d7-6821-4a20-9405-05c3b43012ea',
            'devvit-post': postId,
            'devvit-user-agent': 'Reddit;Shreddit;not-provided',
            'x-grpc-web': '1',
          },
          referrer: 'https://www.reddit.com/',
          body: body,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get response as ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // Send response back to content script
      window.dispatchEvent(new CustomEvent('autosupper:fetch-mission-response', {
        detail: {
          requestId,
          postId,
          success: true,
          arrayBuffer,
        }
      }));

    } catch (error) {
      console.error('[LazyFrog] Fetch failed:', postId, error);

      // Send error back to content script
      window.dispatchEvent(new CustomEvent('autosupper:fetch-mission-response', {
        detail: {
          requestId,
          postId,
          success: false,
          error: error.message || String(error),
        }
      }));
    }
  });
})();

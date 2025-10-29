/**
 * Shared test utilities for storage tests
 */

import { vi } from 'vitest';

/**
 * Mock chrome storage for testing
 */
export function createMockChromeStorage() {
	const mockStorage = new Map();

	global.chrome = {
		storage: {
			local: {
				get: vi.fn((keys, callback) => {
					const result: Record<string, any> = {};
					const keyArray = Array.isArray(keys) ? keys : [keys];
					keyArray.forEach((key) => {
						if (mockStorage.has(key)) {
							result[key] = mockStorage.get(key);
						}
					});
					// Call callback asynchronously to simulate chrome.storage.local.get behavior
					setTimeout(() => {
						if (callback) {
							callback(result);
						}
					}, 0);
					return Promise.resolve(result);
				}),
				set: vi.fn((items, callback?) => {
					Object.entries(items).forEach(([key, value]) => {
						mockStorage.set(key, value);
					});
					setTimeout(() => {
						if (callback) {
							callback();
						}
					}, 0);
					return Promise.resolve();
				}),
				remove: vi.fn((keys, callback?) => {
					const keyArray = Array.isArray(keys) ? keys : [keys];
					keyArray.forEach((key) => mockStorage.delete(key));
					setTimeout(() => {
						if (callback) {
							callback();
						}
					}, 0);
					return Promise.resolve();
				}),
				getBytesInUse: vi.fn((keys, callback) => {
					// Simple mock - return 1000 bytes
					setTimeout(() => {
						if (callback) {
							callback(1000);
						}
					}, 0);
					return Promise.resolve(1000);
				}),
			},
		},
		runtime: {
			id: 'test-extension-id',
			lastError: null,
			sendMessage: vi.fn(() => Promise.resolve()),
		},
		tabs: {
			query: vi.fn((query, callback) => {
				// Return empty tabs array by default (no Reddit tabs open)
				setTimeout(() => {
					if (callback) {
						callback([]);
					}
				}, 0);
				return Promise.resolve([]);
			}),
			sendMessage: vi.fn((tabId, message, callback) => {
				setTimeout(() => {
					if (callback) {
						callback();
					}
				}, 0);
				return Promise.resolve();
			}),
		},
	} as any;

	return {
		mockStorage,
		clearStorage: () => mockStorage.clear(),
	};
}

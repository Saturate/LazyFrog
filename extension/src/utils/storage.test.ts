import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFilteredUnclearedMissions } from './storage';
import type { MissionRecord } from '../types';

// Mock chrome.storage API
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
				if (callback) {
					callback(result);
				}
				return Promise.resolve(result);
			}),
			set: vi.fn((items, callback?) => {
				Object.entries(items).forEach(([key, value]) => {
					mockStorage.set(key, value);
				});
				if (callback) {
					callback();
				}
				return Promise.resolve();
			}),
		},
	},
	runtime: {
		id: 'test-extension-id',
		lastError: null,
	},
} as any;

describe('Mission Level Filtering', () => {
	beforeEach(() => {
		mockStorage.clear();
	});

	it('should reject mission with range 1-100 when filter is 1-20', async () => {
		// Your level: 1-20, Mission range: 1-100
		// Should REJECT because mission goes up to level 100 (too hard)
		const missions: Record<string, MissionRecord> = {
			mission1: {
				postId: 'mission1',
				title: 'Test Mission',
				permalink: '/test',
				cleared: false,
				disabled: false,
				difficulty: 2,
				minLevel: 1,
				maxLevel: 100,
				timestamp: Date.now(),
			},
		};

		mockStorage.set('missions', missions);

		const filtered = await getFilteredUnclearedMissions({
			stars: [1, 2],
			minLevel: 1,
			maxLevel: 20,
		});

		expect(filtered).toHaveLength(0);
	});

	it('should reject mission with range 50-100 when filter is 1-20', async () => {
		// Your level: 1-20, Mission range: 50-100
		// Should REJECT because mission is too hard (starts at 50)
		const missions: Record<string, MissionRecord> = {
			mission1: {
				postId: 'mission1',
				title: 'Hard Mission',
				permalink: '/test',
				cleared: false,
				disabled: false,
				difficulty: 5,
				minLevel: 50,
				maxLevel: 100,
				timestamp: Date.now(),
			},
		};

		mockStorage.set('missions', missions);

		const filtered = await getFilteredUnclearedMissions({
			stars: [1, 2, 3, 4, 5],
			minLevel: 1,
			maxLevel: 20,
		});

		expect(filtered).toHaveLength(0);
	});

	it('should accept mission with range 1-15 when filter is 1-20', async () => {
		// Your level: 1-20, Mission range: 1-15
		// Should ACCEPT because entire mission range is within your level range
		const missions: Record<string, MissionRecord> = {
			mission1: {
				postId: 'mission1',
				title: 'Easy Mission',
				permalink: '/test',
				cleared: false,
				disabled: false,
				difficulty: 1,
				minLevel: 1,
				maxLevel: 15,
				timestamp: Date.now(),
			},
		};

		mockStorage.set('missions', missions);

		const filtered = await getFilteredUnclearedMissions({
			stars: [1, 2],
			minLevel: 1,
			maxLevel: 20,
		});

		expect(filtered).toHaveLength(1);
		expect(filtered[0].postId).toBe('mission1');
	});

	it('should reject mission with range 1-5 when filter is 10-20', async () => {
		// Your level: 10-20, Mission range: 1-5
		// Should REJECT because mission is too easy (ends at 5, you start at 10)
		const missions: Record<string, MissionRecord> = {
			mission1: {
				postId: 'mission1',
				title: 'Too Easy Mission',
				permalink: '/test',
				cleared: false,
				disabled: false,
				difficulty: 1,
				minLevel: 1,
				maxLevel: 5,
				timestamp: Date.now(),
			},
		};

		mockStorage.set('missions', missions);

		const filtered = await getFilteredUnclearedMissions({
			stars: [1, 2],
			minLevel: 10,
			maxLevel: 20,
		});

		expect(filtered).toHaveLength(0);
	});

	it('should filter by difficulty stars correctly', async () => {
		const missions: Record<string, MissionRecord> = {
			easy: {
				postId: 'easy',
				title: 'Easy Mission',
				permalink: '/easy',
				cleared: false,
				disabled: false,
				difficulty: 1,
				minLevel: 1,
				maxLevel: 20,
				timestamp: Date.now(),
			},
			hard: {
				postId: 'hard',
				title: 'Hard Mission',
				permalink: '/hard',
				cleared: false,
				disabled: false,
				difficulty: 5,
				minLevel: 1,
				maxLevel: 20,
				timestamp: Date.now(),
			},
		};

		mockStorage.set('missions', missions);

		// Only select 1-2 star missions
		const filtered = await getFilteredUnclearedMissions({
			stars: [1, 2],
			minLevel: 1,
			maxLevel: 20,
		});

		expect(filtered).toHaveLength(1);
		expect(filtered[0].postId).toBe('easy');
		expect(filtered[0].difficulty).toBe(1);
	});

	it('should filter out cleared and disabled missions', async () => {
		const missions: Record<string, MissionRecord> = {
			cleared: {
				postId: 'cleared',
				title: 'Cleared Mission',
				permalink: '/cleared',
				cleared: true,
				disabled: false,
				difficulty: 2,
				minLevel: 1,
				maxLevel: 20,
				timestamp: Date.now(),
			},
			disabled: {
				postId: 'disabled',
				title: 'Disabled Mission',
				permalink: '/disabled',
				cleared: false,
				disabled: true,
				difficulty: 2,
				minLevel: 1,
				maxLevel: 20,
				timestamp: Date.now(),
			},
			active: {
				postId: 'active',
				title: 'Active Mission',
				permalink: '/active',
				cleared: false,
				disabled: false,
				difficulty: 2,
				minLevel: 1,
				maxLevel: 20,
				timestamp: Date.now(),
			},
		};

		mockStorage.set('missions', missions);

		const filtered = await getFilteredUnclearedMissions({
			stars: [1, 2],
			minLevel: 1,
			maxLevel: 20,
		});

		expect(filtered).toHaveLength(1);
		expect(filtered[0].postId).toBe('active');
	});
});

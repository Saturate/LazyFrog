/**
 * Tests for mission query and filtering functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getFilteredUnclearedMissions } from '../missionQueries';
import type { MissionRecord } from '../types';
import { createMockChromeStorage } from './testUtils';

describe('Mission Query Functions', () => {
	let mockStorage: Map<string, any>;
	let clearStorage: () => void;

	beforeEach(() => {
		const mock = createMockChromeStorage();
		mockStorage = mock.mockStorage;
		clearStorage = mock.clearStorage;
		clearStorage();
	});

	describe('getFilteredUnclearedMissions - Level Filtering', () => {
		it('should reject mission with range 1-100 when filter is 1-20', async () => {
			// Your level: 1-20, Mission range: 1-100
			// Should REJECT because mission goes up to level 100 (too hard)
			const missions: Record<string, MissionRecord> = {
				mission1: {
					postId: 'mission1',
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Test Mission',
					permalink: '/test',
					cleared: false,
					disabled: false,
					difficulty: 2,
					minLevel: 1,
					maxLevel: 100,
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
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Hard Mission',
					permalink: '/test',
					cleared: false,
					disabled: false,
					difficulty: 5,
					minLevel: 50,
					maxLevel: 100,
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
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Easy Mission',
					permalink: '/test',
					cleared: false,
					disabled: false,
					difficulty: 1,
					minLevel: 1,
					maxLevel: 15,
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
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Too Easy Mission',
					permalink: '/test',
					cleared: false,
					disabled: false,
					difficulty: 1,
					minLevel: 1,
					maxLevel: 5,
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
	});

	describe('getFilteredUnclearedMissions - Star Filtering', () => {
		it('should filter by difficulty stars correctly', async () => {
			const missions: Record<string, MissionRecord> = {
				easy: {
					postId: 'easy',
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Easy Mission',
					permalink: '/easy',
					cleared: false,
					disabled: false,
					difficulty: 1,
					minLevel: 1,
					maxLevel: 20,
				},
				hard: {
					postId: 'hard',
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Hard Mission',
					permalink: '/hard',
					cleared: false,
					disabled: false,
					difficulty: 5,
					minLevel: 1,
					maxLevel: 20,
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
	});

	describe('getFilteredUnclearedMissions - Status Filtering', () => {
		it('should filter out cleared and disabled missions', async () => {
			const missions: Record<string, MissionRecord> = {
				cleared: {
					postId: 'cleared',
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Cleared Mission',
					permalink: '/cleared',
					cleared: true,
					disabled: false,
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
				disabled: {
					postId: 'disabled',
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Disabled Mission',
					permalink: '/disabled',
					cleared: false,
					disabled: true,
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
				active: {
					postId: 'active',
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Active Mission',
					permalink: '/active',
					cleared: false,
					disabled: false,
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
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

		it('should filter out missions without complete data', async () => {
			const missions: Record<string, MissionRecord> = {
				noDifficulty: {
					postId: 'noDifficulty',
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'No Difficulty',
					permalink: '/noDifficulty',
					cleared: false,
					disabled: false,
					difficulty: 0,
					minLevel: 1,
					maxLevel: 20,
				},
				noLevels: {
					postId: 'noLevels',
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'No Levels',
					permalink: '/noLevels',
					cleared: false,
					disabled: false,
					difficulty: 2,
				},
				complete: {
					postId: 'complete',
					username: 'testuser',
					timestamp: Date.now(),
					metadata: {},
					missionTitle: 'Complete Mission',
					permalink: '/complete',
					cleared: false,
					disabled: false,
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
			};

			mockStorage.set('missions', missions);

			const filtered = await getFilteredUnclearedMissions({
				stars: [1, 2],
				minLevel: 1,
				maxLevel: 20,
			});

			expect(filtered).toHaveLength(1);
			expect(filtered[0].postId).toBe('complete');
		});
	});

	describe('getFilteredUnclearedMissions - Sorting', () => {
		it('should return missions sorted by timestamp (newest first)', async () => {
			const now = Date.now();
			const missions: Record<string, MissionRecord> = {
				old: {
					postId: 'old',
					username: 'testuser',
					timestamp: now - 3000,
					metadata: {},
					cleared: false,
					disabled: false,
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
				newest: {
					postId: 'newest',
					username: 'testuser',
					timestamp: now,
					metadata: {},
					cleared: false,
					disabled: false,
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
				middle: {
					postId: 'middle',
					username: 'testuser',
					timestamp: now - 1000,
					metadata: {},
					cleared: false,
					disabled: false,
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
			};

			mockStorage.set('missions', missions);

			const filtered = await getFilteredUnclearedMissions({
				stars: [1, 2],
				minLevel: 1,
				maxLevel: 20,
			});

			expect(filtered).toHaveLength(3);
			expect(filtered[0].postId).toBe('newest');
			expect(filtered[1].postId).toBe('middle');
			expect(filtered[2].postId).toBe('old');
		});
	});
});

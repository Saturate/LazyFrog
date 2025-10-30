/**
 * Tests for mission query and filtering functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getFilteredUnclearedMissions } from '../missionQueries';
import type { MissionRecord, MissionMetadata } from '../types';
import { createMockChromeStorage } from './testUtils';

// Helper to create mock metadata
const createMockMetadata = (): MissionMetadata => ({
	mission: {
		environment: 'haunted_forest',
		encounters: [],
		minLevel: 1,
		maxLevel: 100,
		difficulty: 1,
		foodImage: '',
		foodName: 'Test Food',
		authorWeaponId: '',
		chef: '',
		cart: '',
		rarity: 'common',
	},
	missionAuthorName: 'testuser',
	missionTitle: 'Test Mission',
	enemyTauntData: [],
});

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
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					missionTitle: 'Test Mission',
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					permalink: '/test',
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
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'Hard Mission',
					permalink: '/test',
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
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'Easy Mission',
					permalink: '/test',
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
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'Too Easy Mission',
					permalink: '/test',
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
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'Easy Mission',
					permalink: '/easy',
					difficulty: 1,
					minLevel: 1,
					maxLevel: 20,
				},
				hard: {
					postId: 'hard',
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'Hard Mission',
					permalink: '/hard',
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
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'Cleared Mission',
					permalink: '/cleared',
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
				disabled: {
					postId: 'disabled',
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'Disabled Mission',
					permalink: '/disabled',
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
				active: {
					postId: 'active',
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'Active Mission',
					permalink: '/active',
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
			};

			// Set up user progress (new array-based format)
			const userProgress = {
				default: {
					cleared: ['cleared'],
					disabled: ['disabled'],
					clearedAt: {},
					loot: {},
				},
			};

			mockStorage.set('missions', missions);
			mockStorage.set('userProgress', userProgress);

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
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'No Difficulty',
					permalink: '/noDifficulty',
					difficulty: 0,
					minLevel: 1,
					maxLevel: 20,
				},
				noLevels: {
					postId: 'noLevels',
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'No Levels',
					permalink: '/noLevels',
					difficulty: 2,
					// Missing minLevel and maxLevel (optional fields)
				} as MissionRecord,
				complete: {
					postId: 'complete',
					timestamp: Date.now(),
					metadata: createMockMetadata(),
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					missionTitle: 'Complete Mission',
					permalink: '/complete',
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
					timestamp: now - 3000,
					permalink: 'https://reddit.com/r/test/comments/old',
					metadata: createMockMetadata(),
					missionTitle: 'Test Mission',
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
				newest: {
					postId: 'newest',
					timestamp: now,
					permalink: 'https://reddit.com/r/test/comments/newest',
					metadata: createMockMetadata(),
					missionTitle: 'Test Mission',
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
					difficulty: 2,
					minLevel: 1,
					maxLevel: 20,
				},
				middle: {
					postId: 'middle',
					timestamp: now - 1000,
					permalink: 'https://reddit.com/r/test/comments/middle',
					metadata: createMockMetadata(),
					missionTitle: 'Test Mission',
					foodName: 'Test Food',
					environment: 'haunted_forest',
					tags: '',
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

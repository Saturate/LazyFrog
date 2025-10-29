/**
 * Tests for migration from old object-based progress to new array-based progress
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { migrateToSeparateProgress, needsMigration } from './migrate';
import { createMockChromeStorage } from './__tests__/testUtils';

describe('Migration', () => {
	let mockStorage: Map<string, any>;
	let clearStorage: () => void;

	beforeEach(() => {
		const mock = createMockChromeStorage();
		mockStorage = mock.mockStorage;
		clearStorage = mock.clearStorage;
		clearStorage();
	});

	describe('migrateToSeparateProgress', () => {
		it('should convert cleared missions to array format', async () => {
			const oldMissions = {
				't3_abc123': {
					postId: 't3_abc123',
					missionTitle: 'Test Mission 1',
					minLevel: 1,
					maxLevel: 10,
					timestamp: 1000,
					cleared: true,
					clearedAt: 1234567890,
				},
				't3_def456': {
					postId: 't3_def456',
					missionTitle: 'Test Mission 2',
					minLevel: 5,
					maxLevel: 15,
					timestamp: 2000,
					cleared: false,
				},
			};

			mockStorage.set('missions', oldMissions);

			await migrateToSeparateProgress();

			const missions = mockStorage.get('missions');
			const userProgress = mockStorage.get('userProgress');

			// Check cleared array
			expect(userProgress.default.cleared).toEqual(['t3_abc123']);
			expect(userProgress.default.cleared).not.toContain('t3_def456');

			// Check clearedAt map
			expect(userProgress.default.clearedAt['t3_abc123']).toBe(1234567890);

			// Check cleaned missions don't have progress fields
			expect(missions['t3_abc123'].cleared).toBeUndefined();
			expect(missions['t3_abc123'].clearedAt).toBeUndefined();
			expect(missions['t3_abc123'].missionTitle).toBe('Test Mission 1');
		});

		it('should convert disabled missions to array format', async () => {
			const oldMissions = {
				't3_disabled1': {
					postId: 't3_disabled1',
					missionTitle: 'Disabled Mission',
					minLevel: 1,
					maxLevel: 10,
					timestamp: 1000,
					disabled: true,
				},
				't3_enabled': {
					postId: 't3_enabled',
					missionTitle: 'Enabled Mission',
					minLevel: 5,
					maxLevel: 15,
					timestamp: 2000,
					disabled: false,
				},
			};

			mockStorage.set('missions', oldMissions);

			await migrateToSeparateProgress();

			const missions = mockStorage.get('missions');
			const userProgress = mockStorage.get('userProgress');

			// Check disabled array
			expect(userProgress.default.disabled).toEqual(['t3_disabled1']);
			expect(userProgress.default.disabled).not.toContain('t3_enabled');

			// Check cleaned missions
			expect(missions['t3_disabled1'].disabled).toBeUndefined();
		});

		it('should migrate loot data to map format', async () => {
			const oldMissions = {
				't3_withloot': {
					postId: 't3_withloot',
					missionTitle: 'Mission with Loot',
					minLevel: 10,
					maxLevel: 20,
					timestamp: 1000,
					totalLoot: [
						{ id: 'gold', quantity: 100 },
						{ id: 'xp', quantity: 500 },
					],
				},
				't3_noloot': {
					postId: 't3_noloot',
					missionTitle: 'Mission without Loot',
					minLevel: 1,
					maxLevel: 5,
					timestamp: 2000,
				},
			};

			mockStorage.set('missions', oldMissions);

			await migrateToSeparateProgress();

			const missions = mockStorage.get('missions');
			const userProgress = mockStorage.get('userProgress');

			// Check loot map
			expect(userProgress.default.loot['t3_withloot']).toEqual([
				{ id: 'gold', quantity: 100 },
				{ id: 'xp', quantity: 500 },
			]);
			expect(userProgress.default.loot['t3_noloot']).toBeUndefined();

			// Check cleaned missions
			expect(missions['t3_withloot'].totalLoot).toBeUndefined();
		});

		it('should handle missions with multiple progress fields', async () => {
			const oldMissions = {
				't3_complete': {
					postId: 't3_complete',
					missionTitle: 'Complete Mission',
					minLevel: 20,
					maxLevel: 30,
					timestamp: 3000,
					cleared: true,
					clearedAt: 9876543210,
					disabled: false,
					totalLoot: [{ id: 'gem', quantity: 5 }],
				},
			};

			mockStorage.set('missions', oldMissions);

			await migrateToSeparateProgress();

			const missions = mockStorage.get('missions');
			const userProgress = mockStorage.get('userProgress');

			// Check all progress data
			expect(userProgress.default.cleared).toContain('t3_complete');
			expect(userProgress.default.clearedAt['t3_complete']).toBe(9876543210);
			expect(userProgress.default.loot['t3_complete']).toEqual([{ id: 'gem', quantity: 5 }]);

			// disabled is false, so shouldn't be in array
			expect(userProgress.default.disabled).not.toContain('t3_complete');

			// Check cleaned mission
			const cleaned = missions['t3_complete'];
			expect(cleaned.cleared).toBeUndefined();
			expect(cleaned.clearedAt).toBeUndefined();
			expect(cleaned.disabled).toBeUndefined();
			expect(cleaned.totalLoot).toBeUndefined();
			expect(cleaned.missionTitle).toBe('Complete Mission');
		});

		it('should handle missions with no progress data', async () => {
			const oldMissions = {
				't3_fresh': {
					postId: 't3_fresh',
					missionTitle: 'Fresh Mission',
					minLevel: 1,
					maxLevel: 5,
					timestamp: 1000,
					difficulty: 3,
					environment: 'haunted_forest',
				},
			};

			mockStorage.set('missions', oldMissions);

			await migrateToSeparateProgress();

			const missions = mockStorage.get('missions');
			const userProgress = mockStorage.get('userProgress');

			// Progress arrays should be empty
			expect(userProgress.default.cleared).toEqual([]);
			expect(userProgress.default.disabled).toEqual([]);
			expect(Object.keys(userProgress.default.clearedAt)).toEqual([]);
			expect(Object.keys(userProgress.default.loot)).toEqual([]);

			// Mission data should be preserved
			expect(missions['t3_fresh'].missionTitle).toBe('Fresh Mission');
			expect(missions['t3_fresh'].difficulty).toBe(3);
		});

		it('should handle empty missions object', async () => {
			const oldMissions = {};

			mockStorage.set('missions', oldMissions);

			await migrateToSeparateProgress();

			const missions = mockStorage.get('missions');
			const userProgress = mockStorage.get('userProgress');

			expect(userProgress.default.cleared).toEqual([]);
			expect(userProgress.default.disabled).toEqual([]);
			expect(Object.keys(userProgress.default.clearedAt)).toEqual([]);
			expect(Object.keys(userProgress.default.loot)).toEqual([]);
			expect(Object.keys(missions)).toEqual([]);
		});

		it('should handle batch migration with mixed progress states', async () => {
			const oldMissions = {
				't3_001': { postId: 't3_001', missionTitle: 'M1', minLevel: 1, maxLevel: 5, timestamp: 1000, cleared: true, clearedAt: 111 },
				't3_002': { postId: 't3_002', missionTitle: 'M2', minLevel: 2, maxLevel: 6, timestamp: 2000, cleared: false },
				't3_003': { postId: 't3_003', missionTitle: 'M3', minLevel: 3, maxLevel: 7, timestamp: 3000, disabled: true },
				't3_004': { postId: 't3_004', missionTitle: 'M4', minLevel: 4, maxLevel: 8, timestamp: 4000, cleared: true, clearedAt: 444, totalLoot: [{ id: 'coin', quantity: 10 }] },
				't3_005': { postId: 't3_005', missionTitle: 'M5', minLevel: 5, maxLevel: 9, timestamp: 5000 },
			};

			mockStorage.set('missions', oldMissions);

			await migrateToSeparateProgress();

			const missions = mockStorage.get('missions');
			const userProgress = mockStorage.get('userProgress');

			// Verify arrays contain correct entries
			expect(userProgress.default.cleared.sort()).toEqual(['t3_001', 't3_004'].sort());
			expect(userProgress.default.disabled).toEqual(['t3_003']);

			// Verify maps
			expect(userProgress.default.clearedAt['t3_001']).toBe(111);
			expect(userProgress.default.clearedAt['t3_004']).toBe(444);
			expect(userProgress.default.loot['t3_004']).toEqual([{ id: 'coin', quantity: 10 }]);

			// Verify all missions are cleaned
			Object.values(missions).forEach((mission: any) => {
				expect(mission.cleared).toBeUndefined();
				expect(mission.clearedAt).toBeUndefined();
				expect(mission.disabled).toBeUndefined();
				expect(mission.totalLoot).toBeUndefined();
				expect(mission.missionTitle).toBeDefined();
			});
		});
	});

	describe('needsMigration', () => {
		it('should return true when missions have progress fields', async () => {
			const oldMissions = {
				't3_001': { postId: 't3_001', missionTitle: 'M1', minLevel: 1, maxLevel: 5, timestamp: 1000, cleared: true },
			};

			mockStorage.set('missions', oldMissions);
			mockStorage.set('userProgress', {});

			const needs = await needsMigration();
			expect(needs).toBe(true);
		});

		it('should return false when no migration needed', async () => {
			const missions = {
				't3_001': { postId: 't3_001', missionTitle: 'M1', minLevel: 1, maxLevel: 5, timestamp: 1000 },
			};

			const userProgress = {
				default: { cleared: [], disabled: [], clearedAt: {}, loot: {} },
			};

			mockStorage.set('missions', missions);
			mockStorage.set('userProgress', userProgress);

			const needs = await needsMigration();
			expect(needs).toBe(false);
		});
	});
});

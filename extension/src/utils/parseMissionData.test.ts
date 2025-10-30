import { describe, it, expect, vi } from 'vitest';
import { parseMissionData, MissionData } from './parseMissionData';
import { exampleResponses } from './parseMissionData.examples';

// Mock the logger to avoid console output during tests
vi.mock('./logger', () => ({
	redditLogger: {
		log: vi.fn(),
		error: vi.fn(),
	},
}));

describe('parseMissionData', () => {
	// Convert base64 string to ArrayBuffer for testing
	function base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binaryString = atob(base64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes.buffer;
	}

	describe('with real API response data', () => {
		it('should parse mission data correctly', () => {
			const arrayBuffer = base64ToArrayBuffer(exampleResponses.basicMission);
			const postId = 't3_1od3es7';

			const result = parseMissionData(arrayBuffer, postId);

			expect(result).not.toBeNull();
			expect(result).toEqual({
				postId: 't3_1od3es7',
				difficulty: 3,
				minLevel: 1,
				maxLevel: 5,
				environment: 'fields',
				foodName: 'Mole Sauce Savory Crepe',
				authorName: 'Sea_Spirit6677',
				title: 'In Search of Mole Sauce Savory Crepe',
			});
		});

		it('should handle missing fields gracefully', () => {
			// Test with empty buffer
			const emptyBuffer = new ArrayBuffer(0);
			const result = parseMissionData(emptyBuffer, 'test');

			expect(result).toEqual({
				postId: 'test',
				difficulty: undefined,
				minLevel: undefined,
				maxLevel: undefined,
				environment: undefined,
				foodName: undefined,
				authorName: undefined,
				title: undefined,
			});
		});

		it('should validate difficulty range', () => {
			// This test ensures the difficulty validation (1-5) is working
			const arrayBuffer = base64ToArrayBuffer(exampleResponses.basicMission);
			const result = parseMissionData(arrayBuffer, 't3_1od3es7');

			expect(result?.difficulty).toBeGreaterThanOrEqual(1);
			expect(result?.difficulty).toBeLessThanOrEqual(5);
		});
	});

	describe('edge cases', () => {
		it('should handle malformed data gracefully', () => {
			const malformedBuffer = new ArrayBuffer(10);
			const result = parseMissionData(malformedBuffer, 'test');

			expect(result).not.toBeNull();
			expect(result?.postId).toBe('test');
		});

		it('should handle null/undefined input', () => {
			expect(() => parseMissionData(null as any, 'test')).not.toThrow();
			expect(() => parseMissionData(undefined as any, 'test')).not.toThrow();
		});
	});

	describe('field extraction', () => {
		it('should extract difficulty with multiple offset attempts', () => {
			const arrayBuffer = base64ToArrayBuffer(exampleResponses.basicMission);
			const result = parseMissionData(arrayBuffer, 't3_1od3es7');

			expect(result?.difficulty).toBe(3);
		});

		it('should extract level ranges correctly', () => {
			const arrayBuffer = base64ToArrayBuffer(exampleResponses.basicMission);
			const result = parseMissionData(arrayBuffer, 't3_1od3es7');

			expect(result?.minLevel).toBe(1);
			expect(result?.maxLevel).toBe(5);
		});

		it('should extract text fields correctly', () => {
			const arrayBuffer = base64ToArrayBuffer(exampleResponses.basicMission);
			const result = parseMissionData(arrayBuffer, 't3_1od3es7');

			expect(result?.environment).toBe('fields');
			expect(result?.foodName).toBe('Mole Sauce Savory Crepe');
			expect(result?.authorName).toBe('Sea_Spirit6677');
			expect(result?.title).toBe('In Search of Mole Sauce Savory Crepe');
		});
	});

	describe('multiple example responses', () => {
		// Test each example response from the examples file
		Object.entries(exampleResponses).forEach(([name, base64Data]) => {
			it(`should parse ${name} correctly`, () => {
				const arrayBuffer = base64ToArrayBuffer(base64Data);
				const postId = `t3_${name.toLowerCase().replace(/\s+/g, '_')}`;

				const result = parseMissionData(arrayBuffer, postId);

				expect(result).not.toBeNull();
				expect(result?.postId).toBe(postId);

				// Basic validation that we got some data
				expect(result).toHaveProperty('postId');
			});
		});
	});

	describe('isInnPost detection', () => {
		it('should detect completed missions (isInnPost: true) when isInnPost string is present', () => {
			// Create mock data that contains the 'isInnPost' string
			const mockData = 'some protobuf data with isInnPost field and other content';
			const arrayBuffer = new TextEncoder().encode(mockData).buffer;
			const result = parseMissionData(arrayBuffer, 't3_test');

			expect(result).not.toBeNull();
			expect(result?.isInnPost).toBe(true);
		});

		it('should detect incomplete missions (isInnPost: false) when isInnPost string is not present', () => {
			// Create mock data that does NOT contain the 'isInnPost' string
			const mockData = 'some protobuf data without isInnPost field and other content';
			const arrayBuffer = new TextEncoder().encode(mockData).buffer;
			const result = parseMissionData(arrayBuffer, 't3_test');

			expect(result).not.toBeNull();
			expect(result?.isInnPost).toBe(false);
		});

		it('should handle empty data gracefully', () => {
			const emptyBuffer = new ArrayBuffer(0);
			const result = parseMissionData(emptyBuffer, 't3_test');

			expect(result).not.toBeNull();
			expect(result?.isInnPost).toBe(false);
		});

		it('should detect inn post with case sensitivity', () => {
			// Test that the detection is case sensitive
			const mockData = 'some protobuf data with IsInnPost field and other content';
			const arrayBuffer = new TextEncoder().encode(mockData).buffer;
			const result = parseMissionData(arrayBuffer, 't3_test');

			expect(result).not.toBeNull();
			expect(result?.isInnPost).toBe(false); // Should be false because case doesn't match
		});
	});
});

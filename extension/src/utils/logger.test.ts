import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, Logger } from './logger';

// Mock console methods to capture logs
const mockConsole = {
	log: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
};

// Mock chrome.storage for tests
const mockChromeStorage = {
	local: {
		get: vi.fn(),
		set: vi.fn(),
	},
	onChanged: {
		addListener: vi.fn(),
	},
};

// Mock global chrome object
Object.defineProperty(global, 'chrome', {
	value: mockChromeStorage,
	writable: true,
});

// Mock fetch for remote logging
global.fetch = vi.fn();

describe('Logger', () => {
	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Mock console methods
		Object.assign(console, mockConsole);

		// Mock chrome.storage to return empty config
		mockChromeStorage.local.get.mockImplementation((keys, callback) => {
			callback({ automationConfig: {} });
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Basic Logging', () => {
		it('should log with [LF] prefix and context', () => {
			const logger = createLogger('TEST');

			logger.log('Test message');

			expect(mockConsole.log).toHaveBeenCalledWith('[LF][TEST]', 'Test message');
		});

		it('should handle different log levels', () => {
			const logger = createLogger('TEST');

			logger.info('Info message');
			logger.warn('Warning message');
			logger.error('Error message');
			logger.debug('Debug message');

			expect(mockConsole.info).toHaveBeenCalledWith('[LF][TEST]', 'Info message');
			expect(mockConsole.warn).toHaveBeenCalledWith('[LF][TEST]', 'Warning message');
			expect(mockConsole.error).toHaveBeenCalledWith('[LF][TEST]', 'Error message');
			expect(mockConsole.debug).toHaveBeenCalledWith('[LF][TEST]', 'Debug message');
		});

		it('should handle multiple arguments', () => {
			const logger = createLogger('TEST');

			logger.log('Message', { data: 'test' }, 123);

			expect(mockConsole.log).toHaveBeenCalledWith('[LF][TEST]', 'Message', { data: 'test' }, 123);
		});
	});

	describe('Nested Context Logging', () => {
		it('should create nested logger with proper context', () => {
			const parentLogger = createLogger('PARENT');
			const childLogger = parentLogger.createNestedLogger('CHILD');

			childLogger.log('Nested message');

			expect(mockConsole.log).toHaveBeenCalledWith('[LF][PARENT][CHILD]', 'Nested message');
		});

		it('should handle deep nesting', () => {
			const level1 = createLogger('LEVEL1');
			const level2 = level1.createNestedLogger('LEVEL2');
			const level3 = level2.createNestedLogger('LEVEL3');

			level3.log('Deep nested message');

			expect(mockConsole.log).toHaveBeenCalledWith(
				'[LF][LEVEL1][LEVEL2][LEVEL3]',
				'Deep nested message',
			);
		});

		it('should preserve parent context when creating multiple children', () => {
			const parentLogger = createLogger('PARENT');
			const child1 = parentLogger.createNestedLogger('CHILD1');
			const child2 = parentLogger.createNestedLogger('CHILD2');

			child1.log('Child 1 message');
			child2.log('Child 2 message');

			expect(mockConsole.log).toHaveBeenCalledWith('[LF][PARENT][CHILD1]', 'Child 1 message');
			expect(mockConsole.log).toHaveBeenCalledWith('[LF][PARENT][CHILD2]', 'Child 2 message');
		});

		it('should handle nested loggers with different log levels', () => {
			const parentLogger = createLogger('PARENT');
			const childLogger = parentLogger.createNestedLogger('CHILD');

			childLogger.info('Info message');
			childLogger.warn('Warning message');
			childLogger.error('Error message');

			expect(mockConsole.info).toHaveBeenCalledWith('[LF][PARENT][CHILD]', 'Info message');
			expect(mockConsole.warn).toHaveBeenCalledWith('[LF][PARENT][CHILD]', 'Warning message');
			expect(mockConsole.error).toHaveBeenCalledWith('[LF][PARENT][CHILD]', 'Error message');
		});
	});

	describe('Configuration', () => {
		it('should respect console logging setting', () => {
			const logger = createLogger('TEST', { consoleLogging: false });

			logger.log('This should not appear');

			expect(mockConsole.log).not.toHaveBeenCalled();
		});

		it('should send to remote server when enabled', async () => {
			const logger = createLogger('TEST', { remoteLogging: true });

			logger.log('Remote message');

			// Wait for async remote logging
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:7856/log',
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: expect.stringContaining('"message":"Remote message"'),
				}),
			);
		});

		it('should not send to remote server when disabled', async () => {
			const logger = createLogger('TEST', { remoteLogging: false });

			logger.log('Local only message');

			// Wait for async remote logging
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(global.fetch).not.toHaveBeenCalled();
		});
	});

	describe('Data Serialization', () => {
		it('should handle circular references gracefully', () => {
			const logger = createLogger('TEST');
			const circularObj: any = { name: 'test' };
			circularObj.self = circularObj;

			logger.log('Circular object', circularObj);

			// Console logging should still work with the original object
			expect(mockConsole.log).toHaveBeenCalledWith('[LF][TEST]', 'Circular object', circularObj);
		});

		it('should serialize data for remote logging', async () => {
			const logger = createLogger('TEST', { remoteLogging: true });
			const testData = { key: 'value', number: 123 };

			logger.log('Message with data', testData);

			// Wait for async remote logging
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.stringContaining('"key":"value"'),
				}),
			);
		});

		it('should handle circular references in remote logging', async () => {
			const logger = createLogger('TEST', { remoteLogging: true });
			const circularObj: any = { name: 'test' };
			circularObj.self = circularObj;

			logger.log('Circular object', circularObj);

			// Wait for async remote logging
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.stringContaining('[Circular Reference]'),
				}),
			);
		});
	});

	describe('Real-world Usage Examples', () => {
		it('should work like the documented examples', () => {
			// Simulate the documented usage
			const redditLogger = createLogger('REDDIT');
			const gameLogger = redditLogger.createNestedLogger('GAME');
			const combatLogger = gameLogger.createNestedLogger('COMBAT');

			redditLogger.log('Mission found');
			gameLogger.log('Starting mission');
			combatLogger.log('Enemy defeated');
			combatLogger.log('Loot collected');
			gameLogger.log('Mission completed');

			expect(mockConsole.log).toHaveBeenCalledWith('[LF][REDDIT]', 'Mission found');
			expect(mockConsole.log).toHaveBeenCalledWith('[LF][REDDIT][GAME]', 'Starting mission');
			expect(mockConsole.log).toHaveBeenCalledWith('[LF][REDDIT][GAME][COMBAT]', 'Enemy defeated');
			expect(mockConsole.log).toHaveBeenCalledWith('[LF][REDDIT][GAME][COMBAT]', 'Loot collected');
			expect(mockConsole.log).toHaveBeenCalledWith('[LF][REDDIT][GAME]', 'Mission completed');
		});
	});
});

/**
 * Unified logging utility for the AutoSupper extension
 * Logs to both console and optional remote server for debugging
 */

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
export type LogContext = 'POPUP' | 'EXT' | 'REDDIT' | 'DEVVIT' | 'DEVVIT-GIAE' | string;

// Default number of logs to keep in storage
export const DEFAULT_MAX_STORED_LOGS = 5000;

interface LogEntry {
	timestamp: string;
	context: LogContext;
	level: LogLevel;
	message: string;
	data?: any;
}

interface LoggerConfig {
	context: LogContext;
	remoteLogging: boolean;
	remoteUrl: string;
	consoleLogging: boolean;
	storeLogs: boolean;
	maxStoredLogs: number;
}

export class Logger {
	private config: LoggerConfig;
	private parentContext?: string;

	constructor(
		context: LogContext,
		config?: Partial<Omit<LoggerConfig, 'context'>>,
		parentContext?: string,
	) {
		this.parentContext = parentContext;
		this.config = {
			context,
			remoteLogging: config?.remoteLogging ?? true,
			remoteUrl: config?.remoteUrl ?? 'http://localhost:7856/log',
			consoleLogging: config?.consoleLogging ?? true,
			storeLogs: config?.storeLogs ?? true,
			maxStoredLogs: config?.maxStoredLogs ?? DEFAULT_MAX_STORED_LOGS,
		};

		// Load logging settings from storage
		if (typeof chrome !== 'undefined' && chrome.storage) {
			chrome.storage.local.get(['automationConfig'], (result) => {
				if (result.automationConfig?.remoteLogging !== undefined) {
					this.config.remoteLogging = result.automationConfig.remoteLogging;
				}
				if (result.automationConfig?.storeLogs !== undefined) {
					this.config.storeLogs = result.automationConfig.storeLogs;
				}
				if (result.automationConfig?.maxStoredLogs !== undefined) {
					this.config.maxStoredLogs = result.automationConfig.maxStoredLogs;
				}
			});

			// Listen for changes to logging settings
			chrome.storage.onChanged.addListener((changes, areaName) => {
				if (areaName === 'local' && changes.automationConfig?.newValue) {
					const newConfig = changes.automationConfig.newValue;
					if (newConfig.remoteLogging !== undefined) {
						this.config.remoteLogging = newConfig.remoteLogging;
					}
					if (newConfig.storeLogs !== undefined) {
						this.config.storeLogs = newConfig.storeLogs;
					}
					if (newConfig.maxStoredLogs !== undefined) {
						this.config.maxStoredLogs = newConfig.maxStoredLogs;
					}
				}
			});
		}
	}

	/**
	 * Send log to remote server
	 */
	private async sendToRemote(entry: LogEntry): Promise<void> {
		if (!this.config.remoteLogging) return;

		try {
			await fetch(this.config.remoteUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(entry),
			}).catch(() => {
				// Silently fail if remote server is not available
				// We don't want to break the extension if the debug server is down
			});
		} catch (error) {
			// Silently fail
		}
	}

	/**
	 * Store log entry in chrome.storage
	 */
	private storeLog(entry: LogEntry): void {
		if (!this.config.storeLogs) return;
		if (typeof chrome === 'undefined' || !chrome.storage) return;

		try {
			// Use callback-based API for better compatibility
			chrome.storage.local.get(['debugLogs'], (result) => {
				if (chrome.runtime.lastError) {
					console.error('[LF] Failed to get logs:', chrome.runtime.lastError);
					return;
				}

				const logs: LogEntry[] = result.debugLogs || [];

				// Add new log
				logs.push(entry);

				// Trim to max size (keep most recent logs)
				if (logs.length > this.config.maxStoredLogs) {
					logs.splice(0, logs.length - this.config.maxStoredLogs);
				}

				// Save back to storage
				chrome.storage.local.set({ debugLogs: logs }, () => {
					if (chrome.runtime.lastError) {
						console.error('[LF] Failed to store log:', chrome.runtime.lastError);
					}
				});
			});
		} catch (error) {
			// Silently fail - don't break the extension if storage fails
			console.error('[LF] Failed to store log:', error);
		}
	}

	/**
	 * Format message with prefix
	 */
	private formatMessage(message: string): string {
		const fullContext = this.parentContext
			? `${this.parentContext}][${this.config.context}`
			: this.config.context;
		return `[LF][${fullContext}] ${message}`;
	}

	/**
	 * Serialize data for logging
	 */
	private serializeData(data: any): any {
		if (data === undefined) return undefined;

		try {
			// Try to stringify and parse to clean up circular references
			return JSON.parse(JSON.stringify(data));
		} catch (error) {
			// If that fails, return a string representation
			return String(data);
		}
	}

	/**
	 * Core logging function
	 */
	private logInternal(level: LogLevel, ...args: any[]): void {
		// Create formatted message for remote logging
		const message = args
			.map((arg) => {
				if (typeof arg === 'string') return arg;
				if (typeof arg === 'object') {
					try {
						return JSON.stringify(arg);
					} catch (error) {
						// Handle circular references gracefully
						return '[Circular Reference]';
					}
				}
				return String(arg);
			})
			.join(' ');

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			context: this.config.context,
			level,
			message,
			data: args.length > 1 ? this.serializeData(args.slice(1)) : undefined,
		};

		// Log to console using appropriate method with native object inspection
		if (this.config.consoleLogging) {
			const consoleMethod = console[level] || console.log;
			// Add LazyFrog and context prefix but preserve native console behavior
			const fullContext = this.parentContext
				? `${this.parentContext}][${this.config.context}`
				: this.config.context;
			consoleMethod(`[LF][${fullContext}]`, ...args);
		}

		// Store in chrome.storage (non-blocking)
		this.storeLog(entry);

		// Send to remote server (non-blocking)
		this.sendToRemote(entry);
	}

	/**
	 * Public logging methods - support unlimited parameters like console.log()
	 */
	log(...args: any[]): void {
		this.logInternal('log', ...args);
	}

	info(...args: any[]): void {
		this.logInternal('info', ...args);
	}

	warn(...args: any[]): void {
		this.logInternal('warn', ...args);
	}

	error(...args: any[]): void {
		this.logInternal('error', ...args);
	}

	debug(...args: any[]): void {
		this.logInternal('debug', ...args);
	}

	/**
	 * Update logger configuration
	 */
	setConfig(config: Partial<Omit<LoggerConfig, 'context'>>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Enable/disable remote logging
	 */
	setRemoteLogging(enabled: boolean): void {
		this.config.remoteLogging = enabled;
	}

	/**
	 * Enable/disable console logging
	 */
	setConsoleLogging(enabled: boolean): void {
		this.config.consoleLogging = enabled;
	}

	/**
	 * Create a nested logger with additional context
	 */
	createNestedLogger(nestedContext: string): Logger {
		const fullContext = this.parentContext
			? `${this.parentContext}][${this.config.context}`
			: this.config.context;
		return new Logger(
			nestedContext as LogContext,
			{
				remoteLogging: this.config.remoteLogging,
				remoteUrl: this.config.remoteUrl,
				consoleLogging: this.config.consoleLogging,
			},
			fullContext,
		);
	}
}

/**
 * Factory function to create loggers for different contexts
 */
export function createLogger(
	context: LogContext,
	config?: Partial<Omit<LoggerConfig, 'context'>>,
	parentContext?: string,
): Logger {
	return new Logger(context, config, parentContext);
}

/**
 * Export stored logs as JSON
 */
export async function exportLogs(): Promise<string> {
	if (typeof chrome === 'undefined' || !chrome.storage) {
		throw new Error('Chrome storage not available');
	}

	const result = await chrome.storage.local.get(['debugLogs']);
	const logs: LogEntry[] = result.debugLogs || [];

	return JSON.stringify(
		{
			exportDate: new Date().toISOString(),
			logCount: logs.length,
			logs,
		},
		null,
		2,
	);
}

/**
 * Clear all stored logs
 */
export async function clearLogs(): Promise<void> {
	if (typeof chrome === 'undefined' || !chrome.storage) {
		throw new Error('Chrome storage not available');
	}

	await chrome.storage.local.set({ debugLogs: [] });
}

/**
 * Get log statistics
 */
export async function getLogStats(): Promise<{ count: number; oldestLog?: string; newestLog?: string }> {
	if (typeof chrome === 'undefined' || !chrome.storage) {
		return { count: 0 };
	}

	const result = await chrome.storage.local.get(['debugLogs']);
	const logs: LogEntry[] = result.debugLogs || [];

	return {
		count: logs.length,
		oldestLog: logs.length > 0 ? logs[0].timestamp : undefined,
		newestLog: logs.length > 0 ? logs[logs.length - 1].timestamp : undefined,
	};
}

/**
 * Pre-configured loggers for each context
 *
 * Example usage for nested contexts:
 * const gameLogger = redditLogger.createNestedLogger('GAME');
 * const combatLogger = gameLogger.createNestedLogger('COMBAT');
 *
 * This will produce logs like:
 * [LF][REDDIT][GAME] Starting mission
 * [LF][REDDIT][GAME][COMBAT] Enemy defeated
 */
export const popupLogger = createLogger('POPUP');
export const extensionLogger = createLogger('EXT');
export const redditLogger = createLogger('REDDIT');
export const devvitLogger = createLogger('DEVVIT');
export const devvitGIAELogger = createLogger('DEVVIT-GIAE');

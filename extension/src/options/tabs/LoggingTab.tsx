/**
 * Logging Tab - Logging and debugging settings
 */

import React, { useState, useEffect } from 'react';
import { Terminal, Eye, Download, Trash2, Database } from 'lucide-react';
import { exportLogs, clearLogs, getLogStats, DEFAULT_MAX_STORED_LOGS } from '../../utils/logger';
import { VERSION } from '../../utils/buildInfo';
import LogViewer, { type LogEntry } from '@lazyfrog/ui/LogViewer';

interface LoggingSettings {
	remoteLogging: boolean;
	storeLogs: boolean;
	maxStoredLogs: number;
}

interface LogStats {
	count: number;
	oldestLog?: string;
	newestLog?: string;
}

const LoggingTab: React.FC = () => {
	const [settings, setSettings] = useState<LoggingSettings>({
		remoteLogging: true,
		storeLogs: true,
		maxStoredLogs: DEFAULT_MAX_STORED_LOGS,
	});
	const [logStats, setLogStats] = useState<LogStats>({ count: 0 });
	const [logs, setLogs] = useState<LogEntry[]>([]);

	// Load settings on mount
	useEffect(() => {
		chrome.storage.local.get(['automationConfig'], (result) => {
			if (result.automationConfig) {
				setSettings({
					remoteLogging: result.automationConfig.remoteLogging !== false,
					storeLogs: result.automationConfig.storeLogs !== false,
					maxStoredLogs: result.automationConfig.maxStoredLogs || DEFAULT_MAX_STORED_LOGS,
				});
			}
		});

		// Load log stats and logs
		loadLogStats();
		loadLogs();
	}, []);

	// Load log statistics
	const loadLogStats = async () => {
		try {
			const stats = await getLogStats();
			setLogStats(stats);
		} catch (error) {
			console.error('Failed to load log stats:', error);
		}
	};

	// Load logs from storage
	const loadLogs = () => {
		chrome.storage.local.get(['debugLogs'], (result) => {
			setLogs(result.debugLogs || []);
		});
	};

	// Save settings when they change
	useEffect(() => {
		chrome.storage.local.get(['automationConfig'], (result) => {
			const fullConfig = {
				...result.automationConfig,
				remoteLogging: settings.remoteLogging,
				storeLogs: settings.storeLogs,
				maxStoredLogs: settings.maxStoredLogs,
			};
			chrome.storage.local.set({ automationConfig: fullConfig });
		});
	}, [settings]);

	// Handle export logs
	const handleExportLogs = async () => {
		try {
			const jsonData = await exportLogs();
			const blob = new Blob([jsonData], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `lazyfrog-logs-v${VERSION}-${Date.now()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			alert(`Failed to export logs: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	// Handle clear logs
	const handleClearLogs = async () => {
		if (window.confirm('Are you sure you want to clear all stored logs? This cannot be undone.')) {
			try {
				await clearLogs();
				await loadLogStats();
				loadLogs();
				alert('All logs cleared successfully!');
			} catch (error) {
				alert(`Failed to clear logs: ${error}`);
			}
		}
	};

	// Refresh logs
	const handleRefreshLogs = () => {
		loadLogs();
		loadLogStats();
	};

	return (
		<div>
			<div className="card">
				<h2>
					<Terminal
						size={20}
						style={{
							display: 'inline-block',
							marginRight: '8px',
							verticalAlign: 'middle',
						}}
					/>
					Remote Logging
				</h2>

				<div className="form-group">
					<label
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							cursor: 'pointer',
						}}
					>
						<input
							type="checkbox"
							checked={settings.remoteLogging}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									remoteLogging: e.target.checked,
								}))
							}
							style={{ cursor: 'pointer' }}
						/>
						<span>Enable Remote Logging</span>
					</label>
					<p
						style={{
							color: '#a1a1aa',
							fontSize: '13px',
							marginTop: '8px',
							marginLeft: '28px',
						}}
					>
						Sends logs to http://localhost:7856/log for debugging and AI integration. This allows
						you to monitor extension behavior in real-time from an external log viewer.
					</p>
				</div>
			</div>

			<div className="card">
				<h2>
					<Database
						size={20}
						style={{
							display: 'inline-block',
							marginRight: '8px',
							verticalAlign: 'middle',
						}}
					/>
					Log Storage
				</h2>

				<div className="form-group" style={{ marginBottom: '20px' }}>
					<label
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							cursor: 'pointer',
						}}
					>
						<input
							type="checkbox"
							checked={settings.storeLogs}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									storeLogs: e.target.checked,
								}))
							}
							style={{ cursor: 'pointer' }}
						/>
						<span>Store Logs in Browser</span>
					</label>
					<p
						style={{
							color: '#a1a1aa',
							fontSize: '13px',
							marginTop: '8px',
							marginLeft: '28px',
						}}
					>
						Stores logs in browser storage for later export. Useful for debugging issues and
						sharing logs with support.
					</p>

					{settings.storeLogs && (
						<div style={{ marginTop: '12px', marginLeft: '28px' }}>
							<label
								style={{
									display: 'block',
									fontSize: '13px',
									color: '#e5e5e5',
									marginBottom: '8px',
								}}
							>
								Maximum logs to keep:
							</label>
							<input
								type="number"
								min="1000"
								max="20000"
								step="1000"
								value={settings.maxStoredLogs}
								onChange={(e) =>
									setSettings((prev) => ({
										...prev,
										maxStoredLogs: parseInt(e.target.value) || DEFAULT_MAX_STORED_LOGS,
									}))
								}
								style={{
									padding: '6px 12px',
									background: '#171717',
									border: '1px solid #1a1a1a',
									borderRadius: '6px',
									color: '#e5e5e5',
									fontSize: '13px',
									width: '120px',
								}}
							/>
							<p
								style={{
									color: '#a1a1aa',
									fontSize: '12px',
									marginTop: '6px',
								}}
							>
								Oldest logs will be removed when limit is reached. Current: {logStats.count} logs
								stored.
							</p>
						</div>
					)}
				</div>

				<div style={{ marginTop: '16px' }}>
					<p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '12px' }}>
						Export stored logs for debugging or clear them to free up storage space.
					</p>
					<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
						<button
							className="button"
							onClick={handleExportLogs}
							style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
							disabled={logStats.count === 0}
						>
							<Download size={16} />
							Export Debug Logs ({logStats.count})
						</button>
						<button
							className="button danger"
							onClick={handleClearLogs}
							style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
							disabled={logStats.count === 0}
						>
							<Trash2 size={16} />
							Clear Logs
						</button>
					</div>
				</div>
			</div>

			<div className="card">
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: '16px',
					}}
				>
					<h2>
						<Eye
							size={20}
							style={{
								display: 'inline-block',
								marginRight: '8px',
								verticalAlign: 'middle',
							}}
						/>
						Log Viewer
					</h2>
					<button
						className="button"
						onClick={handleRefreshLogs}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							fontSize: '13px',
							padding: '6px 12px',
						}}
					>
						Refresh
					</button>
				</div>

				<p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '16px' }}>
					View and search through stored logs in real-time. Logs are automatically loaded from
					storage.
				</p>

				<LogViewer logs={logs} height="600px" />
			</div>
		</div>
	);
};

export default LoggingTab;

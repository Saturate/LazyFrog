/**
 * Settings Tab - Debug and advanced settings
 */

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Trash2, Upload, Download, CheckCircle, Bug } from 'lucide-react';
import { UserOptions } from '../../lib/storage/storageTypes';
import CompleteBackupCard from '../components/CompleteBackupCard';

interface DebugSettings {
	showNextMissions: boolean;
	nextMissionsCount: number;
	debugMode: boolean;
	showStepByStepControls: boolean;
	debugVisuals: boolean;
}

const SettingsTab: React.FC = () => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [settings, setSettings] = useState<DebugSettings>({
		showNextMissions: true,
		nextMissionsCount: 5,
		debugMode: false,
		showStepByStepControls: false,
		debugVisuals: true,
	});
	const [userOptions, setUserOptions] = useState<UserOptions>({});

	// Load settings on mount
	useEffect(() => {
		chrome.storage.local.get(['automationConfig', 'userOptions'], (result) => {
			if (result.automationConfig) {
				setSettings({
					showNextMissions: result.automationConfig.showNextMissions !== false,
					nextMissionsCount: result.automationConfig.nextMissionsCount || 5,
					debugMode: result.automationConfig.debugMode || false,
					showStepByStepControls: result.automationConfig.showStepByStepControls || false,
					debugVisuals: result.automationConfig.debugVisuals !== false, // Default to true
				});
			}
			if (result.userOptions) {
				setUserOptions(result.userOptions);
			}
		});
	}, []);

	// Save settings when they change
	useEffect(() => {
		chrome.storage.local.get(['automationConfig'], (result) => {
			const fullConfig = {
				...result.automationConfig,
				showNextMissions: settings.showNextMissions,
				nextMissionsCount: settings.nextMissionsCount,
				debugMode: settings.debugMode,
				showStepByStepControls: settings.showStepByStepControls,
				debugVisuals: settings.debugVisuals,
			};
			chrome.storage.local.set({ automationConfig: fullConfig });
		});
	}, [settings]);

	// Save user options when they change
	useEffect(() => {
		chrome.storage.local.set({ userOptions });
	}, [userOptions]);

	const handleClearMissions = async () => {
		if (
			window.confirm(
				'Are you sure you want to clear ALL missions from the database? This cannot be undone.',
			)
		) {
			const { clearAllMissions } = await import('../../lib/storage/missions');
			await clearAllMissions();
			alert('All missions cleared!');
		}
	};

	const handleClearAllData = async () => {
		if (
			window.confirm(
				'Are you sure you want to clear ALL DATA? This will delete all missions, settings, and filters, resetting the extension to default state. This cannot be undone.',
			)
		) {
			await chrome.storage.local.clear();
			alert(
				'All data cleared! The extension has been reset to default state. Please reload the extension.',
			);
		}
	};

	const handleMarkAllIncomplete = async () => {
		if (
			window.confirm(
				'Mark ALL missions as incomplete? This will reset cleared status on every mission.',
			)
		) {
			const { markAllMissionsIncomplete } = await import('../../lib/storage/missions');
			await markAllMissionsIncomplete();
			alert('All missions marked as incomplete.');
		}
	};

	const handleExportUserProgress = async () => {
		try {
			const { exportUserProgress } = await import('../../lib/storage/userProgress');
			const { getCurrentRedditUser } = await import('../../lib/reddit/userDetection');
			const username = await getCurrentRedditUser();
			const jsonData = await exportUserProgress();

			// Create blob and download
			const blob = new Blob([jsonData], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `lazyfrog-progress-${username}-${Date.now()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			alert(`Failed to export user progress: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	const handleImportUserProgress = () => {
		fileInputRef.current?.click();
	};

	const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const { importUserProgress } = await import('../../lib/storage/userProgress');
			await importUserProgress(text);
			alert('User progress imported successfully!');
		} catch (error) {
			alert(`Failed to import user progress: ${error instanceof Error ? error.message : String(error)}`);
		}

		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	return (
		<div>
			<div className="card">
				<h2>
					<Bug
						size={20}
						style={{
							display: 'inline-block',
							marginRight: '8px',
							verticalAlign: 'middle',
						}}
					/>
					Developer Mode
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
							checked={userOptions.debugMode || false}
							onChange={(e) =>
								setUserOptions((prev: UserOptions) => ({
									...prev,
									debugMode: e.target.checked,
								}))
							}
							style={{ cursor: 'pointer' }}
						/>
						<span>Enable Debug Tab</span>
					</label>
					<p
						style={{
							color: '#a1a1aa',
							fontSize: '13px',
							marginTop: '8px',
							marginLeft: '28px',
						}}
					>
						Enables the Debug tab with developer tools for testing mission data fetching and other advanced features.
					</p>
				</div>

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
							checked={settings.debugMode}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									debugMode: e.target.checked,
								}))
							}
							style={{ cursor: 'pointer' }}
						/>
						<span>Enable Debug Logging</span>
					</label>
					<p
						style={{
							color: '#a1a1aa',
							fontSize: '13px',
							marginTop: '8px',
							marginLeft: '28px',
						}}
					>
						Enables additional debug logging and features throughout the extension. Useful for troubleshooting issues or understanding extension behavior.
					</p>
				</div>

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
							checked={settings.showStepByStepControls}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									showStepByStepControls: e.target.checked,
								}))
							}
							style={{ cursor: 'pointer' }}
						/>
						<span>Show Step-by-Step Controls</span>
					</label>
					<p
						style={{
							color: '#a1a1aa',
							fontSize: '13px',
							marginTop: '8px',
							marginLeft: '28px',
						}}
					>
						Shows step-by-step automation controls in the popup (1. Navigate, 2. Open, 3. Play). Useful for debugging automation flow or manually controlling each step.
					</p>
				</div>

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
							checked={settings.debugVisuals}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									debugVisuals: e.target.checked,
								}))
							}
							style={{ cursor: 'pointer' }}
						/>
						<span>Show Debug Visual Indicators</span>
					</label>
					<p
						style={{
							color: '#a1a1aa',
							fontSize: '13px',
							marginTop: '8px',
							marginLeft: '28px',
						}}
					>
						Highlights buttons that the bot wants to click with a red outline. Useful for visually debugging automation decisions and understanding what the bot is doing.
					</p>
				</div>
			</div>

			<div className="card">
				<h2>
					<Settings
						size={20}
						style={{
							display: 'inline-block',
							marginRight: '8px',
							verticalAlign: 'middle',
						}}
					/>
					Display Settings
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
							checked={settings.showNextMissions}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									showNextMissions: e.target.checked,
								}))
							}
							style={{ cursor: 'pointer' }}
						/>
						<span>Show Mission Queue</span>
					</label>
					<p
						style={{
							color: '#a1a1aa',
							fontSize: '13px',
							marginTop: '8px',
							marginLeft: '28px',
						}}
					>
						Shows the queue of upcoming missions in the popup that match your current filters.
					</p>
					{settings.showNextMissions && (
						<div style={{ marginTop: '12px', marginLeft: '28px' }}>
							<label
								style={{
									display: 'block',
									fontSize: '13px',
									color: '#e5e5e5',
									marginBottom: '8px',
								}}
							>
								Number of missions to show:
							</label>
							<input
								type="number"
								min="1"
								max="20"
								value={settings.nextMissionsCount}
								onChange={(e) =>
									setSettings((prev) => ({
										...prev,
										nextMissionsCount: parseInt(e.target.value) || 5,
									}))
								}
								style={{
									padding: '6px 12px',
									background: '#171717',
									border: '1px solid #1a1a1a',
									borderRadius: '6px',
									color: '#e5e5e5',
									fontSize: '13px',
									width: '80px',
								}}
							/>
						</div>
					)}
				</div>
			</div>

			<div className="card">
				<h2>
					<CheckCircle
						size={20}
						style={{
							display: 'inline-block',
							marginRight: '8px',
							verticalAlign: 'middle',
						}}
					/>
					Progress Data Management
				</h2>

				<div style={{ marginBottom: '16px' }}>
					<p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '12px' }}>
						Export or import your user progress (cleared missions, disabled missions, and loot).
					</p>
					<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
						<button
							className="button"
							onClick={handleExportUserProgress}
							style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
						>
							<Download size={16} />
							Export User Progress
						</button>
						<button
							className="button"
							onClick={handleImportUserProgress}
							style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
						>
							<Upload size={16} />
							Import User Progress
						</button>
					</div>
				</div>

				<div>
					<p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '12px' }}>
						Mark all missions as incomplete. This preserves mission entries but resets their cleared
						status.
					</p>
					<button
						className="button"
						onClick={handleMarkAllIncomplete}
						style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					>
						Mark All Missions Incomplete
					</button>
				</div>

				{/* Hidden file input for user progress import */}
				<input
					ref={fileInputRef}
					type="file"
					accept=".json,application/json"
					style={{ display: 'none' }}
					onChange={handleFileSelected}
				/>
			</div>

			<CompleteBackupCard />

			<div className="card">
				<h2>
					<Trash2
						size={20}
						style={{
							display: 'inline-block',
							marginRight: '8px',
							verticalAlign: 'middle',
						}}
					/>
					Mission Data Management
				</h2>

				<div style={{ marginBottom: '16px' }}>
					<p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '12px' }}>
						Clear all mission data from the database. This action cannot be undone.
					</p>
					<button
						className="button danger"
						onClick={handleClearMissions}
						style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					>
						<Trash2 size={16} />
						Clear All Missions
					</button>
				</div>

				<div>
					<p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '12px' }}>
						Clear all data including missions, settings, and filters. Resets the extension to
						default state. This action cannot be undone.
					</p>
					<button
						className="button danger"
						onClick={handleClearAllData}
						style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					>
						<Trash2 size={16} />
						Clear All Data
					</button>
				</div>
			</div>
		</div>
	);
};

export default SettingsTab;

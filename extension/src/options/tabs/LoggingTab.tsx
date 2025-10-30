/**
 * Logging Tab - Logging and debugging settings
 */

import React, { useState, useEffect } from 'react';
import { Terminal, Bug } from 'lucide-react';

interface LoggingSettings {
	debugMode: boolean;
	remoteLogging: boolean;
	showStepByStepControls: boolean;
}

const LoggingTab: React.FC = () => {
	const [settings, setSettings] = useState<LoggingSettings>({
		debugMode: false,
		remoteLogging: true,
		showStepByStepControls: false,
	});

	// Load settings on mount
	useEffect(() => {
		chrome.storage.local.get(['automationConfig'], (result) => {
			if (result.automationConfig) {
				setSettings({
					debugMode: result.automationConfig.debugMode || false,
					remoteLogging: result.automationConfig.remoteLogging !== false,
					showStepByStepControls: result.automationConfig.showStepByStepControls || false,
				});
			}
		});
	}, []);

	// Save settings when they change
	useEffect(() => {
		chrome.storage.local.get(['automationConfig'], (result) => {
			const fullConfig = {
				...result.automationConfig,
				debugMode: settings.debugMode,
				remoteLogging: settings.remoteLogging,
				showStepByStepControls: settings.showStepByStepControls,
			};
			chrome.storage.local.set({ automationConfig: fullConfig });
		});
	}, [settings]);

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
					<Bug
						size={20}
						style={{
							display: 'inline-block',
							marginRight: '8px',
							verticalAlign: 'middle',
						}}
					/>
					Debug Settings
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
							checked={settings.debugMode}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									debugMode: e.target.checked,
								}))
							}
							style={{ cursor: 'pointer' }}
						/>
						<span>Enable Debug Mode</span>
					</label>
					<p
						style={{
							color: '#a1a1aa',
							fontSize: '13px',
							marginTop: '8px',
							marginLeft: '28px',
						}}
					>
						Enables additional debug logging and features throughout the extension. Useful for
						troubleshooting issues or understanding extension behavior.
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
						Shows step-by-step automation controls in the popup (1. Navigate, 2. Open, 3. Play).
						Useful for debugging automation flow or manually controlling each step.
					</p>
				</div>
			</div>
		</div>
	);
};

export default LoggingTab;

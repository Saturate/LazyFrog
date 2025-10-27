/**
 * Simplified Popup - Status Dashboard with Debug Tools
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
	Play,
	Pause,
	Settings,
	Heart,
} from 'lucide-react';
import { getMissionStats } from '../lib/storage/missionStats';
import { getNextMissions } from '../lib/storage/missionQueries';
import { MissionRecord, AutomationFilters } from '../lib/storage/types';
import { getAutomationFilters } from '../lib/storage/getAutomationFilters';
import { VERSION, getTimeSinceBuild } from '../utils/buildInfo';
import './popup.css';
import { MissionStats } from './MissionStats';
import { NextMissions } from './sections/NextMissions';
import { MissionFilters } from './sections/MissionFilters';
import { StepByStepControls } from './sections/StepByStepControls';
import { DebugTools } from './sections/DebugTools';

interface MissionStats {
	queued: number;
	total: number;
	cleared: number;
	uncleared: number;
	todayCleared: number;
}

// Remove local interface in favor of imported AutomationFilters

const PopupApp: React.FC = () => {
	const [isRunning, setIsRunning] = useState(false);
	const [statusText, setStatusText] = useState('Idle');
	const [currentMission, setCurrentMission] = useState<string | null>(null);
	const [stats, setStats] = useState<MissionStats>({
		queued: 0,
		total: 0,
		cleared: 0,
		uncleared: 0,
		todayCleared: 0,
	});
	const [buildAge, setBuildAge] = useState(getTimeSinceBuild());
	// Initialize filters as null, will be loaded from storage
	const [filters, setFilters] = useState<AutomationFilters | null>(null);

	// Collapsible section states
	const [showFilters, setShowFilters] = useState(() => {
		const saved = localStorage.getItem('popup.showFilters');
		return saved !== null ? JSON.parse(saved) : true;
	});
	const [showStats, setShowStats] = useState(() => {
		const saved = localStorage.getItem('popup.showStats');
		return saved !== null ? JSON.parse(saved) : true;
	});
	const [showDebug, setShowDebug] = useState(() => {
		const saved = localStorage.getItem('popup.showDebug');
		return saved !== null ? JSON.parse(saved) : false;
	});
	const [showStepByStepControls, setShowStepByStepControls] = useState(false);
	const [showStepControls, setShowStepControls] = useState(() => {
		const saved = localStorage.getItem('popup.showStepControls');
		return saved !== null ? JSON.parse(saved) : false;
	});
	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const [debugMode, setDebugMode] = useState(false);

	// Next missions state
	const [showNextMissions, setShowNextMissions] = useState(true);
	const [nextMissionsCount, setNextMissionsCount] = useState(5);
	const [nextMissions, setNextMissions] = useState<MissionRecord[]>([]);
	const [showNextMissionsSection, setShowNextMissionsSection] = useState(() => {
		const saved = localStorage.getItem('popup.showNextMissionsSection');
		return saved !== null ? JSON.parse(saved) : true;
	});

	// Load mission statistics
	const loadStats = useCallback(async () => {
		try {
			const missionStats = await getMissionStats();
			setStats(missionStats);
		} catch (error) {
			console.error('Failed to load stats:', error);
		}
	}, []);

	// Load next missions
	const loadNextMissions = useCallback(async () => {
		if (!showNextMissions || !filters) {
			setNextMissions([]);
			return;
		}
		try {
			const missions = await getNextMissions(nextMissionsCount, {
				stars: filters.stars,
				minLevel: filters.minLevel,
				maxLevel: filters.maxLevel,
			});
			setNextMissions(missions);
		} catch (error) {
			console.error('Failed to load next missions:', error);
		}
	}, [showNextMissions, nextMissionsCount, filters]);

	// Load stats and filters on mount
	useEffect(() => {
		loadStats();

		// Load filters from storage (with defaults initialization)
		getAutomationFilters().then((loadedFilters) => {
			setFilters(loadedFilters);
			setIsInitialLoad(false);
		}).catch((error) => {
			console.error('Failed to load filters:', error);
			setIsInitialLoad(false);
		});

		// Load automation config
		chrome.storage.local.get(['automationConfig'], (result) => {
			if (result.automationConfig) {
				setShowStepByStepControls(result.automationConfig.showStepByStepControls || false);
				setShowNextMissions(result.automationConfig.showNextMissions !== false);
				setNextMissionsCount(result.automationConfig.nextMissionsCount || 5);
				setDebugMode(result.automationConfig.debugMode || false);
			}
		});

		// Update build age every minute
		const interval = setInterval(() => {
			setBuildAge(getTimeSinceBuild());
		}, 60000);

		return () => clearInterval(interval);
	}, [loadStats]);

	// Save collapsible states to localStorage
	useEffect(() => {
		localStorage.setItem('popup.showFilters', JSON.stringify(showFilters));
	}, [showFilters]);

	useEffect(() => {
		localStorage.setItem('popup.showStats', JSON.stringify(showStats));
	}, [showStats]);

	useEffect(() => {
		localStorage.setItem('popup.showDebug', JSON.stringify(showDebug));
	}, [showDebug]);

	useEffect(() => {
		localStorage.setItem('popup.showStepControls', JSON.stringify(showStepControls));
	}, [showStepControls]);

	useEffect(() => {
		localStorage.setItem('popup.showNextMissionsSection', JSON.stringify(showNextMissionsSection));
	}, [showNextMissionsSection]);

	// Load next missions when filters or settings change
	useEffect(() => {
		loadNextMissions();
	}, [loadNextMissions]);

	// Save filters to chrome storage when changed (but not during initial load)
	useEffect(() => {
		// Skip saving during initial load to prevent overwriting saved values
		if (isInitialLoad || !filters) {
			return;
		}

		// Save to automationFilters as single source of truth
		chrome.storage.local.set({
			automationFilters: filters,
		});

		// Also reload stats when filters change
		loadStats();
	}, [filters, isInitialLoad, loadStats]);

	// Listen for messages from background
	useEffect(() => {
		const messageListener = (message: any) => {
			if (message.type === 'STATUS_UPDATE') {
				setStatusText(message.status);
			} else if (message.type === 'STATE_CHANGED') {
				setIsRunning(!['idle', 'error'].includes(message.state));
				// Update stats when state changes
				loadStats();
			} else if (message.type === 'MISSIONS_CHANGED') {
				// Missions were added or updated, reload stats and next missions
				loadStats();
				loadNextMissions();
			}
		};

		chrome.runtime.onMessage.addListener(messageListener);
		return () => chrome.runtime.onMessage.removeListener(messageListener);
	}, [loadStats, loadNextMissions]);

	// Handle start button
	const handleStart = () => {
		if (!filters) return;
		chrome.runtime.sendMessage({
			type: 'START_BOT',
			filters,
		});
	};

	// Toggle difficulty star
	const toggleStar = (star: number) => {
		setFilters((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				stars: prev.stars.includes(star)
					? prev.stars.filter((s) => s !== star)
					: [...prev.stars, star].sort(),
			};
		});
	};

	// Handle stop button
	const handleStop = () => {
		chrome.runtime.sendMessage({ type: 'STOP_BOT' });
	};

	// Debug functions
	const viewLogs = () => {
		window.open('http://localhost:7856/logs', '_blank');
	};

	const testSelectors = async () => {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (tab.id) {
			chrome.tabs.sendMessage(tab.id, { type: 'TEST_SELECTORS' });
		}
	};

	const exportData = async () => {
		try {
			const { exportAllData } = await import('../utils/exportAllData');
			await exportAllData();
		} catch (error) {
			alert('Failed to export data: ' + error);
		}
	};

	const openSettings = () => {
		chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
	};

	// Debug step functions
	const handleNavigateToMission = () => {
		if (!filters) return;
		chrome.runtime.sendMessage({
			type: 'NAVIGATE_TO_MISSION',
			filters,
		});
	};

	const handleOpenIframe = () => {
		chrome.runtime.sendMessage({
			type: 'OPEN_MISSION_IFRAME',
		});
	};

	const handleAutoPlay = () => {
		chrome.storage.local.get(['automationConfig'], (result) => {
			const config = result.automationConfig || {};
			chrome.runtime.sendMessage({
				type: 'START_MISSION_AUTOMATION',
				config: { ...config, enabled: true },
			});
		});
	};

	const handleStopAutomation = () => {
		chrome.runtime.sendMessage({
			type: 'STOP_MISSION_AUTOMATION',
		});
	};

	return (
		<div className="popup-container">
			{/* Status Section */}
			<div className="status-section">
				<div className="status-header">
					<span className="status-text">LazyFrog Bot</span>
					<span className={`status-dot ${isRunning ? 'running' : 'idle'}`} />
				</div>
				<div className="status-details">
					<div className="status-line">Status: {statusText}</div>
					{currentMission && <div className="status-line">Mission: {currentMission}</div>}
				</div>
			</div>

			{/* Control Buttons */}
			<div className="control-section">
				<button className="control-button start-button" onClick={handleStart} disabled={isRunning}>
					<Play size={16} />
					START ({stats.queued})
				</button>
				<button className="control-button stop-button" onClick={handleStop} disabled={!isRunning}>
					<Pause size={16} />
					STOP
				</button>
			</div>

			{/* Step-by-Step Controls - Only shown when enabled in settings */}
			{showStepByStepControls && (
				<StepByStepControls
					showSection={showStepControls}
					onToggle={() => setShowStepControls(!showStepControls)}
					onNavigateToMission={handleNavigateToMission}
					onOpenIframe={handleOpenIframe}
					onAutoPlay={handleAutoPlay}
					onStopAutomation={handleStopAutomation}
				/>
			)}

			{/* Mission Filters - Collapsible */}
			{filters && (
				<MissionFilters
					filters={filters}
					isRunning={isRunning}
					showSection={showFilters}
					onToggle={() => setShowFilters(!showFilters)}
					onToggleStar={toggleStar}
					onMinLevelChange={(level) => setFilters((prev) => prev ? ({ ...prev, minLevel: level }) : prev)}
					onMaxLevelChange={(level) => setFilters((prev) => prev ? ({ ...prev, maxLevel: level }) : prev)}
				/>
			)}

			{/* Mission Stats - Collapsible */}
			<MissionStats stats={stats} />

			{/* Mission Queue - Collapsible */}
			{showNextMissions && (
				<NextMissions
					nextMissions={nextMissions}
					showSection={showNextMissionsSection}
					onToggle={() => setShowNextMissionsSection(!showNextMissionsSection)}
				/>
			)}

			{/* Debug Tools - Collapsible (only shown when debugMode is enabled) */}
			{debugMode && (
				<DebugTools
					showSection={showDebug}
					onToggle={() => setShowDebug(!showDebug)}
					onViewLogs={viewLogs}
					onTestSelectors={testSelectors}
					onExportData={exportData}
				/>
			)}

			{/* Big More Button */}
			<button className="settings-button" onClick={openSettings}>
				<Settings size={20} />
				MORE
			</button>

			{/* Sponsor Link */}
			<div style={{ padding: '8px 16px', textAlign: 'center' }}>
				<a
					href="https://github.com/sponsors/Saturate"
					target="_blank"
					rel="noopener noreferrer"
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: '6px',
						color: '#ec4899',
						fontSize: '12px',
						textDecoration: 'none',
						padding: '6px 12px',
						borderRadius: '6px',
						transition: 'background-color 0.2s',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.1)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
				>
					<Heart size={12} fill="#ec4899" />
					<span>Support Development</span>
				</a>
			</div>

			{/* Footer */}
			<div className="footer">
				<span>v{VERSION}</span>
				<span>Built: {buildAge}</span>
			</div>
		</div>
	);
};

export default PopupApp;

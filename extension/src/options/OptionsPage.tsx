/**
 * Options Page - Main settings and configuration interface
 * Tabbed layout with Automation, Settings, Missions, and About tabs
 */

import React, { useState, useEffect } from 'react';
import { Target, Settings, BarChart3, Info, Terminal, Bug } from 'lucide-react';
import AutomationTab from './tabs/AutomationTab';
import SettingsTab from './tabs/SettingsTab';
import LoggingTab from './tabs/LoggingTab';
import MissionsTab from './tabs/MissionsTab';
import AboutTab from './tabs/AboutTab';
import DebugTab from './tabs/DebugTab';
import './options.css';

type TabType = 'missions' | 'automation' | 'logging' | 'settings' | 'about' | 'debug';

const OptionsPage: React.FC = () => {
	const [activeTab, setActiveTab] = useState<TabType>('missions');
	const [debugMode, setDebugMode] = useState(false);

	// Load debug mode setting
	useEffect(() => {
		chrome.storage.local.get(['userOptions'], (result) => {
			if (result.userOptions?.debugMode) {
				setDebugMode(true);
			}
		});

		// Listen for changes to debug mode
		const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
			if (changes.userOptions?.newValue?.debugMode !== undefined) {
				setDebugMode(changes.userOptions.newValue.debugMode);
			}
		};

		chrome.storage.onChanged.addListener(handleStorageChange);
		return () => chrome.storage.onChanged.removeListener(handleStorageChange);
	}, []);

	// Support URL hash navigation
	useEffect(() => {
		const hash = window.location.hash.slice(1) as TabType;
		if (hash && ['missions', 'automation', 'logging', 'settings', 'about', 'debug'].includes(hash)) {
			setActiveTab(hash);
		}
	}, []);

	// Update URL when tab changes
	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
		window.location.hash = tab;
	};

	return (
		<div className="options-container">
			{/* Header */}
			<header className="options-header">
				<h1>LazyFrog Settings</h1>
				<p>Configure your Sword & Supper automation bot</p>
			</header>

			{/* Tab Navigation */}
			<nav className="tab-navigation">
				<button
					className={`tab-button ${activeTab === 'missions' ? 'active' : ''}`}
					onClick={() => handleTabChange('missions')}
				>
					<BarChart3 size={16} />
					Missions
				</button>
				<button
					className={`tab-button ${activeTab === 'automation' ? 'active' : ''}`}
					onClick={() => handleTabChange('automation')}
				>
					<Target size={16} />
					Automation
				</button>
				<button
					className={`tab-button ${activeTab === 'logging' ? 'active' : ''}`}
					onClick={() => handleTabChange('logging')}
				>
					<Terminal size={16} />
					Logging
				</button>
				<button
					className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
					onClick={() => handleTabChange('settings')}
				>
					<Settings size={16} />
					Settings
				</button>
				{debugMode && (
					<button
						className={`tab-button ${activeTab === 'debug' ? 'active' : ''}`}
						onClick={() => handleTabChange('debug')}
					>
						<Bug size={16} />
						Debug
					</button>
				)}
				<button
					className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
					onClick={() => handleTabChange('about')}
				>
					<Info size={16} />
					About
				</button>
			</nav>

			{/* Tab Content */}
			<main className="tab-content">
				{activeTab === 'missions' && <MissionsTab />}
				{activeTab === 'automation' && <AutomationTab />}
				{activeTab === 'logging' && <LoggingTab />}
				{activeTab === 'settings' && <SettingsTab />}
				{activeTab === 'debug' && debugMode && <DebugTab />}
				{activeTab === 'about' && <AboutTab />}
			</main>
		</div>
	);
};

export default OptionsPage;

/**
 * Main Popup App Component
 */

import React, { useState, useEffect } from 'react';
import { LevelFilters, Level } from '../types';
import { getAllMissions, getFilteredUnclearedMissions, MissionRecord } from '../utils/storage';
import { knownAbilities, knownBlessingStats } from '../data';
import { VERSION, getTimeSinceBuild, getBuildTimestamp } from '../utils/buildInfo';
import { Gamepad2, Settings, FileText, Target, BarChart3, Play, Star } from 'lucide-react';
import './popup.css';

interface AutomationConfig {
	enabled: boolean;
	abilityTierList: string[];
	blessingStatPriority: string[];
	autoAcceptSkillBargains: boolean;
	skillBargainStrategy: 'always' | 'positive-only' | 'never';
	crossroadsStrategy: 'fight' | 'skip'; // Whether to fight or skip miniboss encounters
	emulateMode: boolean;
	emulateDelaySeconds: number;
	debugMode: boolean;
	remoteLogging: boolean;
}

const PopupApp: React.FC = () => {
	console.log('[POPUP] 🔵 PopupApp component loaded');

	const [isRunning, setIsRunning] = useState(false);
	const [statusText, setStatusText] = useState('Idle');
	const [buildAge, setBuildAge] = useState(getTimeSinceBuild());
	const [filters, setFilters] = useState<LevelFilters>({
		stars: [1, 2],
		minLevel: 1,
		maxLevel: 340,
		onlyIncomplete: true,
		autoProcess: false,
	});
	const [levels, setLevels] = useState<Level[]>([]);
	const [showResults, setShowResults] = useState(false);
	const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({
		enabled: false,
		abilityTierList: ['IceKnifeOnTurnStart', 'LightningOnCrit', 'HealOnFirstTurn'],
		blessingStatPriority: ['Speed', 'Attack', 'Crit', 'Health', 'Defense', 'Dodge'],
		autoAcceptSkillBargains: true,
		skillBargainStrategy: 'positive-only',
		crossroadsStrategy: 'fight',
		emulateMode: false,
		emulateDelaySeconds: 3,
		debugMode: false,
		remoteLogging: true,
	});
	const [currentTab, setCurrentTab] = useState<'control' | 'options' | 'missions'>('control');
	const [missions, setMissions] = useState<MissionRecord[]>([]);
	const [filteredMissions, setFilteredMissions] = useState<MissionRecord[]>([]);
	const [missionStats, setMissionStats] = useState({
		total: 0,
		cleared: 0,
		uncleared: 0,
	});

	// Extract all unique abilities from mission metadata
	const extractUniqueAbilities = (missions: MissionRecord[]): string[] => {
		const abilitiesSet = new Set<string>();

		// Start with known abilities from data
		knownAbilities.forEach((ability) => abilitiesSet.add(ability));

		// Extract from mission metadata
		missions.forEach((mission) => {
			if (!mission.metadata?.mission?.encounters) return;

			mission.metadata.mission.encounters.forEach((encounter: any) => {
				if (encounter.type === 'abilityChoice') {
					if (encounter.optionA?.abilityId) abilitiesSet.add(encounter.optionA.abilityId);
					if (encounter.optionB?.abilityId) abilitiesSet.add(encounter.optionB.abilityId);
					if (encounter.optionC?.abilityId) abilitiesSet.add(encounter.optionC.abilityId);
				}
			});
		});

		return Array.from(abilitiesSet).sort();
	};

	// Extract all unique blessing stats from mission metadata
	const extractUniqueBlessingStats = (missions: MissionRecord[]): string[] => {
		const statsSet = new Set<string>();

		// Start with known blessing stats from data
		knownBlessingStats.forEach((stat) => statsSet.add(stat));

		// Extract from mission metadata
		missions.forEach((mission) => {
			if (!mission.metadata?.mission?.encounters) return;

			mission.metadata.mission.encounters.forEach((encounter: any) => {
				if (encounter.type === 'skillBargain') {
					if (encounter.positiveEffect?.stat) statsSet.add(encounter.positiveEffect.stat);
					if (encounter.negativeEffect?.stat) statsSet.add(encounter.negativeEffect.stat);
				}
				if (encounter.type === 'statsChoice') {
					if (encounter.optionA?.stat) statsSet.add(encounter.optionA.stat);
					if (encounter.optionB?.stat) statsSet.add(encounter.optionB.stat);
				}
			});
		});

		// Format stat names (capitalize first letter)
		const formatted = Array.from(statsSet).map((stat) => {
			return stat.charAt(0).toUpperCase() + stat.slice(1);
		});

		return formatted.sort();
	};

	// Load missions from storage
	const loadMissions = async () => {
		try {
			const allMissions = await getAllMissions();
			const missionList = Object.values(allMissions).sort((a, b) => b.timestamp - a.timestamp); // Newest first
			setMissions(missionList);

			const cleared = missionList.filter((m) => m.cleared).length;
			const uncleared = missionList.filter((m) => !m.cleared).length;

			setMissionStats({
				total: missionList.length,
				cleared,
				uncleared,
			});

			// Update ability tier list and blessing stat priority with discovered items
			// Only add new items that aren't already in the list
			const discoveredAbilities = extractUniqueAbilities(missionList);
			const discoveredStats = extractUniqueBlessingStats(missionList);

			setAutomationConfig((prev) => {
				const newAbilities = discoveredAbilities.filter((a) => !prev.abilityTierList.includes(a));
				const newStats = discoveredStats.filter((s) => !prev.blessingStatPriority.includes(s));

				// Log newly discovered items
				if (newAbilities.length > 0) {
					console.log('[POPUP] 🆕 NEW ABILITIES DISCOVERED:', newAbilities);
					console.log('[POPUP] Total abilities now:', discoveredAbilities.length);
				}
				if (newStats.length > 0) {
					console.log('[POPUP] 🆕 NEW BLESSING STATS DISCOVERED:', newStats);
					console.log('[POPUP] Total stats now:', discoveredStats.length);
				}

				// If there are new items, add them to the end of the list
				if (newAbilities.length > 0 || newStats.length > 0) {
					return {
						...prev,
						abilityTierList: [...prev.abilityTierList, ...newAbilities],
						blessingStatPriority: [...prev.blessingStatPriority, ...newStats],
					};
				}

				return prev;
			});
		} catch (error) {
			console.error('[POPUP] Failed to load missions:', error);
		}
	};

	// Load saved filters and automation config on mount
	useEffect(() => {
		chrome.storage.local.get(['filters', 'automationConfig'], (result) => {
			if (result.filters) {
				setFilters(result.filters);
			}
			if (result.automationConfig) {
				// Merge saved config with defaults to ensure new fields exist
				setAutomationConfig((prev) => ({
					...prev,
					...result.automationConfig,
					// Ensure arrays exist with defaults if not in saved config
					abilityTierList: result.automationConfig.abilityTierList || prev.abilityTierList,
					blessingStatPriority:
						result.automationConfig.blessingStatPriority || prev.blessingStatPriority,
				}));
			}
		});

		// Load missions
		loadMissions();

		// Listen for messages
		const messageListener = (message: any) => {
			if (message.type === 'LEVELS_FOUND') {
				setLevels(message.levels);
				setShowResults(true);
			} else if (message.type === 'STATUS_UPDATE') {
				let status = message.status;
				if (message.missionId) {
					status = status.replace('%missionId%', message.missionId);
				}
				if (message.encounter) {
					status = status.replace('%current%', message.encounter.current);
					status = status.replace('%total%', message.encounter.total);
				}
				setStatusText(status);
			}
		};
		chrome.runtime.onMessage.addListener(messageListener);

		return () => {
			chrome.runtime.onMessage.removeListener(messageListener);
		};
	}, []);

	// Save filters when they change
	useEffect(() => {
		chrome.storage.local.set({ filters });
	}, [filters]);

	// Save automation config when it changes
	useEffect(() => {
		chrome.storage.local.set({ automationConfig });
	}, [automationConfig]);

	// Update build age every minute
	useEffect(() => {
		const interval = setInterval(() => {
			setBuildAge(getTimeSinceBuild());
		}, 60000); // Update every minute

		return () => clearInterval(interval);
	}, []);

	// Update filtered missions when filters or missions change
	useEffect(() => {
		getFilteredUnclearedMissions({
			stars: filters.stars,
			minLevel: filters.minLevel,
			maxLevel: filters.maxLevel,
		}).then(setFilteredMissions);
	}, [filters, missions]);

	const handleStart = () => {
		chrome.runtime.sendMessage(
			{
				type: 'START_BOT',
				filters,
			},
			() => {
				setIsRunning(true);
				setStatusText('Starting automation...');
			},
		);
	};

	const handleStop = () => {
		chrome.runtime.sendMessage(
			{
				type: 'STOP_BOT',
			},
			() => {
				setIsRunning(false);
				setStatusText('Idle');
			},
		);
	};

	const handleScan = () => {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs[0]?.id) {
				chrome.tabs.sendMessage(
					tabs[0].id,
					{
						type: 'GET_LEVELS',
						filters,
					},
					(response) => {
						if (response?.levels) {
							setLevels(response.levels);
							setShowResults(true);
						}
					},
				);
			}
		});
	};

	const updateFilter = (key: keyof LevelFilters, value: any) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const updateAutomationConfig = (key: keyof AutomationConfig, value: any) => {
		setAutomationConfig((prev) => ({ ...prev, [key]: value }));
	};

	const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', index.toString());
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
		e.preventDefault();
		const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

		if (dragIndex === dropIndex) return;

		const newTierList = [...automationConfig.abilityTierList];
		const [draggedItem] = newTierList.splice(dragIndex, 1);
		newTierList.splice(dropIndex, 0, draggedItem);

		updateAutomationConfig('abilityTierList', newTierList);
	};

	// Debug Step 1: Navigate to next uncompleted mission from database
	const handleNavigateToMission = () => {
		console.log('[POPUP] 🔵 Debug Step 1: Navigate to next mission');
		console.log('[POPUP] Using filters:', {
			stars: filters.stars,
			minLevel: filters.minLevel,
			maxLevel: filters.maxLevel,
		});
		chrome.runtime.sendMessage(
			{
				type: 'NAVIGATE_TO_MISSION',
				filters: filters,
			},
			(response) => {
				if (chrome.runtime.lastError) {
					console.error('[POPUP] ❌ Error:', chrome.runtime.lastError.message);
				} else if (response?.error) {
					console.error('[POPUP] ❌ Error:', response.error);
				} else if (response?.success) {
					console.log('[POPUP] ✅', response.message || 'Navigating to next mission');
				}
			},
		);
	};

	// Debug Step 2: Open devvit iframe (start mission)
	const handleOpenIframe = () => {
		console.log('[POPUP] 🔵 Debug Step 2: Open iframe');
		chrome.runtime.sendMessage(
			{
				type: 'OPEN_MISSION_IFRAME',
			},
			(response) => {
				if (chrome.runtime.lastError) {
					console.error('[POPUP] ❌ Error:', chrome.runtime.lastError.message);
				} else if (response?.error) {
					console.error('[POPUP] ❌ Error:', response.error);
				} else if (response?.success) {
					console.log('[POPUP] ✅', response.message || 'Iframe opened');
				}
			},
		);
	};

	// Debug Step 3: Auto play opened mission
	const handleAutoPlay = () => {
		console.log('[POPUP] 🔵 Debug Step 3: Auto play mission');
		console.log('[POPUP] 📤 Sending START_MISSION_AUTOMATION via background...');

		chrome.runtime.sendMessage(
			{
				type: 'START_MISSION_AUTOMATION',
				config: { ...automationConfig, enabled: true },
			},
			(response) => {
				if (chrome.runtime.lastError) {
					console.error('[POPUP] ❌ Error:', chrome.runtime.lastError.message);
				} else {
					console.log('[POPUP] ✅ Message sent, response:', response);
				}
			},
		);
	};

	const handleStopAutomation = () => {
		console.log('[POPUP] ⏹️ Stopping automation');
		chrome.runtime.sendMessage({
			type: 'STOP_MISSION_AUTOMATION',
		});
	};

	return (
		<div className="popup-container">
			<header className="popup-header">
				<h1>LazyFrog</h1>
				<p className="subtitle" title={`Build: ${getBuildTimestamp()}`}>
					v{VERSION} • Built {buildAge}
				</p>
				<p className="author">
					Made by{' '}
					<a href="https://www.reddit.com/user/AKJ90" target="_blank" rel="noopener noreferrer">
						u/AKJ90
					</a>
					{/* TODO: Add github sponsor page link */}-{' '}
					<a href="https://github.com/Saturate" target="_blank" rel="noopener noreferrer">
						Donate
					</a>
				</p>
			</header>

			{/* Tab Navigation */}
			<div className="tabs">
				<button
					className={`tab ${currentTab === 'control' ? 'active' : ''}`}
					onClick={() => setCurrentTab('control')}
				>
					<Gamepad2 size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
					Control
				</button>
				<button
					className={`tab ${currentTab === 'missions' ? 'active' : ''}`}
					onClick={() => setCurrentTab('missions')}
				>
					<FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
					Missions ({missionStats.uncleared}/{missionStats.total})
				</button>
				<button
					className={`tab ${currentTab === 'options' ? 'active' : ''}`}
					onClick={() => setCurrentTab('options')}
				>
					<Settings size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
					Options
				</button>
			</div>

			{/* Control Tab */}
			{currentTab === 'control' && (
				<>
					{/* Debug Controls - only shown when debug mode is enabled */}
					{automationConfig.debugMode && (
						<div className="section">
							<h3>🐛 Debug Controls</h3>
							<p className="help-text" style={{ marginBottom: '12px' }}>
								Test each automation step individually:
							</p>

							<button
								className="btn btn-outline"
								onClick={handleNavigateToMission}
								style={{ marginBottom: '8px' }}
							>
								1. Navigate to Next Mission
							</button>

							<button
								className="btn btn-outline"
								onClick={handleOpenIframe}
								style={{ marginBottom: '8px' }}
							>
								2. Open Dialog (Start Mission)
							</button>

							<button
								className="btn btn-outline"
								onClick={handleAutoPlay}
								style={{ marginBottom: '8px' }}
							>
								3. Auto Play Opened Mission
							</button>

							<button className="btn btn-secondary" onClick={handleStopAutomation}>
								Stop Automation
							</button>
						</div>
					)}

					<div className="status">
						<div className={`status-indicator ${isRunning ? 'running' : ''}`}>
							<span className="dot"></span>
							<span>{statusText}</span>
						</div>
					</div>

					<div className="section">
						<h3>Automation Bot</h3>
						<p className="help-text">Configure filters for which missions the bot should play:</p>

						<h4
							style={{
								fontSize: '14px',
								marginBottom: '10px',
								marginTop: '15px',
							}}
						>
							Mission Filters
						</h4>

						<div className="form-group">
							<label>Star Difficulty:</label>
							<div
								style={{
									display: 'flex',
									gap: '12px',
									flexWrap: 'wrap',
									marginTop: '8px',
								}}
							>
								{[1, 2, 3, 4, 5].map((star) => (
									<label
										key={star}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '6px',
											cursor: 'pointer',
										}}
									>
										<input
											type="checkbox"
											checked={filters.stars.includes(star)}
											onChange={(e) => {
												const newStars = e.target.checked
													? [...filters.stars, star]
													: filters.stars.filter((s) => s !== star);
												updateFilter('stars', newStars.sort());
											}}
											disabled={isRunning}
										/>
										<span style={{ fontSize: '14px' }}>{'★'.repeat(star)}</span>
									</label>
								))}
							</div>
						</div>

						<div style={{ display: 'flex', gap: '12px' }}>
							<div className="form-group" style={{ flex: 1 }}>
								<label htmlFor="minLevel">Min Level:</label>
								<input
									type="number"
									id="minLevel"
									value={filters.minLevel}
									onChange={(e) => updateFilter('minLevel', parseInt(e.target.value) || 1)}
									disabled={isRunning}
									min="1"
								/>
							</div>

							<div className="form-group" style={{ flex: 1 }}>
								<label htmlFor="maxLevel">Max Level:</label>
								<input
									type="number"
									id="maxLevel"
									value={filters.maxLevel}
									onChange={(e) => updateFilter('maxLevel', parseInt(e.target.value) || 340)}
									disabled={isRunning}
									min="1"
								/>
							</div>
						</div>

						<div className="button-group" style={{ marginTop: '15px' }}>
							<button className="btn btn-primary" onClick={handleStart} disabled={isRunning}>
								<Play size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
								Start Bot{' '}
								{(() => {
									const matchingMissions = missions.filter((m) => {
										if (m.cleared) return false;
										if ((m.difficulty ?? 0) === 0) return false;
										if (!filters.stars.includes(m.difficulty || 0)) return false;
										if (m.minLevel && m.minLevel < filters.minLevel) return false;
										if (m.maxLevel && m.maxLevel > filters.maxLevel) return false;
										return true;
									});
									return `(${matchingMissions.length})`;
								})()}
							</button>
							<button className="btn btn-secondary" onClick={handleStop} disabled={!isRunning}>
								⏹️ Stop Bot
							</button>
						</div>
					</div>

					{showResults && (
						<div className="section">
							<h3>Results</h3>
							<div className="results-content">
								{levels.length === 0 ? (
									<p>No levels found matching the filters.</p>
								) : (
									<>
										<p>
											<strong>{levels.length} level(s) found</strong>
										</p>
										{levels.slice(0, 5).map((level, index) => (
											<div key={index} className="result-item">
												<strong>{level.title}</strong>
												<br />
												<small>
													{level.stars > 0 && `${'★'.repeat(level.stars)}`}
													{level.levelRange && ` | ${level.levelRange}`}
													{level.levelNumber && ` | Level ${level.levelNumber}`}
													{level.cleared && ' | ✓ Cleared'}
												</small>
											</div>
										))}
										{levels.length > 5 && <p className="more">...and {levels.length - 5} more</p>}
									</>
								)}
							</div>
						</div>
					)}

					<div className="section">
						<h3>
							<Target size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
							Next 5 Missions
						</h3>
						<p className="help-text">
							These are the next missions the bot will play when you press Start:
						</p>
						{missions.length === 0 ? (
							<p className="help-text">
								No missions scanned yet. Play some missions to populate the database!
							</p>
						) : filteredMissions.length === 0 ? (
							<p className="help-text">
								No uncleared missions match your current filters. Try adjusting star difficulty or
								level range.
							</p>
						) : (
							<div style={{ maxHeight: '400px', overflowY: 'auto' }}>
								{filteredMissions.slice(0, 5).map((mission, index) => (
									<div
										key={mission.postId}
										style={{
											padding: '12px',
											marginBottom: '8px',
											background: 'rgba(33, 150, 243, 0.05)',
											border: '1px solid #2196F3',
											borderRadius: '8px',
											cursor: 'pointer',
										}}
										onClick={() => {
											if (mission.permalink) {
												chrome.tabs.update({ url: mission.permalink });
											}
										}}
									>
										<div
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'start',
												marginBottom: '8px',
											}}
										>
											<div style={{ flex: 1 }}>
												<div
													style={{
														fontSize: '12px',
														fontWeight: 'bold',
														color: '#2196F3',
														marginBottom: '4px',
													}}
												>
													#{index + 1} in Queue
												</div>
												<div style={{ fontSize: '11px', color: '#999' }}>
													Scanned: {new Date(mission.timestamp).toLocaleString()}
												</div>
											</div>
										</div>
										<div
											style={{
												fontSize: '13px',
												marginBottom: '4px',
												fontWeight: 500,
											}}
										>
											{mission.tags || mission.foodName || mission.postId}
										</div>
										<div
											style={{
												fontSize: '11px',
												color: '#666',
												display: 'flex',
												alignItems: 'center',
												gap: '4px',
											}}
										>
											{mission.difficulty ? (
												<>
													{Array.from({ length: mission.difficulty }).map((_, i) => (
														<Star key={i} size={10} fill="#fbbf24" color="#fbbf24" />
													))}
												</>
											) : (
												'No difficulty'
											)}
											{mission.minLevel && mission.maxLevel
												? ` | Lvl ${mission.minLevel}-${mission.maxLevel}`
												: ''}
											{mission.environment ? ` | ${mission.environment}` : ''}
											{mission.username ? ` | by ${mission.username}` : ''}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</>
			)}

			{/* Missions Tab */}
			{currentTab === 'missions' && (
				<>
					<div className="section">
						<h3>
							<BarChart3 size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
							Mission Stats
						</h3>
						<div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
							<div
								style={{
									flex: 1,
									padding: '12px',
									background: 'rgba(255, 69, 0, 0.1)',
									borderRadius: '8px',
								}}
							>
								<div
									style={{
										fontSize: '24px',
										fontWeight: 'bold',
										color: '#FF4500',
									}}
								>
									{missionStats.total}
								</div>
								<div style={{ fontSize: '12px', color: '#666' }}>Total Scanned</div>
							</div>
							<div
								style={{
									flex: 1,
									padding: '12px',
									background: 'rgba(0, 200, 0, 0.1)',
									borderRadius: '8px',
								}}
							>
								<div
									style={{
										fontSize: '24px',
										fontWeight: 'bold',
										color: '#00c800',
									}}
								>
									{missionStats.cleared}
								</div>
								<div style={{ fontSize: '12px', color: '#666' }}>Cleared</div>
							</div>
							<div
								style={{
									flex: 1,
									padding: '12px',
									background: 'rgba(255, 165, 0, 0.1)',
									borderRadius: '8px',
								}}
							>
								<div
									style={{
										fontSize: '24px',
										fontWeight: 'bold',
										color: '#ffa500',
									}}
								>
									{missionStats.uncleared}
								</div>
								<div style={{ fontSize: '12px', color: '#666' }}>Remaining</div>
							</div>
						</div>
						<button
							className="btn btn-primary"
							onClick={() =>
								chrome.tabs.create({
									url: chrome.runtime.getURL('missions.html'),
								})
							}
							style={{ width: '100%', marginBottom: '8px' }}
						>
							📋 Open Mission Manager
						</button>
					</div>

					<div className="section">
						<h3>Mission Scanner</h3>
						<p className="help-text">
							Scanner runs automatically as you scroll Reddit. All missions are saved to the
							database.
						</p>
						<button className="btn btn-outline" onClick={handleScan} style={{ width: '100%' }}>
							🔍 Force Scan Current Page
						</button>
					</div>
				</>
			)}

			{/* Options Tab */}
			{currentTab === 'options' && (
				<>
					<div className="section">
						<h3>Ability Tier List</h3>
						<p className="help-text">
							Drag to reorder. Abilities will be selected in this order of preference. All abilities
							discovered from mission metadata are shown below:
						</p>
						{automationConfig.abilityTierList.length === 0 ? (
							<p
								className="help-text"
								style={{
									marginTop: '12px',
									fontStyle: 'italic',
									color: '#999',
								}}
							>
								No abilities discovered yet. Play missions or scan Reddit to discover abilities!
							</p>
						) : (
							<div className="tier-list">
								{automationConfig.abilityTierList.map((ability, index) => (
									<div
										key={index}
										className="tier-item"
										draggable
										onDragStart={(e) => handleDragStart(e, index)}
										onDragOver={handleDragOver}
										onDrop={(e) => handleDrop(e, index)}
									>
										<span className="tier-drag-handle">⋮⋮</span>
										<span className="tier-rank">{index + 1}</span>
										<span className="tier-name">{ability}</span>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="section">
						<h3>Blessing Stat Priority</h3>
						<p className="help-text">
							Drag to reorder. Stats will be prioritized in this order when choosing blessings. All
							stats discovered from mission metadata are shown below:
						</p>
						{automationConfig.blessingStatPriority.length === 0 ? (
							<p
								className="help-text"
								style={{
									marginTop: '12px',
									fontStyle: 'italic',
									color: '#999',
								}}
							>
								No blessing stats discovered yet. Play missions or scan Reddit to discover stats!
							</p>
						) : (
							<div className="tier-list">
								{automationConfig.blessingStatPriority.map((stat, index) => (
									<div
										key={index}
										className="tier-item"
										draggable
										onDragStart={(e) => {
											e.dataTransfer.effectAllowed = 'move';
											e.dataTransfer.setData('text/plain', index.toString());
										}}
										onDragOver={handleDragOver}
										onDrop={(e) => {
											e.preventDefault();
											const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
											const dropIndex = index;

											if (dragIndex === dropIndex) return;

											const newPriority = [...automationConfig.blessingStatPriority];
											const [draggedItem] = newPriority.splice(dragIndex, 1);
											newPriority.splice(dropIndex, 0, draggedItem);

											updateAutomationConfig('blessingStatPriority', newPriority);
										}}
									>
										<span className="tier-drag-handle">⋮⋮</span>
										<span className="tier-rank">{index + 1}</span>
										<span className="tier-name">{stat}</span>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="section">
						<h3>Skill Bargain Strategy</h3>
						<div className="form-group">
							<label htmlFor="skillBargainStrategy">When to accept skill bargains:</label>
							<select
								id="skillBargainStrategy"
								value={automationConfig.skillBargainStrategy}
								onChange={(e) => updateAutomationConfig('skillBargainStrategy', e.target.value)}
							>
								<option value="always">Always Accept</option>
								<option value="positive-only">Accept if Positive &gt; Negative</option>
								<option value="never">Never Accept</option>
							</select>
						</div>
					</div>

					<div className="section">
						<h3>Crossroads Strategy</h3>
						<div className="form-group">
							<label htmlFor="crossroadsStrategy">
								What to do at miniboss encounters (crossroads):
							</label>
							<select
								id="crossroadsStrategy"
								value={automationConfig.crossroadsStrategy}
								onChange={(e) =>
									updateAutomationConfig('crossroadsStrategy', e.target.value as 'fight' | 'skip')
								}
							>
								<option value="fight">Fight Miniboss</option>
								<option value="skip">Skip Miniboss</option>
							</select>
						</div>
					</div>

					<div className="section">
						<h3>Debug Settings</h3>
						<div className="form-group checkbox">
							<label>
								<input
									type="checkbox"
									checked={automationConfig.debugMode}
									onChange={(e) => updateAutomationConfig('debugMode', e.target.checked)}
								/>
								Enable Debug Mode
							</label>
							<p className="help-text" style={{ marginTop: '8px', marginLeft: '24px' }}>
								Shows debug controls in the Control tab for step-by-step testing
							</p>
						</div>

						<div className="form-group checkbox" style={{ marginTop: '16px' }}>
							<label>
								<input
									type="checkbox"
									checked={automationConfig.remoteLogging}
									onChange={(e) => updateAutomationConfig('remoteLogging', e.target.checked)}
								/>
								Enable Remote Logging
							</label>
							<p className="help-text" style={{ marginTop: '8px', marginLeft: '24px' }}>
								Sends logs to http://localhost:7856/log for debugging and AI integration
							</p>
						</div>

						<div style={{ marginTop: '16px' }}>
							<button
								className="btn btn-secondary"
								onClick={async () => {
									if (
										confirm(
											'Are you sure you want to clear ALL missions from the database? This cannot be undone.',
										)
									) {
										const { clearAllMissions } = await import('../utils/storage');
										await clearAllMissions();
										await loadMissions();
										alert('All missions cleared!');
									}
								}}
								style={{ width: '100%' }}
							>
								🗑️ Clear All Missions
							</button>
						</div>
					</div>
				</>
			)}

			<footer>
				<p className="small">
					Navigate to{' '}
					<a href="https://www.reddit.com/r/SwordAndSupperGame/" target="_blank" rel="noreferrer">
						r/SwordAndSupperGame
					</a>{' '}
					to use the bot
				</p>
			</footer>
		</div>
	);
};

export default PopupApp;

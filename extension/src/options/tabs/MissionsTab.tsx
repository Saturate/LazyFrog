/**
 * Missions Tab - Mission history viewer
 * Full implementation with filtering, sorting, and export
 */

import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, RefreshCw, Check, Star, Download, Search, X, Upload } from 'lucide-react';
import { getAllMissions, importMissions } from '../../lib/storage/missions';
import { MissionRecord } from '../../lib/storage/types';
import { generateMissionMarkdown } from '../../utils/missionMarkdown';

interface SortConfig {
	field: 'timestamp' | 'difficulty' | 'minLevel' | 'foodName' | 'username';
	direction: 'asc' | 'desc';
}

const MissionsTab: React.FC = () => {
	const [missions, setMissions] = useState<MissionRecord[]>([]);
	const [filteredMissions, setFilteredMissions] = useState<MissionRecord[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Load filter state from localStorage
	const [searchQuery, setSearchQuery] = useState(() => {
		return localStorage.getItem('missionsTab.searchQuery') || '';
	});
	const [showCompleted, setShowCompleted] = useState(() => {
		const saved = localStorage.getItem('missionsTab.showCompleted');
		return saved !== null ? JSON.parse(saved) : true;
	});
	const [showUncompleted, setShowUncompleted] = useState(() => {
		const saved = localStorage.getItem('missionsTab.showUncompleted');
		return saved !== null ? JSON.parse(saved) : true;
	});
	const [difficultyFilter, setDifficultyFilter] = useState<number[]>(() => {
		const saved = localStorage.getItem('missionsTab.difficultyFilter');
		return saved ? JSON.parse(saved) : [1, 2, 3, 4, 5];
	});
	const [showMiniboss, setShowMiniboss] = useState<boolean | null>(() => {
		const saved = localStorage.getItem('missionsTab.showMiniboss');
		return saved !== null ? JSON.parse(saved) : null;
	});
	const [minLevelFilter, setMinLevelFilter] = useState<number>(() => {
		const saved = localStorage.getItem('missionsTab.minLevelFilter');
		return saved !== null ? parseInt(saved) : 1;
	});
	const [maxLevelFilter, setMaxLevelFilter] = useState<number>(() => {
		const saved = localStorage.getItem('missionsTab.maxLevelFilter');
		return saved !== null ? parseInt(saved) : 340;
	});
	const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
		const saved = localStorage.getItem('missionsTab.sortConfig');
		return saved ? JSON.parse(saved) : { field: 'timestamp', direction: 'desc' };
	});
	const [stats, setStats] = useState({
		total: 0,
		cleared: 0,
		uncleared: 0,
		byDifficulty: {} as Record<number, number>,
	});

	// Load missions
	useEffect(() => {
		loadMissions();
	}, []);

	// Save filters to localStorage when they change
	useEffect(() => {
		localStorage.setItem('missionsTab.searchQuery', searchQuery);
	}, [searchQuery]);

	useEffect(() => {
		localStorage.setItem('missionsTab.showCompleted', JSON.stringify(showCompleted));
	}, [showCompleted]);

	useEffect(() => {
		localStorage.setItem('missionsTab.showUncompleted', JSON.stringify(showUncompleted));
	}, [showUncompleted]);

	useEffect(() => {
		localStorage.setItem('missionsTab.difficultyFilter', JSON.stringify(difficultyFilter));
	}, [difficultyFilter]);

	useEffect(() => {
		localStorage.setItem('missionsTab.showMiniboss', JSON.stringify(showMiniboss));
	}, [showMiniboss]);

	useEffect(() => {
		localStorage.setItem('missionsTab.minLevelFilter', minLevelFilter.toString());
	}, [minLevelFilter]);

	useEffect(() => {
		localStorage.setItem('missionsTab.maxLevelFilter', maxLevelFilter.toString());
	}, [maxLevelFilter]);

	useEffect(() => {
		localStorage.setItem('missionsTab.sortConfig', JSON.stringify(sortConfig));
	}, [sortConfig]);

	// Filter and sort missions when data or filters change
	useEffect(() => {
		let filtered = missions;

		// Filter by cleared status
		if (!showCompleted) {
			filtered = filtered.filter((m) => !m.cleared);
		}
		if (!showUncompleted) {
			filtered = filtered.filter((m) => m.cleared);
		}

		// Filter by difficulty
		filtered = filtered.filter((m) => {
			const diff = m.difficulty || 0;
			return diff === 0 || difficultyFilter.includes(diff);
		});

		// Filter by miniboss presence
		if (showMiniboss !== null) {
			filtered = filtered.filter((m) => {
				const hasMiniboss = m.environment?.toLowerCase().includes('miniboss');
				return hasMiniboss === showMiniboss;
			});
		}

		// Filter by level range
		filtered = filtered.filter((m) => {
			if (m.minLevel !== undefined && m.minLevel < minLevelFilter) {
				return false;
			}
			if (m.maxLevel !== undefined && m.maxLevel > maxLevelFilter) {
				return false;
			}
			return true;
		});

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter((m) => {
				return (
					m.foodName?.toLowerCase().includes(query) ||
					m.username?.toLowerCase().includes(query) ||
					m.environment?.toLowerCase().includes(query) ||
					m.postId?.toLowerCase().includes(query)
				);
			});
		}

		// Sort
		filtered.sort((a, b) => {
			let aVal: any;
			let bVal: any;

			switch (sortConfig.field) {
				case 'timestamp':
					aVal = a.timestamp || 0;
					bVal = b.timestamp || 0;
					break;
				case 'difficulty':
					aVal = a.difficulty || 0;
					bVal = b.difficulty || 0;
					break;
				case 'minLevel':
					aVal = a.minLevel || 0;
					bVal = b.minLevel || 0;
					break;
				case 'foodName':
					aVal = a.foodName || '';
					bVal = b.foodName || '';
					break;
				case 'username':
					aVal = a.username || '';
					bVal = b.username || '';
					break;
				default:
					aVal = a.timestamp || 0;
					bVal = b.timestamp || 0;
			}

			if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
			return 0;
		});

		setFilteredMissions(filtered);
	}, [
		missions,
		showCompleted,
		showUncompleted,
		difficultyFilter,
		showMiniboss,
		minLevelFilter,
		maxLevelFilter,
		searchQuery,
		sortConfig,
	]);

	// Calculate stats when missions change
	useEffect(() => {
		const cleared = missions.filter((m) => m.cleared).length;
		const byDifficulty: Record<number, number> = {};

		missions.forEach((m) => {
			const diff = m.difficulty || 0;
			byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;
		});

		setStats({
			total: missions.length,
			cleared,
			uncleared: missions.length - cleared,
			byDifficulty,
		});
	}, [missions]);

	const loadMissions = async () => {
		const allMissions = await getAllMissions();
		const missionArray = Object.values(allMissions);
		setMissions(missionArray);
	};

	const handleImport = () => {
		fileInputRef.current?.click();
	};

	const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const stats = await importMissions(text, 'merge');

			let message = `Import completed!\n\nImported: ${stats.imported}\nSkipped (duplicates): ${stats.skipped}`;

			if (stats.errors.length > 0) {
				message += `\n\nErrors:\n${stats.errors.slice(0, 5).join('\n')}`;
				if (stats.errors.length > 5) {
					message += `\n... and ${stats.errors.length - 5} more`;
				}
			}

			alert(message);
			await loadMissions();

			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		} catch (err) {
			alert(`Failed to import missions: ${err}`);
		}
	};

	const handleExport = () => {
		// Generate markdown for all missions
		let markdown = `# Sword & Supper Missions Export\n\n`;
		markdown += `Generated: ${new Date().toLocaleDateString()}\n\n`;
		markdown += `Total Missions: ${missions.length}\n`;
		markdown += `Cleared: ${stats.cleared}\n`;
		markdown += `Uncleared: ${stats.uncleared}\n\n`;
		markdown += `---\n\n`;

		// Add each mission
		missions.forEach((mission) => {
			const missionMarkdown = generateMissionMarkdown(mission);
			if (missionMarkdown) {
				markdown += missionMarkdown + '\n\n';
			} else {
				// Fallback for missions without full metadata
				markdown += `### ${mission.foodName || 'Unknown Mission'}\n`;
				markdown += `**Status:** ${mission.cleared ? 'Cleared' : 'Pending'}\n`;
				markdown += `**Difficulty:** ${'⭐'.repeat(mission.difficulty || 0)}\n`;
				markdown += `**Level:** ${mission.minLevel}-${mission.maxLevel}\n`;
				markdown += `**Environment:** ${mission.environment || 'Unknown'}\n`;
				markdown += `**Link:** ${mission.permalink}\n\n`;
			}
		});

		const blob = new Blob([markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `missions-${Date.now()}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleSort = (field: SortConfig['field']) => {
		setSortConfig((prev) => ({
			field,
			direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
		}));
	};

	const toggleDifficulty = (diff: number) => {
		setDifficultyFilter((prev) => {
			if (prev.includes(diff)) {
				return prev.filter((d) => d !== diff);
			} else {
				return [...prev, diff].sort();
			}
		});
	};

	return (
		<div>
			{/* Statistics Cards */}
			<div className="grid-3" style={{ marginBottom: '24px' }}>
				<div
					className="card"
					style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}
				>
					<BarChart3 size={32} style={{ color: '#3b82f6' }} />
					<div>
						<div style={{ fontSize: '28px', fontWeight: '700', color: '#e5e5e5', lineHeight: '1' }}>
							{stats.total}
						</div>
						<div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '4px' }}>
							Total Missions
						</div>
					</div>
				</div>
				<div
					className="card"
					style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}
				>
					<Check size={32} style={{ color: '#22c55e' }} />
					<div>
						<div style={{ fontSize: '28px', fontWeight: '700', color: '#e5e5e5', lineHeight: '1' }}>
							{stats.cleared}
						</div>
						<div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '4px' }}>Cleared</div>
					</div>
				</div>
				<div
					className="card"
					style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}
				>
					<Star size={32} style={{ color: '#eab308' }} />
					<div>
						<div style={{ fontSize: '28px', fontWeight: '700', color: '#e5e5e5', lineHeight: '1' }}>
							{stats.uncleared}
						</div>
						<div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '4px' }}>Uncleared</div>
					</div>
				</div>
			</div>

			{/* Filters & Actions */}
			<div className="card" style={{ marginBottom: '24px' }}>
				<div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
					{/* Search */}
					<div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
						<Search
							size={16}
							style={{
								position: 'absolute',
								left: '12px',
								top: '50%',
								transform: 'translateY(-50%)',
								color: '#71717a',
							}}
						/>
						<input
							type="text"
							placeholder="Search missions..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={{
								width: '100%',
								padding: '10px 12px 10px 36px',
								background: '#0a0a0a',
								border: '1px solid #1a1a1a',
								borderRadius: '8px',
								color: '#e5e5e5',
								fontSize: '14px',
							}}
						/>
						{searchQuery && (
							<button
								onClick={() => setSearchQuery('')}
								style={{
									position: 'absolute',
									right: '8px',
									top: '50%',
									transform: 'translateY(-50%)',
									background: 'transparent',
									border: 'none',
									color: '#71717a',
									cursor: 'pointer',
									padding: '4px',
									display: 'flex',
									alignItems: 'center',
								}}
							>
								<X size={16} />
							</button>
						)}
					</div>

					{/* Action buttons */}
					<button
						onClick={loadMissions}
						className="button"
						style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					>
						<RefreshCw size={16} />
						Refresh
					</button>
					<button
						onClick={handleImport}
						className="button"
						style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					>
						<Upload size={16} />
						Import
					</button>
					<button
						onClick={handleExport}
						className="button"
						style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					>
						<Download size={16} />
						Export
					</button>

					{/* Hidden file input */}
					<input
						ref={fileInputRef}
						type="file"
						accept=".json,application/json"
						onChange={handleFileSelect}
						style={{ display: 'none' }}
					/>
				</div>

				{/* Filters */}
				<div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
					<label
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							color: '#a1a1aa',
							fontSize: '14px',
							cursor: 'pointer',
						}}
					>
						<input
							type="checkbox"
							checked={showCompleted}
							onChange={(e) => setShowCompleted(e.target.checked)}
							style={{ cursor: 'pointer' }}
						/>
						Completed
					</label>
					<label
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							color: '#a1a1aa',
							fontSize: '14px',
							cursor: 'pointer',
						}}
					>
						<input
							type="checkbox"
							checked={showUncompleted}
							onChange={(e) => setShowUncompleted(e.target.checked)}
							style={{ cursor: 'pointer' }}
						/>
						Uncompleted
					</label>

					<div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
						{[1, 2, 3, 4, 5].map((diff) => (
							<button
								key={diff}
								onClick={() => toggleDifficulty(diff)}
								style={{
									padding: '6px 12px',
									background: difficultyFilter.includes(diff) ? '#3b82f6' : '#0a0a0a',
									border: difficultyFilter.includes(diff)
										? '1px solid #3b82f6'
										: '1px solid #1a1a1a',
									borderRadius: '6px',
									color: difficultyFilter.includes(diff) ? '#fff' : '#a1a1aa',
									fontSize: '13px',
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									gap: '4px',
									fontWeight: '500',
									transition: 'all 0.2s',
								}}
							>
								<Star size={14} />
								{diff}
							</button>
						))}
					</div>

					<select
						value={showMiniboss === null ? 'all' : showMiniboss ? 'yes' : 'no'}
						onChange={(e) => {
							const val = e.target.value;
							setShowMiniboss(val === 'all' ? null : val === 'yes');
						}}
						style={{
							padding: '8px 12px',
							background: '#0a0a0a',
							border: '1px solid #1a1a1a',
							borderRadius: '6px',
							color: '#e5e5e5',
							fontSize: '14px',
							cursor: 'pointer',
						}}
					>
						<option value="all">All Environments</option>
						<option value="yes">Miniboss Only</option>
						<option value="no">No Miniboss</option>
					</select>

					<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
						<label style={{ fontSize: '14px', color: '#a1a1aa' }}>Min Level:</label>
						<input
							type="number"
							min="1"
							max="340"
							value={minLevelFilter}
							onChange={(e) => setMinLevelFilter(parseInt(e.target.value) || 1)}
							style={{
								width: '70px',
								padding: '6px 8px',
								background: '#0a0a0a',
								border: '1px solid #1a1a1a',
								borderRadius: '6px',
								color: '#e5e5e5',
								fontSize: '14px',
							}}
						/>
					</div>

					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<label style={{ fontSize: '14px', color: '#a1a1aa' }}>Max Level:</label>
						<input
							type="number"
							min="1"
							max="340"
							value={maxLevelFilter}
							onChange={(e) => setMaxLevelFilter(parseInt(e.target.value) || 340)}
							style={{
								width: '70px',
								padding: '6px 8px',
								background: '#0a0a0a',
								border: '1px solid #1a1a1a',
								borderRadius: '6px',
								color: '#e5e5e5',
								fontSize: '14px',
							}}
						/>
					</div>
				</div>
			</div>

			{/* Missions Table */}
			<div className="card" style={{ padding: '0', overflow: 'hidden' }}>
				{filteredMissions.length > 0 ? (
					<>
						<div style={{ overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse' }}>
								<thead>
									<tr style={{ borderBottom: '1px solid #1a1a1a' }}>
										<th
											onClick={() => handleSort('timestamp')}
											style={{
												padding: '16px',
												textAlign: 'left',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
												cursor: 'pointer',
												userSelect: 'none',
												background: sortConfig.field === 'timestamp' ? '#171717' : 'transparent',
											}}
										>
											Date{' '}
											{sortConfig.field === 'timestamp' &&
												(sortConfig.direction === 'asc' ? '↑' : '↓')}
										</th>
										<th
											onClick={() => handleSort('foodName')}
											style={{
												padding: '16px',
												textAlign: 'left',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
												cursor: 'pointer',
												userSelect: 'none',
												background: sortConfig.field === 'foodName' ? '#171717' : 'transparent',
											}}
										>
											Mission{' '}
											{sortConfig.field === 'foodName' &&
												(sortConfig.direction === 'asc' ? '↑' : '↓')}
										</th>
										<th
											onClick={() => handleSort('difficulty')}
											style={{
												padding: '16px',
												textAlign: 'left',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
												cursor: 'pointer',
												userSelect: 'none',
												background: sortConfig.field === 'difficulty' ? '#171717' : 'transparent',
											}}
										>
											Difficulty{' '}
											{sortConfig.field === 'difficulty' &&
												(sortConfig.direction === 'asc' ? '↑' : '↓')}
										</th>
										<th
											onClick={() => handleSort('minLevel')}
											style={{
												padding: '16px',
												textAlign: 'left',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
												cursor: 'pointer',
												userSelect: 'none',
												background: sortConfig.field === 'minLevel' ? '#171717' : 'transparent',
											}}
										>
											Level{' '}
											{sortConfig.field === 'minLevel' &&
												(sortConfig.direction === 'asc' ? '↑' : '↓')}
										</th>
										<th
											style={{
												padding: '16px',
												textAlign: 'left',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
											}}
										>
											Metadata
										</th>
										<th
											style={{
												padding: '16px',
												textAlign: 'left',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
											}}
										>
											Rewards
										</th>
										<th
											style={{
												padding: '16px',
												textAlign: 'left',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
											}}
										>
											Environment
										</th>
										<th
											onClick={() => handleSort('username')}
											style={{
												padding: '16px',
												textAlign: 'left',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
												cursor: 'pointer',
												userSelect: 'none',
												background: sortConfig.field === 'username' ? '#171717' : 'transparent',
											}}
										>
											Author{' '}
											{sortConfig.field === 'username' &&
												(sortConfig.direction === 'asc' ? '↑' : '↓')}
										</th>
										<th
											style={{
												padding: '16px',
												textAlign: 'left',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
											}}
										>
											Status
										</th>
										<th
											style={{
												padding: '16px',
												textAlign: 'right',
												fontSize: '13px',
												fontWeight: '600',
												color: '#a1a1aa',
											}}
										>
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredMissions.map((mission) => (
										<tr
											key={mission.postId}
											style={{
												borderBottom: '1px solid #1a1a1a',
												opacity: mission.cleared ? 0.6 : 1,
												transition: 'background 0.2s',
											}}
											onMouseEnter={(e) => (e.currentTarget.style.background = '#171717')}
											onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
										>
											<td
												style={{
													padding: '14px 16px',
													fontSize: '13px',
													color: '#a1a1aa',
													whiteSpace: 'nowrap',
												}}
											>
												{new Date(mission.timestamp).toLocaleDateString()}
											</td>
											<td style={{ padding: '14px 16px', fontSize: '14px' }}>
												<a
													href={mission.permalink}
													target="_blank"
													rel="noopener noreferrer"
													style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}
												>
													{mission.foodName || 'Unknown'}
												</a>
											</td>
											<td style={{ padding: '14px 16px', fontSize: '16px', color: '#eab308' }}>
												{mission.difficulty ? (
													'★'.repeat(mission.difficulty)
												) : (
													<span style={{ fontSize: '13px', color: '#71717a' }}>N/A</span>
												)}
											</td>
											<td
												style={{
													padding: '14px 16px',
													fontSize: '13px',
													color: '#e5e5e5',
													fontWeight: '500',
												}}
											>
												{mission.minLevel && mission.maxLevel ? (
													`${mission.minLevel}-${mission.maxLevel}`
												) : (
													<span style={{ color: '#71717a' }}>N/A</span>
												)}
											</td>
											<td style={{ padding: '14px 16px', fontSize: '13px', color: '#a1a1aa' }}>
												{mission.environment || 'N/A'}
											</td>
											<td style={{ padding: '14px 16px', textAlign: 'center' }}>
												{mission.metadata?.mission?.encounters ? (
													<span
														title={`${mission.metadata.mission.encounters.length} encounters`}
														style={{ cursor: 'help' }}
													>
														<Check size={16} color="#22c55e" />
													</span>
												) : (
													<span
														title="No metadata - play mission to capture"
														style={{ cursor: 'help', opacity: 0.4 }}
													>
														<BarChart3 size={16} color="#666" />
													</span>
												)}
											</td>
											<td style={{ padding: '14px 16px', textAlign: 'center' }}>
												{mission.totalLoot && mission.totalLoot.length > 0 ? (
													<span
														title={mission.totalLoot
															.map(
																(item) =>
																	`${item.quantity}× ${item.id.replace(/([A-Z])/g, ' $1').trim()}`,
															)
															.join(', ')}
														className="rewards-icon"
													>
														🎁
													</span>
												) : (
													<span title="No rewards captured" className="no-rewards">
														—
													</span>
												)}
											</td>
											<td style={{ padding: '14px 16px', fontSize: '13px', color: '#a1a1aa' }}>
												{mission.username || 'N/A'}
											</td>
											<td style={{ padding: '14px 16px' }}>
												{mission.disabled ? (
													<span className="status-badge disabled">Disabled</span>
												) : mission.cleared ? (
													<span className="status-badge completed">
														<Check size={14} />
														Cleared
													</span>
												) : (
													<span className="status-badge uncompleted">Pending</span>
												)}
											</td>
											<td
												style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}
											>
												<button
													className="button btn-action"
													onClick={async () => {
														const { generateMissionMarkdown } = await import(
															'../../utils/missionMarkdown'
														);
														const md = generateMissionMarkdown(mission);
														if (md) {
															await navigator.clipboard.writeText(md);
															alert('Mission markdown copied to clipboard');
														} else {
															alert(
																'No metadata available for this mission. Play it once to capture metadata.',
															);
														}
													}}
												>
													Copy Markdown
												</button>
												<button
													className="button"
													onClick={async () => {
														const { setMissionDisabled } = await import('../../utils/storage');
														await setMissionDisabled(mission.postId, !mission.disabled);
														setMissions((prev) =>
															prev.map((m) =>
																m.postId === mission.postId ? { ...m, disabled: !m.disabled } : m,
															),
														);
													}}
												>
													{mission.disabled ? 'Enable' : 'Disable'}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div
							style={{
								padding: '16px',
								borderTop: '1px solid #1a1a1a',
								fontSize: '14px',
								color: '#71717a',
							}}
						>
							Showing {filteredMissions.length} of {missions.length} missions
						</div>
					</>
				) : (
					<div style={{ textAlign: 'center', padding: '60px 20px', color: '#71717a' }}>
						<BarChart3 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
						<p style={{ margin: 0, fontSize: '16px' }}>No missions found</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default MissionsTab;

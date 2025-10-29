import React from 'react';
import { ChevronDown, ChevronRight, List, Star } from 'lucide-react';
import { MissionRecord } from '../../lib/storage/types';

interface NextMissionsProps {
	nextMissions: MissionRecord[];
	showSection: boolean;
	onToggle: () => void;
}

export const NextMissions: React.FC<NextMissionsProps> = ({
	nextMissions,
	showSection,
	onToggle,
}) => {
	return (
		<div className="collapsible-section">
			<div className="section-header" onClick={onToggle}>
				{showSection ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
				<List size={14} />
				<span>Mission Queue</span>
			</div>
			{showSection && (
				<div className="section-content">
					{nextMissions.length === 0 ? (
						<p style={{ color: '#a1a1aa', fontSize: '13px', padding: '8px 0' }}>
							No missions match your current filters
						</p>
					) : (
						<div className="next-missions-list">
							{nextMissions.map((mission, index) => (
								<div key={mission.postId} className="next-mission-item">
									<div className="mission-index">{index + 1}</div>
									<div className="mission-details">
										<div className="mission-title">
											{mission.missionTitle || mission.foodName || 'Unknown Mission'}
										</div>
										<div className="mission-meta">
											<span className="mission-difficulty">
												{Array.from({ length: mission.difficulty || 0 }).map((_, i) => (
													<Star key={i} size={10} fill="#eab308" color="#eab308" />
												))}
											</span>
											<span className="mission-level">
												Lv {mission.minLevel}-{mission.maxLevel}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

import React from 'react';
import { ChevronDown, ChevronRight, Star } from 'lucide-react';

interface MissionFiltersProps {
	filters: {
		stars: number[];
		minLevel: number;
		maxLevel: number;
	};
	isRunning: boolean;
	showSection: boolean;
	onToggle: () => void;
	onToggleStar: (star: number) => void;
	onMinLevelChange: (level: number) => void;
	onMaxLevelChange: (level: number) => void;
}

export const MissionFilters: React.FC<MissionFiltersProps> = ({
	filters,
	isRunning,
	showSection,
	onToggle,
	onToggleStar,
	onMinLevelChange,
	onMaxLevelChange,
}) => {
	return (
		<div className="collapsible-section">
			<div className="section-header" onClick={onToggle}>
				{showSection ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
				<span>Mission Filters</span>
			</div>
			{showSection && (
				<div className="section-content" style={{ padding: '12px 16px' }}>
					<div style={{ marginBottom: '10px' }}>
						<label className="filter-label" style={{ marginBottom: '6px' }}>
							Difficulty:
						</label>
						<div className="star-buttons">
							{[1, 2, 3, 4, 5].map((star) => (
								<button
									key={star}
									className={`star-button ${filters.stars.includes(star) ? 'active' : ''}`}
									onClick={() => onToggleStar(star)}
									disabled={isRunning}
								>
									<Star
										size={10}
										fill={filters.stars.includes(star) ? '#eab308' : 'none'}
										color="#eab308"
									/>
									{star}
								</button>
							))}
						</div>
					</div>
					<div>
						<label className="filter-label" style={{ marginBottom: '6px' }}>
							Level:
						</label>
						<div className="level-inputs">
							<input
								type="number"
								min="1"
								max="340"
								value={filters.minLevel}
								onChange={(e) => onMinLevelChange(parseInt(e.target.value) || 1)}
								disabled={isRunning}
								placeholder="Min"
							/>
							<span>-</span>
							<input
								type="number"
								min="1"
								max="340"
								value={filters.maxLevel}
								onChange={(e) => onMaxLevelChange(parseInt(e.target.value) || 340)}
								disabled={isRunning}
								placeholder="Max"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

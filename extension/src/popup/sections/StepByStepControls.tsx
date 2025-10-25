import React from 'react';
import { ChevronDown, ChevronRight, Bug } from 'lucide-react';

interface StepByStepControlsProps {
	showSection: boolean;
	onToggle: () => void;
	onNavigateToMission: () => void;
	onOpenIframe: () => void;
	onAutoPlay: () => void;
	onStopAutomation: () => void;
}

export const StepByStepControls: React.FC<StepByStepControlsProps> = ({
	showSection,
	onToggle,
	onNavigateToMission,
	onOpenIframe,
	onAutoPlay,
	onStopAutomation,
}) => {
	return (
		<div className="collapsible-section">
			<div className="section-header" onClick={onToggle}>
				{showSection ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
				<Bug size={14} />
				<span>Step-by-Step Controls</span>
			</div>
			{showSection && (
				<div className="section-content">
					<p
						style={{
							fontSize: '12px',
							color: '#a1a1aa',
							marginBottom: '12px',
						}}
					>
						Test each automation step individually:
					</p>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
						<button
							className="debug-button"
							onClick={onNavigateToMission}
							style={{
								width: '100%',
								textAlign: 'left',
								padding: '10px 12px',
							}}
						>
							1. Navigate to Next Mission
						</button>
						<button
							className="debug-button"
							onClick={onOpenIframe}
							style={{
								width: '100%',
								textAlign: 'left',
								padding: '10px 12px',
							}}
						>
							2. Open Dialog (Start Mission)
						</button>
						<button
							className="debug-button"
							onClick={onAutoPlay}
							style={{
								width: '100%',
								textAlign: 'left',
								padding: '10px 12px',
							}}
						>
							3. Auto Play Opened Mission
						</button>
						<button
							className="debug-button"
							onClick={onStopAutomation}
							style={{
								width: '100%',
								textAlign: 'left',
								padding: '10px 12px',
								color: '#ef4444',
							}}
						>
							Stop Automation
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

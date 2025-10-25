import React from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';

interface DebugToolsProps {
	showSection: boolean;
	onToggle: () => void;
	onViewLogs: () => void;
	onTestSelectors: () => void;
	onExportData: () => void;
}

export const DebugTools: React.FC<DebugToolsProps> = ({
	showSection,
	onToggle,
	onViewLogs,
	onTestSelectors,
	onExportData,
}) => {
	return (
		<div className="collapsible-section">
			<div className="section-header" onClick={onToggle}>
				{showSection ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
				<Wrench size={14} />
				<span>Debug Tools</span>
			</div>
			{showSection && (
				<div className="section-content">
					<div className="debug-grid">
						<button className="debug-button" onClick={onViewLogs}>
							View Logs
						</button>
						<button className="debug-button" onClick={onTestSelectors}>
							Test Selectors
						</button>
						<button className="debug-button" onClick={onExportData}>
							Export Data
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

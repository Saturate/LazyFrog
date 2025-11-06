/**
 * Complete Data Backup Card Component
 * Handles exporting and importing all extension data
 */

import React, { useRef } from 'react';
import { Download, Upload } from 'lucide-react';

const CompleteBackupCard: React.FC = () => {
	const allDataFileInputRef = useRef<HTMLInputElement>(null);

	const handleExportAllData = async () => {
		try {
			const { exportAllData } = await import('../../lib/storage/exportAllData');
			const jsonData = await exportAllData();

			// Create blob and download
			const blob = new Blob([jsonData], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `lazyfrog-complete-backup-${Date.now()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			alert(`Failed to export all data: ${error}`);
		}
	};

	const handleImportAllData = () => {
		allDataFileInputRef.current?.click();
	};

	const handleAllDataFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Confirm with user
		const confirmed = confirm(
			'This will replace ALL extension data (missions, settings, progress, etc.) with the backup file. Continue?'
		);
		if (!confirmed) {
			// Reset file input
			if (allDataFileInputRef.current) {
				allDataFileInputRef.current.value = '';
			}
			return;
		}

		try {
			const text = await file.text();
			const { importAllData } = await import('../../lib/storage/exportAllData');
			await importAllData(text);
			alert('All data imported successfully! Please reload the extension for changes to take effect.');
		} catch (error) {
			alert(`Failed to import all data: ${error}`);
		}

		// Reset file input
		if (allDataFileInputRef.current) {
			allDataFileInputRef.current.value = '';
		}
	};

	return (
		<div className="card">
			<h2>
				<Download
					size={20}
					style={{
						display: 'inline-block',
						marginRight: '8px',
						verticalAlign: 'middle',
					}}
				/>
				Complete Data Backup
			</h2>

			<div>
				<p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '12px' }}>
					Export or import ALL extension data including missions, settings, automation config, and user progress. Use this for complete backups.
				</p>
				<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
					<button
						className="button"
						onClick={handleExportAllData}
						style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					>
						<Download size={16} />
						Export All Data
					</button>
					<button
						className="button"
						onClick={handleImportAllData}
						style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					>
						<Upload size={16} />
						Import All Data
					</button>
				</div>
			</div>

			{/* Hidden file input for all data import */}
			<input
				ref={allDataFileInputRef}
				type="file"
				accept=".json,application/json"
				style={{ display: 'none' }}
				onChange={handleAllDataFileSelected}
			/>
		</div>
	);
};

export default CompleteBackupCard;

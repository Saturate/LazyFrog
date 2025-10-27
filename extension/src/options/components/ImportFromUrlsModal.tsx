/**
 * Modal for importing missions from Reddit URLs
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Link, Upload, CheckCircle, AlertCircle, XCircle, AlertTriangle } from 'lucide-react';
import { importFromUrls, ImportFromUrlsResult } from '../../utils/importFromUrls';
import { fetchLevelFromRedditAPI } from '../../utils/redditAPI';

interface ImportFromUrlsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onImportComplete: () => void;
}

const ImportFromUrlsModal: React.FC<ImportFromUrlsModalProps> = ({ isOpen, onClose, onImportComplete }) => {
	const [urls, setUrls] = useState('');
	const [minLevel, setMinLevel] = useState(1);
	const [maxLevel, setMaxLevel] = useState(340);
	const [isImporting, setIsImporting] = useState(false);
	const [importResult, setImportResult] = useState<ImportFromUrlsResult | null>(null);
	const [levelWarning, setLevelWarning] = useState<string | null>(null);
	const [isDetectingLevels, setIsDetectingLevels] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Extract postId from URL
	const extractPostId = (url: string): string | null => {
		try {
			const trimmed = url.trim();
			if (!trimmed) return null;
			if (trimmed.startsWith('http')) {
				const urlObj = new URL(trimmed);
				const match = urlObj.pathname.match(/\/comments\/([a-z0-9]+)/i);
				return match?.[1] || null;
			}
			return null;
		} catch {
			return null;
		}
	};

	// Detect levels from first 3 URLs
	useEffect(() => {
		const detectLevels = async () => {
			if (!urls.trim()) {
				setLevelWarning(null);
				return;
			}

			const urlList = urls.split('\n').filter((u) => u.trim());
			if (urlList.length === 0) {
				setLevelWarning(null);
				return;
			}

			// Sample first 3 URLs
			const samplesToCheck = urlList.slice(0, 3);
			setIsDetectingLevels(true);
			setLevelWarning(null);

			try {
				const levelResults: Array<{ minLevel?: number; maxLevel?: number }> = [];

				for (const url of samplesToCheck) {
					const postId = extractPostId(url);
					if (!postId) continue;

					const levelData = await fetchLevelFromRedditAPI(postId);
					if (levelData && levelData.minLevel !== undefined && levelData.maxLevel !== undefined) {
						levelResults.push(levelData);
					}
				}

				if (levelResults.length > 0) {
					// Check if all have same levels
					const firstMin = levelResults[0].minLevel;
					const firstMax = levelResults[0].maxLevel;
					const allSame = levelResults.every(
						(r) => r.minLevel === firstMin && r.maxLevel === firstMax,
					);

					if (allSame && firstMin !== undefined && firstMax !== undefined) {
						// Auto-fill levels
						setMinLevel(firstMin);
						setMaxLevel(firstMax);
						setLevelWarning(null);
					} else {
						// Mixed levels detected
						setLevelWarning(
							`Mixed level ranges detected in sample URLs. Please verify min/max levels manually.`,
						);
					}
				}
			} catch (error) {
				// Silently fail - user can manually set levels
			} finally {
				setIsDetectingLevels(false);
			}
		};

		// Debounce detection
		const timer = setTimeout(() => {
			detectLevels();
		}, 1000);

		return () => clearTimeout(timer);
	}, [urls]);

	const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			setUrls(text);

			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		} catch (err) {
			alert(`Failed to read file: ${err}`);
		}
	};

	const handleImport = async () => {
		if (!urls.trim()) {
			setImportResult({
				imported: 0,
				skipped: 0,
				failed: 1,
				errors: ['Please enter at least one URL'],
			});
			return;
		}

		if (minLevel < 1 || minLevel > 340 || maxLevel < 1 || maxLevel > 340) {
			setImportResult({
				imported: 0,
				skipped: 0,
				failed: 1,
				errors: ['Levels must be between 1 and 340'],
			});
			return;
		}

		if (minLevel > maxLevel) {
			setImportResult({
				imported: 0,
				skipped: 0,
				failed: 1,
				errors: ['Min level cannot be greater than max level'],
			});
			return;
		}

		setIsImporting(true);
		setImportResult(null);

		try {
			const urlList = urls.split('\n').filter((u) => u.trim());
			const result: ImportFromUrlsResult = await importFromUrls({
				urls: urlList,
				minLevel,
				maxLevel,
			});

			setImportResult(result);
			onImportComplete();
		} catch (err) {
			setImportResult({
				imported: 0,
				skipped: 0,
				failed: 1,
				errors: [`Import failed: ${err}`],
			});
		} finally {
			setIsImporting(false);
		}
	};

	const handleClose = () => {
		// Reset form
		setUrls('');
		setMinLevel(1);
		setMaxLevel(340);
		setImportResult(null);
		setLevelWarning(null);
		onClose();
	};

	// Don't render if modal is closed
	if (!isOpen) return null;

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.8)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000,
			}}
			onClick={onClose}
		>
			<div
				className="card"
				style={{
					maxWidth: '600px',
					width: '90%',
					maxHeight: '80vh',
					overflow: 'auto',
					position: 'relative',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						<Link size={24} style={{ color: '#3b82f6' }} />
						<h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Import from URLs</h2>
					</div>
					<button
						onClick={handleClose}
						style={{
							background: 'transparent',
							border: 'none',
							color: '#71717a',
							cursor: 'pointer',
							padding: '4px',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<X size={20} />
					</button>
				</div>

				{/* Show result or form */}
				{importResult ? (
					<>
						{/* Import Result Summary */}
						<div style={{ marginBottom: '24px' }}>
							<div
								style={{
									background: '#0a0a0a',
									border: '1px solid #1a1a1a',
									borderRadius: '8px',
									padding: '20px',
									marginBottom: '16px',
								}}
							>
								<h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
									Import Summary
								</h3>
								<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
										<CheckCircle size={32} style={{ color: '#22c55e' }} />
										<div>
											<div style={{ fontSize: '20px', fontWeight: '600', color: '#22c55e' }}>
												{importResult.imported}
											</div>
											<div style={{ fontSize: '13px', color: '#a1a1aa' }}>Imported</div>
										</div>
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
										<AlertCircle size={32} style={{ color: '#3b82f6' }} />
										<div>
											<div style={{ fontSize: '20px', fontWeight: '600', color: '#3b82f6' }}>
												{importResult.skipped}
											</div>
											<div style={{ fontSize: '13px', color: '#a1a1aa' }}>Skipped (already exist)</div>
										</div>
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
										<XCircle size={32} style={{ color: '#ef4444' }} />
										<div>
											<div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>
												{importResult.failed}
											</div>
											<div style={{ fontSize: '13px', color: '#a1a1aa' }}>Failed</div>
										</div>
									</div>
								</div>
							</div>

							{/* Errors */}
							{importResult.errors.length > 0 && (
								<div
									style={{
										background: '#1a0a0a',
										border: '1px solid #3a1a1a',
										borderRadius: '8px',
										padding: '12px',
										maxHeight: '200px',
										overflowY: 'auto',
									}}
								>
									<div style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444', marginBottom: '8px' }}>
										Errors ({importResult.errors.length})
									</div>
									<div style={{ fontSize: '12px', color: '#fca5a5', fontFamily: 'monospace' }}>
										{importResult.errors.slice(0, 10).map((error, i) => (
											<div key={i} style={{ marginBottom: '4px' }}>
												{error}
											</div>
										))}
										{importResult.errors.length > 10 && (
											<div style={{ marginTop: '8px', color: '#a1a1aa' }}>
												... and {importResult.errors.length - 10} more
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Close Button */}
						<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
							<button
								onClick={handleClose}
								className="button"
								style={{
									background: '#3b82f6',
									color: '#fff',
									fontWeight: '500',
								}}
							>
								Close
							</button>
						</div>
					</>
				) : (
					<>
						{/* Instructions */}
						<div
							style={{
								background: '#0a0a0a',
								border: '1px solid #1a1a1a',
								borderRadius: '8px',
								padding: '12px',
								marginBottom: '16px',
								fontSize: '13px',
								color: '#a1a1aa',
							}}
						>
							<p style={{ margin: '0 0 8px 0' }}>
								Paste Reddit mission URLs (one per line) or upload a text file. Existing missions will be
								skipped.
							</p>
							<p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>
								Example: https://www.reddit.com/r/SwordAndSupperGame/comments/1og6ocy/...
							</p>
						</div>

						{/* URL Input */}
						<div style={{ marginBottom: '16px' }}>
							<label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
								URLs
							</label>
							<textarea
								value={urls}
								onChange={(e) => setUrls(e.target.value)}
								placeholder="https://www.reddit.com/r/SwordAndSupperGame/comments/1og6ocy/&#10;https://www.reddit.com/r/SwordAndSupperGame/comments/1og6oh2/&#10;..."
								style={{
									width: '100%',
									minHeight: '150px',
									padding: '12px',
									background: '#0a0a0a',
									border: '1px solid #1a1a1a',
									borderRadius: '8px',
									color: '#e5e5e5',
									fontSize: '13px',
									fontFamily: 'monospace',
									resize: 'vertical',
								}}
							/>
							<button
								onClick={() => fileInputRef.current?.click()}
								className="button"
								style={{
									marginTop: '8px',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									fontSize: '13px',
								}}
							>
								<Upload size={14} />
								Choose File (.txt)
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept=".txt,text/plain"
								onChange={handleFileSelect}
								style={{ display: 'none' }}
							/>
						</div>

						{/* Level Detection Status */}
						{isDetectingLevels && (
							<div
								style={{
									background: '#0a0a0a',
									border: '1px solid #1a1a1a',
									borderRadius: '8px',
									padding: '12px',
									marginBottom: '16px',
									fontSize: '13px',
									color: '#a1a1aa',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
							>
								<AlertCircle size={16} style={{ color: '#3b82f6' }} />
								Detecting levels from sample URLs...
							</div>
						)}

						{/* Level Warning */}
						{levelWarning && !isDetectingLevels && (
							<div
								style={{
									background: '#1a0a0a',
									border: '1px solid #eab308',
									borderRadius: '8px',
									padding: '12px',
									marginBottom: '16px',
									fontSize: '13px',
									color: '#fbbf24',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
							>
								<AlertTriangle size={16} />
								{levelWarning}
							</div>
						)}

						{/* Level Inputs */}
						<div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
							<div style={{ flex: 1 }}>
								<label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
									Min Level
								</label>
								<input
									type="number"
									min="1"
									max="340"
									value={minLevel}
									onChange={(e) => setMinLevel(parseInt(e.target.value) || 1)}
									style={{
										width: '100%',
										padding: '10px 12px',
										background: '#0a0a0a',
										border: '1px solid #1a1a1a',
										borderRadius: '8px',
										color: '#e5e5e5',
										fontSize: '14px',
									}}
								/>
							</div>
							<div style={{ flex: 1 }}>
								<label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
									Max Level
								</label>
								<input
									type="number"
									min="1"
									max="340"
									value={maxLevel}
									onChange={(e) => setMaxLevel(parseInt(e.target.value) || 340)}
									style={{
										width: '100%',
										padding: '10px 12px',
										background: '#0a0a0a',
										border: '1px solid #1a1a1a',
										borderRadius: '8px',
										color: '#e5e5e5',
										fontSize: '14px',
									}}
								/>
							</div>
						</div>

						{/* Action Buttons */}
						<div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
							<button onClick={handleClose} className="button" disabled={isImporting}>
								Cancel
							</button>
							<button
								onClick={handleImport}
								className="button"
								disabled={isImporting}
								style={{
									background: '#3b82f6',
									color: '#fff',
									fontWeight: '500',
								}}
							>
								{isImporting ? 'Importing...' : 'Import'}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ImportFromUrlsModal;

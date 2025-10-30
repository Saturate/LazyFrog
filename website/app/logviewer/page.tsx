'use client';

import { useState, useRef } from 'react';
import LogViewer, { type LogEntry } from '@lazyfrog/ui/LogViewer';
import { Upload, FileText, AlertCircle, Bug, BarChart3, X } from 'lucide-react';

export default function LogViewerPage() {
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const parseLogFile = (file: File) => {
		setError(null);
		setFileName(file.name);

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const text = event.target?.result as string;
				const json = JSON.parse(text);

				// Check if it's a LazyFrog log export format
				if (json.logs && Array.isArray(json.logs)) {
					setLogs(json.logs);
				} else if (Array.isArray(json)) {
					// Fallback: directly an array of logs
					setLogs(json);
				} else {
					setError('Invalid log file format. Expected an array of log entries or LazyFrog export format.');
				}
			} catch (err) {
				setError(`Failed to parse log file: ${err instanceof Error ? err.message : 'Unknown error'}`);
			}
		};
		reader.onerror = () => {
			setError('Failed to read file. Please try again.');
		};
		reader.readAsText(file);
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		parseLogFile(file);

		// Reset file input
		e.target.value = '';
	};

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const file = e.dataTransfer.files?.[0];
		if (file && file.type === 'application/json') {
			parseLogFile(file);
		} else {
			setError('Please drop a valid JSON file.');
		}
	};

	const handleClose = () => {
		setLogs([]);
		setFileName(null);
		setError(null);
	};

	return (
		<div
			className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-zinc-900 dark:to-emerald-950"
			onDragEnter={logs.length > 0 ? handleDragEnter : undefined}
			onDragOver={logs.length > 0 ? handleDragOver : undefined}
			onDragLeave={logs.length > 0 ? handleDragLeave : undefined}
			onDrop={logs.length > 0 ? handleDrop : undefined}
		>
			{/* Drag and Drop Overlay */}
			{isDragging && (
				<div className="fixed inset-0 z-50 bg-emerald-900/80 backdrop-blur-sm flex items-center justify-center">
					<div className="text-center">
						<Upload className="w-24 h-24 text-white mx-auto mb-4 animate-bounce" />
						<p className="text-2xl font-bold text-white mb-2">Drop log file here</p>
						<p className="text-emerald-200">JSON format</p>
					</div>
				</div>
			)}

			{/* Maximized Log Viewer */}
			{logs.length > 0 ? (
				<div className="min-h-screen flex flex-col">
					{/* Header with Close Button */}
					<header className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 px-6 py-4">
						<div className="container mx-auto flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-3">
									<Bug className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
									<div>
										<h1 className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
											Log Viewer
										</h1>
										{fileName && (
											<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
												<FileText size={14} />
												<span>{fileName}</span>
												<span className="text-gray-400">•</span>
												<span>{logs.length} logs</span>
											</div>
										)}
									</div>
								</div>
							</div>
							<button
								onClick={handleClose}
								className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
							>
								<X size={20} />
								Close
							</button>
						</div>
					</header>

					{/* Full-screen Log Viewer */}
					<div className="flex-1 w-full px-6 py-6">
						<div className="max-w-[1920px] mx-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-6 h-full">
							<LogViewer logs={logs} height="calc(100vh - 200px)" />
						</div>
					</div>
				</div>
			) : (
				<>
					{/* Header */}
					<header className="container mx-auto px-6 py-8">
						<div className="text-center">
							<div className="flex items-center justify-center gap-4 mb-4">
								<Bug className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
								<BarChart3 className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
							</div>
							<h1 className="text-5xl font-bold text-emerald-800 dark:text-emerald-400 mb-4">
								LazyFrog Log Viewer
							</h1>
							<p className="text-xl text-emerald-600 dark:text-emerald-300 mb-6">
								Analyze your extension logs with ease
							</p>
						</div>
					</header>

					{/* Upload Section */}
					<section className="container mx-auto px-6 py-8">
						<div className="max-w-4xl mx-auto">
							<div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
								<h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mb-6">
									Upload Log File
								</h2>

								<div className="mb-6">
									<label
										htmlFor="file-upload"
										className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
										onDragEnter={handleDragEnter}
										onDragOver={handleDragOver}
										onDragLeave={handleDragLeave}
										onDrop={handleDrop}
									>
										<div className="flex flex-col items-center justify-center pt-5 pb-6">
											<Upload className="w-16 h-16 mb-4 text-emerald-500 dark:text-emerald-400" />
											<p className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">
												Click to upload or drag and drop
											</p>
											<p className="text-sm text-gray-500 dark:text-gray-400">JSON format (exported from extension)</p>
										</div>
										<input
											ref={fileInputRef}
											id="file-upload"
											type="file"
											accept=".json,application/json"
											onChange={handleFileUpload}
											className="hidden"
										/>
									</label>
								</div>

								{error && (
									<div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
										<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
										<p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
									</div>
								)}

								<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
									<p className="text-blue-800 dark:text-blue-200 text-sm">
										<strong>How to get logs:</strong> Open the LazyFrog extension, go to Settings → Logging tab, and
										click &quot;Export Debug Logs&quot;. Then upload the downloaded JSON file here.
									</p>
								</div>
							</div>
						</div>
					</section>
					{/* Footer */}
					<footer className="container mx-auto px-6 py-12 text-center text-emerald-600 dark:text-emerald-400">
						<p className="mb-2">LazyFrog Log Viewer</p>
						<p className="text-sm opacity-75">
							<a href="/" className="hover:underline">
								← Back to Home
							</a>
						</p>
					</footer>
				</>
			)}
		</div>
	);
}

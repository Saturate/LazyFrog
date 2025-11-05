/**
 * Debug Tab - Developer tools for testing and debugging
 * Only visible when debug mode is enabled
 */

import React, { useState } from 'react';
import { Code, Play, Copy, Check } from 'lucide-react';
import { parseMissionData } from '../../utils/parseMissionData';

const DebugTab: React.FC = () => {
	const [input, setInput] = useState(
		'https://www.reddit.com/r/SwordAndSupperGame/comments/1okp2mg/in_search_of_playable_pies/',
	);
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const extractPostId = (input: string): string | null => {
		// Remove whitespace
		const trimmed = input.trim();

		// If it's already a post ID (t3_xxxxx)
		if (/^t3_[a-z0-9]+$/.test(trimmed)) {
			return trimmed;
		}

		// If it's just the ID without prefix
		if (/^[a-z0-9]+$/.test(trimmed) && !trimmed.includes('/')) {
			return `t3_${trimmed}`;
		}

		// If it's a URL, extract post ID
		// Matches: https://www.reddit.com/r/SwordAndSupperGame/comments/1oh01dp/...
		const urlMatch = trimmed.match(/\/comments\/([a-z0-9]+)/);
		if (urlMatch) {
			return `t3_${urlMatch[1]}`;
		}

		return null;
	};

	const handleFetch = async () => {
		setError(null);
		setResult(null);
		setCopied(false);

		const postId = extractPostId(input);
		if (!postId) {
			setError('Invalid input. Please provide a post ID (t3_xxxxx) or Reddit URL.');
			return;
		}

		setIsLoading(true);

		try {
			// Find a Reddit tab to execute the fetch in (to avoid CORS issues)
			let tabs = await chrome.tabs.query({ url: '*://*.reddit.com/*' });

			// If no Reddit tab exists, create one
			if (tabs.length === 0) {
				setError('No Reddit tab found. Opening reddit.com...');

				const newTab = await chrome.tabs.create({
					url: 'https://www.reddit.com/r/SwordAndSupperGame/',
					active: false,
				});

				// Wait for the tab to load
				await new Promise<void>((resolve) => {
					const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
						if (tabId === newTab.id && changeInfo.status === 'complete') {
							chrome.tabs.onUpdated.removeListener(listener);
							resolve();
						}
					};
					chrome.tabs.onUpdated.addListener(listener);

					// Timeout after 10 seconds
					setTimeout(() => {
						chrome.tabs.onUpdated.removeListener(listener);
						resolve();
					}, 10000);
				});

				// Query again to get the tab
				tabs = await chrome.tabs.query({ url: '*://*.reddit.com/*' });

				if (tabs.length === 0) {
					setError('Failed to open Reddit tab. Please try manually opening reddit.com first.');
					setIsLoading(false);
					return;
				}

				// Give content script a moment to inject and initialize
				await new Promise((resolve) => setTimeout(resolve, 1000));
				setError(null); // Clear the opening message
			}

			// Use the first Reddit tab found
			const redditTab = tabs[0];

			// Send message to background worker (which will build the protobuf and forward to content script)
			chrome.runtime.sendMessage(
				{ type: 'FETCH_MISSION_DATA', postId, tabId: redditTab.id! },
				(response: any) => {
					if (chrome.runtime.lastError) {
						setError(
							`Failed to communicate with background worker: ${chrome.runtime.lastError.message}`,
						);
						setIsLoading(false);
						return;
					}

					if (response?.success && response.data) {
						setResult(response.data);
					} else {
						setError(
							response?.error ||
								'Failed to fetch mission data. Make sure you are logged into Reddit.',
						);
					}
					setIsLoading(false);
				},
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setIsLoading(false);
		}
	};

	const handleCopy = async () => {
		if (result) {
			try {
				await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			} catch (err) {
				console.error('Failed to copy:', err);
			}
		}
	};

	return (
		<div>
			<div className="card">
				<h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
					<Code
						size={20}
						style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px' }}
					/>
					Mission Data Fetcher
				</h2>
				<p style={{ color: '#a3a3a3', marginBottom: '24px', fontSize: '14px' }}>
					Fetch mission data directly from Reddit's API using a post ID or URL.
				</p>

				{/* Input */}
				<div style={{ marginBottom: '16px' }}>
					<label
						style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}
					>
						Post ID or URL
					</label>
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="t3_1oh01dp or https://www.reddit.com/r/SwordAndSupperGame/comments/1oh01dp/..."
						style={{
							width: '100%',
							padding: '12px',
							borderRadius: '8px',
							border: '1px solid #404040',
							background: '#1a1a1a',
							color: '#e5e5e5',
							fontSize: '14px',
							fontFamily: 'monospace',
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !isLoading) {
								handleFetch();
							}
						}}
					/>
					<p style={{ marginTop: '8px', fontSize: '12px', color: '#737373' }}>
						Accepts: Post ID (t3_xxxxx), short ID (xxxxx), or full Reddit URL
					</p>
				</div>

				{/* Fetch Button */}
				<button
					onClick={handleFetch}
					disabled={isLoading || !input.trim()}
					className="button"
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						background: '#3b82f6',
						color: 'white',
						opacity: isLoading || !input.trim() ? 0.5 : 1,
					}}
				>
					<Play size={16} />
					{isLoading ? 'Fetching...' : 'Fetch Mission Data'}
				</button>

				{/* Error */}
				{error && (
					<div
						style={{
							marginTop: '16px',
							padding: '12px',
							background: '#7f1d1d',
							border: '1px solid #991b1b',
							borderRadius: '8px',
							color: '#fecaca',
							fontSize: '14px',
						}}
					>
						<strong>Error:</strong> {error}
					</div>
				)}

				{/* Protobuf Decoder Link */}
				<div
					style={{
						marginTop: '24px',
						padding: '12px',
						background: '#14532d',
						border: '1px solid #166534',
						borderRadius: '8px',
						fontSize: '14px',
					}}
				>
					<strong style={{ color: '#86efac' }}>Need to decode protobuf requests/responses?</strong>
					<p style={{ marginTop: '4px', color: '#bbf7d0', fontSize: '13px' }}>
						Visit the{' '}
						<a
							href="https://lazyfrog.xyz/protobuf"
							target="_blank"
							rel="noopener noreferrer"
							style={{ color: '#86efac', textDecoration: 'underline' }}
						>
							Protobuf Decoder
						</a>{' '}
						on the LazyFrog website to decode requests, responses, and HAR files.
					</p>
				</div>
			</div>

			{/* Result */}
			{result && (
				<div className="card" style={{ marginTop: '24px' }}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '16px',
						}}
					>
						<h3 style={{ fontSize: '18px', fontWeight: '600' }}>Result</h3>
						<button
							onClick={handleCopy}
							className="button"
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								padding: '8px 12px',
							}}
						>
							{copied ? (
								<>
									<Check size={16} />
									Copied!
								</>
							) : (
								<>
									<Copy size={16} />
									Copy JSON
								</>
							)}
						</button>
					</div>

					<pre
						style={{
							background: '#0a0a0a',
							border: '1px solid #404040',
							borderRadius: '8px',
							padding: '16px',
							overflow: 'auto',
							maxHeight: '600px',
							fontSize: '13px',
							lineHeight: '1.5',
							color: '#d4d4d4',
						}}
					>
						{JSON.stringify(result, null, 2)}
					</pre>

					{/* Summary */}
					<div
						style={{
							marginTop: '16px',
							padding: '12px',
							background: '#14532d',
							border: '1px solid #166534',
							borderRadius: '8px',
							fontSize: '14px',
						}}
					>
						<strong style={{ color: '#86efac' }}>Fetched successfully!</strong>
						<div style={{ marginTop: '8px', color: '#bbf7d0', fontSize: '13px' }}>
							{result.difficulty && <div>Difficulty: {result.difficulty} stars</div>}
							{result.minLevel && result.maxLevel && (
								<div>
									Level Range: {result.minLevel} - {result.maxLevel}
								</div>
							)}
							{result.environment && <div>Environment: {result.environment}</div>}
							{result.encounters && <div>Encounters: {result.encounters.length}</div>}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default DebugTab;

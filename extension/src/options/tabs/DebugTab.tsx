/**
 * Debug Tab - Developer tools for testing and debugging
 * Only visible when debug mode is enabled
 */

import React, { useState } from 'react';
import { Code, Play, Copy, Check, FileText, Upload, Download } from 'lucide-react';
import { parseMissionData } from '../../utils/parseMissionData';
import { UIRequest, UIResponse } from '@devvit/protos/types/devvit/ui/block_kit/v1beta/ui.js';

const DebugTab: React.FC = () => {
	const [input, setInput] = useState(
		'https://www.reddit.com/r/SwordAndSupperGame/comments/1okp2mg/in_search_of_playable_pies/',
	);
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	// Response payload decoder state
	const [payloadInput, setPayloadInput] = useState('');
	const [payloadFormat, setPayloadFormat] = useState<'base64' | 'hex' | 'raw'>('raw');
	const [decodedPayload, setDecodedPayload] = useState<any>(null);
	const [payloadError, setPayloadError] = useState<string | null>(null);
	const [payloadCopied, setPayloadCopied] = useState(false);

	// Request payload decoder state
	const [requestInput, setRequestInput] = useState('');
	const [requestFormat, setRequestFormat] = useState<'base64' | 'hex' | 'raw'>('raw');
	const [decodedRequest, setDecodedRequest] = useState<any>(null);
	const [requestError, setRequestError] = useState<string | null>(null);
	const [requestCopied, setRequestCopied] = useState(false);

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

	const handleDecodePayload = () => {
		setPayloadError(null);
		setDecodedPayload(null);
		setPayloadCopied(false);

		if (!payloadInput.trim()) {
			setPayloadError('Please paste a payload to decode');
			return;
		}

		try {
			let arrayBuffer: ArrayBuffer;

			if (payloadFormat === 'base64') {
				// Decode base64
				const binaryString = atob(payloadInput.trim());
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				arrayBuffer = bytes.buffer;
			} else if (payloadFormat === 'hex') {
				// Decode hex
				const hexString = payloadInput.trim().replace(/\s+/g, '').replace(/0x/g, '');
				if (hexString.length % 2 !== 0) {
					throw new Error('Invalid hex string (odd length)');
				}
				const bytes = new Uint8Array(hexString.length / 2);
				for (let i = 0; i < hexString.length; i += 2) {
					bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
				}
				arrayBuffer = bytes.buffer;
			} else {
				// Raw binary - treat each character as a byte
				// Note: Chrome DevTools text copy often corrupts binary data
				const input = payloadInput;
				const bytes = new Uint8Array(input.length);
				for (let i = 0; i < input.length; i++) {
					bytes[i] = input.charCodeAt(i) & 0xff;
				}
				arrayBuffer = bytes.buffer;
			}

			// Try to parse the payload using parseMissionData
			const parsed = parseMissionData(arrayBuffer, 'unknown');

			if (parsed) {
				setDecodedPayload(parsed);
			} else {
				setPayloadError(
					"Failed to parse payload. Make sure it's a valid PostContentRender response.",
				);
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			if (errorMsg.includes('invalid wire type') && payloadFormat === 'raw') {
				setPayloadError(
					`${errorMsg}\n\n` +
						'Raw binary copy from Chrome often corrupts data. Try using Base64 instead:\n\n' +
						'In Chrome Console, run:\n' +
						'copy(btoa(String.fromCharCode(...new Uint8Array(responseBody))))\n\n' +
						'Then paste here and select "Base64" format.',
				);
			} else {
				setPayloadError(errorMsg);
			}
		}
	};

	const handleCopyPayload = async () => {
		if (decodedPayload) {
			try {
				await navigator.clipboard.writeText(JSON.stringify(decodedPayload, null, 2));
				setPayloadCopied(true);
				setTimeout(() => setPayloadCopied(false), 2000);
			} catch (err) {
				console.error('Failed to copy:', err);
			}
		}
	};

	const handleDecodeRequest = () => {
		setRequestError(null);
		setDecodedRequest(null);
		setRequestCopied(false);

		if (!requestInput.trim()) {
			setRequestError('Please paste a request payload to decode');
			return;
		}

		try {
			let arrayBuffer: ArrayBuffer;

			if (requestFormat === 'base64') {
				// Decode base64
				const binaryString = atob(requestInput.trim());
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				arrayBuffer = bytes.buffer;
			} else if (requestFormat === 'hex') {
				// Decode hex
				const hexString = requestInput.trim().replace(/\s+/g, '').replace(/0x/g, '');
				if (hexString.length % 2 !== 0) {
					throw new Error('Invalid hex string (odd length)');
				}
				const bytes = new Uint8Array(hexString.length / 2);
				for (let i = 0; i < hexString.length; i += 2) {
					bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
				}
				arrayBuffer = bytes.buffer;
			} else {
				// Raw binary - treat each character as a byte
				// Note: Chrome DevTools text copy often corrupts binary data
				const input = requestInput;
				const bytes = new Uint8Array(input.length);
				for (let i = 0; i < input.length; i++) {
					bytes[i] = input.charCodeAt(i) & 0xff;
				}
				arrayBuffer = bytes.buffer;
			}

			// Skip gRPC-web header (5 bytes) if present
			let buffer = arrayBuffer;
			if (buffer.byteLength > 5) {
				const firstByte = new Uint8Array(buffer)[0];
				// If it looks like a gRPC header (first byte is 0x00)
				if (firstByte === 0x00) {
					buffer = buffer.slice(5);
				}
			}

			// Decode using UIRequest protobuf definition
			const uint8Array = new Uint8Array(buffer);
			const request = UIRequest.decode(uint8Array);
			const json = UIRequest.toJSON(request);

			setDecodedRequest(json);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			if (errorMsg.includes('invalid wire type') && requestFormat === 'raw') {
				setRequestError(
					`${errorMsg}\n\n` +
						'Raw binary copy from Chrome often corrupts data. Try using Base64 instead:\n\n' +
						'In Chrome Console, run:\n' +
						'copy(btoa(String.fromCharCode(...new Uint8Array(requestBody))))\n\n' +
						'Then paste here and select "Base64" format.',
				);
			} else {
				setRequestError(errorMsg);
			}
		}
	};

	const handleCopyRequest = async () => {
		if (decodedRequest) {
			try {
				await navigator.clipboard.writeText(JSON.stringify(decodedRequest, null, 2));
				setRequestCopied(true);
				setTimeout(() => setRequestCopied(false), 2000);
			} catch (err) {
				console.error('Failed to copy:', err);
			}
		}
	};

	return (
		<div>
			<div className="card" style={{ marginBottom: '24px' }}>
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
			</div>

			{/* Result */}
			{result && (
				<div className="card" style={{ marginBottom: '24px' }}>
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

			{/* Request Payload Decoder */}
			<div className="card" style={{ marginBottom: '24px' }}>
				<h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
					<Upload
						size={20}
						style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px' }}
					/>
					Request Payload Decoder
				</h2>
				<p style={{ color: '#a3a3a3', marginBottom: '24px', fontSize: '14px' }}>
					Paste a PostContentRender request payload to decode it. Use Base64 format for best results
					(see instructions above).
				</p>

				{/* Format Selection */}
				<div style={{ marginBottom: '16px' }}>
					<label
						style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}
					>
						Format
					</label>
					<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
						<label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
							<input
								type="radio"
								name="requestFormat"
								value="raw"
								checked={requestFormat === 'raw'}
								onChange={(e) => setRequestFormat(e.target.value as 'base64' | 'hex' | 'raw')}
								style={{ cursor: 'pointer' }}
							/>
							<span style={{ fontSize: '14px' }}>Raw Binary</span>
						</label>
						<label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
							<input
								type="radio"
								name="requestFormat"
								value="base64"
								checked={requestFormat === 'base64'}
								onChange={(e) => setRequestFormat(e.target.value as 'base64' | 'hex' | 'raw')}
								style={{ cursor: 'pointer' }}
							/>
							<span style={{ fontSize: '14px' }}>Base64</span>
						</label>
						<label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
							<input
								type="radio"
								name="requestFormat"
								value="hex"
								checked={requestFormat === 'hex'}
								onChange={(e) => setRequestFormat(e.target.value as 'base64' | 'hex' | 'raw')}
								style={{ cursor: 'pointer' }}
							/>
							<span style={{ fontSize: '14px' }}>Hex</span>
						</label>
					</div>
				</div>

				{/* Request Input */}
				<div style={{ marginBottom: '16px' }}>
					<label
						style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}
					>
						Request Payload
					</label>
					<textarea
						value={requestInput}
						onChange={(e) => setRequestInput(e.target.value)}
						placeholder={
							requestFormat === 'raw'
								? 'Paste raw binary data from Chrome DevTools here...'
								: requestFormat === 'base64'
									? 'Paste base64-encoded request payload here...'
									: 'Paste hex-encoded request payload here (e.g., 0a1b2c3d...)'
						}
						style={{
							width: '100%',
							minHeight: '120px',
							padding: '12px',
							borderRadius: '8px',
							border: '1px solid #404040',
							background: '#1a1a1a',
							color: '#e5e5e5',
							fontSize: '13px',
							fontFamily: 'monospace',
							resize: 'vertical',
						}}
					/>
					<p style={{ marginTop: '8px', fontSize: '12px', color: '#737373' }}>
						{requestFormat === 'raw'
							? 'Copy the request/response body directly from Chrome DevTools Network tab'
							: requestFormat === 'base64'
								? 'Paste the request body as base64 string'
								: 'Paste the request body as hex string (spaces and 0x prefixes will be ignored)'}
					</p>
				</div>

				{/* Decode Button */}
				<button
					onClick={handleDecodeRequest}
					disabled={!requestInput.trim()}
					className="button"
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						background: '#10b981',
						color: 'white',
						opacity: !requestInput.trim() ? 0.5 : 1,
					}}
				>
					<Code size={16} />
					Decode Request
				</button>

				{/* Error */}
				{requestError && (
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
						<strong>Error:</strong> {requestError}
					</div>
				)}
			</div>

			{/* Decoded Request Result */}
			{decodedRequest && (
				<div className="card" style={{ marginBottom: '24px' }}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '16px',
						}}
					>
						<h3 style={{ fontSize: '18px', fontWeight: '600' }}>Decoded Request</h3>
						<button
							onClick={handleCopyRequest}
							className="button"
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								padding: '8px 12px',
							}}
						>
							{requestCopied ? (
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
						{JSON.stringify(decodedRequest, null, 2)}
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
						<strong style={{ color: '#86efac' }}>Decoded successfully!</strong>
						<div style={{ marginTop: '8px', color: '#bbf7d0', fontSize: '13px' }}>
							{decodedRequest.props?.postId && <div>Post ID: {decodedRequest.props.postId}</div>}
							{decodedRequest.state && (
								<div>State keys: {Object.keys(decodedRequest.state).length}</div>
							)}
							{decodedRequest.events && Array.isArray(decodedRequest.events) && (
								<div>Events: {decodedRequest.events.length}</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Response Payload Decoder */}
			<div className="card" style={{ marginBottom: '24px' }}>
				<h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
					<Download
						size={20}
						style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px' }}
					/>
					Response Payload Decoder
				</h2>
				<p style={{ color: '#a3a3a3', marginBottom: '24px', fontSize: '14px' }}>
					Paste a PostContentRender response payload to decode it. Use Base64 format for best
					results (see instructions above).
				</p>

				{/* Format Selection */}
				<div style={{ marginBottom: '16px' }}>
					<label
						style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}
					>
						Format
					</label>
					<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
						<label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
							<input
								type="radio"
								name="payloadFormat"
								value="raw"
								checked={payloadFormat === 'raw'}
								onChange={(e) => setPayloadFormat(e.target.value as 'base64' | 'hex' | 'raw')}
								style={{ cursor: 'pointer' }}
							/>
							<span style={{ fontSize: '14px' }}>Raw Binary</span>
						</label>
						<label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
							<input
								type="radio"
								name="payloadFormat"
								value="base64"
								checked={payloadFormat === 'base64'}
								onChange={(e) => setPayloadFormat(e.target.value as 'base64' | 'hex' | 'raw')}
								style={{ cursor: 'pointer' }}
							/>
							<span style={{ fontSize: '14px' }}>Base64</span>
						</label>
						<label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
							<input
								type="radio"
								name="payloadFormat"
								value="hex"
								checked={payloadFormat === 'hex'}
								onChange={(e) => setPayloadFormat(e.target.value as 'base64' | 'hex' | 'raw')}
								style={{ cursor: 'pointer' }}
							/>
							<span style={{ fontSize: '14px' }}>Hex</span>
						</label>
					</div>
				</div>

				{/* Payload Input */}
				<div style={{ marginBottom: '16px' }}>
					<label
						style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}
					>
						Response Payload
					</label>
					<textarea
						value={payloadInput}
						onChange={(e) => setPayloadInput(e.target.value)}
						placeholder={
							payloadFormat === 'raw'
								? 'Paste raw binary data from Chrome DevTools here...'
								: payloadFormat === 'base64'
									? 'Paste base64-encoded payload here...'
									: 'Paste hex-encoded payload here (e.g., 0a1b2c3d...)'
						}
						style={{
							width: '100%',
							minHeight: '120px',
							padding: '12px',
							borderRadius: '8px',
							border: '1px solid #404040',
							background: '#1a1a1a',
							color: '#e5e5e5',
							fontSize: '13px',
							fontFamily: 'monospace',
							resize: 'vertical',
						}}
					/>
					<p style={{ marginTop: '8px', fontSize: '12px', color: '#737373' }}>
						{payloadFormat === 'raw'
							? 'Copy the request/response body directly from Chrome DevTools Network tab'
							: payloadFormat === 'base64'
								? 'Paste the response body as base64 string'
								: 'Paste the response body as hex string (spaces and 0x prefixes will be ignored)'}
					</p>
				</div>

				{/* Decode Button */}
				<button
					onClick={handleDecodePayload}
					disabled={!payloadInput.trim()}
					className="button"
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						background: '#8b5cf6',
						color: 'white',
						opacity: !payloadInput.trim() ? 0.5 : 1,
					}}
				>
					<Code size={16} />
					Decode Payload
				</button>

				{/* Error */}
				{payloadError && (
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
						<strong>Error:</strong> {payloadError}
					</div>
				)}
			</div>

			{/* Decoded Payload Result */}
			{decodedPayload && (
				<div className="card">
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '16px',
						}}
					>
						<h3 style={{ fontSize: '18px', fontWeight: '600' }}>Decoded Payload</h3>
						<button
							onClick={handleCopyPayload}
							className="button"
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								padding: '8px 12px',
							}}
						>
							{payloadCopied ? (
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
						{JSON.stringify(decodedPayload, null, 2)}
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
						<strong style={{ color: '#86efac' }}>Decoded successfully!</strong>
						<div style={{ marginTop: '8px', color: '#bbf7d0', fontSize: '13px' }}>
							{decodedPayload.difficulty && (
								<div>Difficulty: {decodedPayload.difficulty} stars</div>
							)}
							{decodedPayload.minLevel && decodedPayload.maxLevel && (
								<div>
									Level Range: {decodedPayload.minLevel} - {decodedPayload.maxLevel}
								</div>
							)}
							{decodedPayload.environment && <div>Environment: {decodedPayload.environment}</div>}
							{decodedPayload.encounters && (
								<div>Encounters: {decodedPayload.encounters.length}</div>
							)}
							{decodedPayload.__cleared && (
								<div style={{ color: '#fde047' }}>Status: Cleared ✓</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default DebugTab;

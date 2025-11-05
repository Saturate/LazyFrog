'use client';

import { useState } from 'react';
import { Upload, Download, FileText, Code, Copy, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { UIRequest, UIResponse } from '@devvit/protos/types/devvit/ui/block_kit/v1beta/ui.js';

type Format = 'unicode' | 'base64' | 'hex' | 'raw';

interface HAREntry {
	request: {
		method: string;
		url: string;
		postData?: {
			mimeType: string;
			text: string;
		};
	};
	response: {
		status: number;
		content: {
			mimeType: string;
			text?: string;
			encoding?: string;
		};
	};
}

export default function ProtobufPage() {
	// Request decoder state
	const [requestInput, setRequestInput] = useState('');
	const [requestFormat, setRequestFormat] = useState<Format>('unicode');
	const [decodedRequest, setDecodedRequest] = useState<any>(null);
	const [requestError, setRequestError] = useState<string | null>(null);
	const [requestCopied, setRequestCopied] = useState(false);

	// Response decoder state
	const [responseInput, setResponseInput] = useState('');
	const [responseFormat, setResponseFormat] = useState<Format>('unicode');
	const [decodedResponse, setDecodedResponse] = useState<any>(null);
	const [responseError, setResponseError] = useState<string | null>(null);
	const [responseCopied, setResponseCopied] = useState(false);

	// HAR parser state
	const [harFile, setHarFile] = useState<File | null>(null);
	const [harResults, setHarResults] = useState<any[]>([]);
	const [harError, setHarError] = useState<string | null>(null);
	const [harCopied, setHarCopied] = useState(false);

	const decodeFromFormat = (input: string, format: Format): ArrayBuffer => {
		if (format === 'base64') {
			const binaryString = atob(input.trim());
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			return bytes.buffer;
		} else if (format === 'hex') {
			const hexString = input.trim().replace(/\s+/g, '').replace(/0x/g, '');
			if (hexString.length % 2 !== 0) {
				throw new Error('Invalid hex string (odd length)');
			}
			const bytes = new Uint8Array(hexString.length / 2);
			for (let i = 0; i < hexString.length; i += 2) {
				bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
			}
			return bytes.buffer;
		} else if (format === 'unicode') {
			// Decode unicode escape sequences (\uXXXX and \xXX)
			// HAR files from Chrome contain strings that are already partially decoded
			// So we need to handle them byte-by-byte rather than using JSON.parse
			let text = input.trim();

			// Try to parse as JSON string first (in case it's wrapped in quotes)
			if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
				try {
					text = JSON.parse(text);
				} catch (e) {
					// If JSON parse fails, just remove quotes manually
					text = text.slice(1, -1);
				}
			}

			// Convert to byte array - treat each character as a byte
			// This works for HAR files where escape sequences are already converted
			const bytes = new Uint8Array(text.length);
			for (let i = 0; i < text.length; i++) {
				bytes[i] = text.charCodeAt(i) & 0xff;
			}
			return bytes.buffer;
		} else {
			// Raw binary
			const bytes = new Uint8Array(input.length);
			for (let i = 0; i < input.length; i++) {
				bytes[i] = input.charCodeAt(i) & 0xff;
			}
			return bytes.buffer;
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
			const arrayBuffer = decodeFromFormat(requestInput, requestFormat);

			// Skip gRPC-web header (5 bytes) if present
			let buffer = arrayBuffer;
			if (buffer.byteLength > 5) {
				const firstByte = new Uint8Array(buffer)[0];
				if (firstByte === 0x00) {
					buffer = buffer.slice(5);
				}
			}

			const uint8Array = new Uint8Array(buffer);
			const request = UIRequest.decode(uint8Array);
			const json = UIRequest.toJSON(request);
			setDecodedRequest(json);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			setRequestError(errorMsg);
		}
	};

	const handleDecodeResponse = () => {
		setResponseError(null);
		setDecodedResponse(null);
		setResponseCopied(false);

		if (!responseInput.trim()) {
			setResponseError('Please paste a response payload to decode');
			return;
		}

		try {
			const arrayBuffer = decodeFromFormat(responseInput, responseFormat);

			// Skip gRPC-web header (5 bytes) if present
			let buffer = arrayBuffer;
			if (buffer.byteLength > 5) {
				const firstByte = new Uint8Array(buffer)[0];
				if (firstByte === 0x00) {
					buffer = buffer.slice(5);
				}
			}

			const uint8Array = new Uint8Array(buffer);
			const response = UIResponse.decode(uint8Array);
			const json = UIResponse.toJSON(response);
			setDecodedResponse(json);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			setResponseError(errorMsg);
		}
	};

	const handleHARUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setHarFile(file);
		setHarError(null);
		setHarResults([]);
		setHarCopied(false);

		try {
			const text = await file.text();
			const har = JSON.parse(text);

			if (!har.log || !har.log.entries) {
				throw new Error('Invalid HAR file format');
			}

			const results: any[] = [];
			const entries = har.log.entries as HAREntry[];

			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];
				const url = entry.request.url;

				// Look for RenderPostContent requests
				if (!url.includes('RenderPostContent')) continue;

				const result: any = {
					index: i,
					url,
					method: entry.request.method,
					status: entry.response.status,
				};

				// Decode request if present
				if (entry.request.postData?.text) {
					try {
						// Requests in HAR files use unicode escape sequences (not base64)
						const requestBuffer = decodeFromFormat(entry.request.postData.text, 'unicode');
						let buffer = requestBuffer;
						if (buffer.byteLength > 5 && new Uint8Array(buffer)[0] === 0x00) {
							buffer = buffer.slice(5);
						}
						const request = UIRequest.decode(new Uint8Array(buffer));
						result.request = UIRequest.toJSON(request);
					} catch (e) {
						result.requestError = e instanceof Error ? e.message : String(e);
					}
				}

				// Decode response if present
				if (entry.response.content.text) {
					try {
						// Check if response has explicit encoding specified
						const isBase64 = entry.response.content.encoding === 'base64';
						const format = isBase64 ? 'base64' : 'unicode';

						const responseBuffer = decodeFromFormat(entry.response.content.text, format);
						let buffer = responseBuffer;
						if (buffer.byteLength > 5 && new Uint8Array(buffer)[0] === 0x00) {
							buffer = buffer.slice(5);
						}
						const response = UIResponse.decode(new Uint8Array(buffer));
						result.response = UIResponse.toJSON(response);
					} catch (e) {
						result.responseError = e instanceof Error ? e.message : String(e);
					}
				}

				results.push(result);
			}

			if (results.length === 0) {
				setHarError('No RenderPostContent requests found in HAR file');
			} else {
				setHarResults(results);
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			setHarError(`Failed to parse HAR file: ${errorMsg}`);
		}
	};

	const copyToClipboard = async (data: any, setCopied: (value: boolean) => void) => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-zinc-900 dark:to-emerald-950">
			<div className="container mx-auto px-4 py-12 max-w-6xl">
				{/* Header */}
				<div className="mb-8">
					<Link
						href="/"
						className="text-emerald-600 dark:text-emerald-400 hover:underline mb-4 inline-block"
					>
						← Back to Home
					</Link>
					<h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-3">
						<Code className="w-10 h-10" />
						Protobuf Decoder
					</h1>
					<p className="text-zinc-600 dark:text-zinc-400">
						Decode Reddit Devvit protobuf requests and responses
					</p>
				</div>

				{/* Request Decoder */}
				<div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 mb-6">
					<h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
						<Upload className="w-6 h-6" />
						Request Decoder
					</h2>

					{/* Format Selection */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
							Format
						</label>
						<div className="flex gap-4 flex-wrap">
							{(['unicode', 'base64', 'hex', 'raw'] as Format[]).map((fmt) => (
								<label key={fmt} className="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="requestFormat"
										value={fmt}
										checked={requestFormat === fmt}
										onChange={(e) => setRequestFormat(e.target.value as Format)}
										className="cursor-pointer"
									/>
									<span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">
										{fmt === 'unicode' ? 'Unicode Escapes' : fmt}
									</span>
								</label>
							))}
						</div>
					</div>

					{/* Input */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
							Request Payload
						</label>
						<textarea
							value={requestInput}
							onChange={(e) => setRequestInput(e.target.value)}
							placeholder={
								requestFormat === 'unicode'
									? 'Paste data with unicode escapes (\\u0000, \\x00, etc.)...'
									: requestFormat === 'base64'
										? 'Paste base64-encoded request payload...'
										: requestFormat === 'hex'
											? 'Paste hex-encoded payload...'
											: 'Paste raw binary data...'
							}
							className="w-full min-h-[120px] p-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-sm resize-vertical"
						/>
					</div>

					{/* Decode Button */}
					<button
						onClick={handleDecodeRequest}
						disabled={!requestInput.trim()}
						className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white rounded-lg font-medium transition-colors"
					>
						<Code className="w-4 h-4" />
						Decode Request
					</button>

					{/* Error */}
					{requestError && (
						<div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-start gap-2">
							<AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
							<div>
								<strong>Error:</strong> {requestError}
							</div>
						</div>
					)}

					{/* Result */}
					{decodedRequest && (
						<div className="mt-4">
							<div className="flex justify-between items-center mb-2">
								<h3 className="font-semibold text-zinc-900 dark:text-white">Decoded Request</h3>
								<button
									onClick={() => copyToClipboard(decodedRequest, setRequestCopied)}
									className="flex items-center gap-2 px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
								>
									{requestCopied ? (
										<>
											<Check className="w-4 h-4" />
											Copied!
										</>
									) : (
										<>
											<Copy className="w-4 h-4" />
											Copy JSON
										</>
									)}
								</button>
							</div>
							<pre className="p-4 bg-zinc-900 dark:bg-black text-zinc-100 rounded-lg overflow-auto max-h-[500px] text-sm">
								{JSON.stringify(decodedRequest, null, 2)}
							</pre>
						</div>
					)}
				</div>

				{/* Response Decoder */}
				<div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 mb-6">
					<h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
						<Download className="w-6 h-6" />
						Response Decoder
					</h2>

					{/* Format Selection */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
							Format
						</label>
						<div className="flex gap-4 flex-wrap">
							{(['unicode', 'base64', 'hex', 'raw'] as Format[]).map((fmt) => (
								<label key={fmt} className="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="responseFormat"
										value={fmt}
										checked={responseFormat === fmt}
										onChange={(e) => setResponseFormat(e.target.value as Format)}
										className="cursor-pointer"
									/>
									<span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">
										{fmt === 'unicode' ? 'Unicode Escapes' : fmt}
									</span>
								</label>
							))}
						</div>
					</div>

					{/* Input */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
							Response Payload
						</label>
						<textarea
							value={responseInput}
							onChange={(e) => setResponseInput(e.target.value)}
							placeholder={
								responseFormat === 'unicode'
									? 'Paste data with unicode escapes (\\u0000, \\x00, etc.)...'
									: responseFormat === 'base64'
										? 'Paste base64-encoded response payload...'
										: responseFormat === 'hex'
											? 'Paste hex-encoded payload...'
											: 'Paste raw binary data...'
							}
							className="w-full min-h-[120px] p-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-sm resize-vertical"
						/>
					</div>

					{/* Decode Button */}
					<button
						onClick={handleDecodeResponse}
						disabled={!responseInput.trim()}
						className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white rounded-lg font-medium transition-colors"
					>
						<Code className="w-4 h-4" />
						Decode Response
					</button>

					{/* Error */}
					{responseError && (
						<div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-start gap-2">
							<AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
							<div>
								<strong>Error:</strong> {responseError}
							</div>
						</div>
					)}

					{/* Result */}
					{decodedResponse && (
						<div className="mt-4">
							<div className="flex justify-between items-center mb-2">
								<h3 className="font-semibold text-zinc-900 dark:text-white">Decoded Response</h3>
								<button
									onClick={() => copyToClipboard(decodedResponse, setResponseCopied)}
									className="flex items-center gap-2 px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
								>
									{responseCopied ? (
										<>
											<Check className="w-4 h-4" />
											Copied!
										</>
									) : (
										<>
											<Copy className="w-4 h-4" />
											Copy JSON
										</>
									)}
								</button>
							</div>
							<pre className="p-4 bg-zinc-900 dark:bg-black text-zinc-100 rounded-lg overflow-auto max-h-[500px] text-sm">
								{JSON.stringify(decodedResponse, null, 2)}
							</pre>
						</div>
					)}
				</div>

				{/* HAR File Parser */}
				<div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6">
					<h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
						<FileText className="w-6 h-6" />
						HAR File Parser
					</h2>
					<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
						Upload a HAR file to automatically extract and decode all RenderPostContent protobuf requests and responses.
					</p>

					{/* File Input */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
							HAR File
						</label>
						<input
							type="file"
							accept=".har,.json"
							onChange={handleHARUpload}
							className="block w-full text-sm text-zinc-600 dark:text-zinc-400
								file:mr-4 file:py-2 file:px-4
								file:rounded-lg file:border-0
								file:text-sm file:font-semibold
								file:bg-emerald-50 file:text-emerald-700
								hover:file:bg-emerald-100
								dark:file:bg-emerald-900/20 dark:file:text-emerald-400
								dark:hover:file:bg-emerald-900/30
								cursor-pointer"
						/>
					</div>

					{/* Error */}
					{harError && (
						<div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-start gap-2">
							<AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
							<div>
								<strong>Error:</strong> {harError}
							</div>
						</div>
					)}

					{/* Results */}
					{harResults.length > 0 && (
						<div className="mt-4">
							<div className="flex justify-between items-center mb-4">
								<h3 className="font-semibold text-zinc-900 dark:text-white">
									Found {harResults.length} RenderPostContent {harResults.length === 1 ? 'request' : 'requests'}
								</h3>
								<button
									onClick={() => copyToClipboard(harResults, setHarCopied)}
									className="flex items-center gap-2 px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
								>
									{harCopied ? (
										<>
											<Check className="w-4 h-4" />
											Copied All!
										</>
									) : (
										<>
											<Copy className="w-4 h-4" />
											Copy All JSON
										</>
									)}
								</button>
							</div>

							<div className="space-y-4">
								{harResults.map((result, idx) => (
									<div key={idx} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
										<div className="mb-2">
											<span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
												Entry #{result.index} - {result.method} {result.status}
											</span>
										</div>
										<div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-3 break-all">
											{result.url}
										</div>

										{result.request && (
											<details className="mb-2">
												<summary className="cursor-pointer text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
													View Request
												</summary>
												<pre className="mt-2 p-3 bg-zinc-900 dark:bg-black text-zinc-100 rounded-lg overflow-auto max-h-[300px] text-xs">
													{JSON.stringify(result.request, null, 2)}
												</pre>
											</details>
										)}

										{result.requestError && (
											<div className="mb-2 text-xs text-red-600 dark:text-red-400">
												Request decode error: {result.requestError}
											</div>
										)}

										{result.response && (
											<details>
												<summary className="cursor-pointer text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
													View Response
												</summary>
												<pre className="mt-2 p-3 bg-zinc-900 dark:bg-black text-zinc-100 rounded-lg overflow-auto max-h-[300px] text-xs">
													{JSON.stringify(result.response, null, 2)}
												</pre>
											</details>
										)}

										{result.responseError && (
											<div className="text-xs text-red-600 dark:text-red-400">
												Response decode error: {result.responseError}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Helper Instructions */}
				<div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
					<h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
						<AlertCircle className="w-5 h-5" />
						How to get payload data
					</h3>
					<div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
						<p><strong>From Chrome DevTools (Console):</strong></p>
						<pre className="p-2 bg-blue-100 dark:bg-blue-950 rounded text-xs overflow-x-auto">
{`// For base64 (recommended):
copy(btoa(String.fromCharCode(...new Uint8Array(responseBody))))

// For unicode escapes:
copy(JSON.stringify(new TextDecoder().decode(responseBody)))`}
						</pre>
						<p><strong>From HAR files:</strong> Export HAR from Chrome DevTools Network tab → Upload here</p>
					</div>
				</div>
			</div>
		</div>
	);
}

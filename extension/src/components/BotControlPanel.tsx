/**
 * Bot Control Panel Component
 * Compact, draggable control panel for the Reddit page
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Settings } from 'lucide-react';
import { VERSION, getTimeSinceBuild, getBuildTimestamp } from '../utils/buildInfo';
interface BotControlPanelProps {
	isRunning: boolean;
	status: string;
	shouldShow: boolean;
	onStart: () => void;
	onStop: () => void;
	onOpenSettings: () => void;
}

const BotControlPanel: React.FC<BotControlPanelProps> = ({
	isRunning,
	status,
	shouldShow,
	onStart,
	onStop,
	onOpenSettings,
}) => {
	const [position, setPosition] = useState({ x: 20, y: 20 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const panelRef = useRef<HTMLDivElement>(null);
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const hasLoadedPosition = useRef(false);

	// Load saved position from storage
	useEffect(() => {
		chrome.storage.local.get(['botPanelPosition'], (result) => {
			if (result.botPanelPosition) {
				console.log('[BotControlPanel] Loading saved position:', result.botPanelPosition);
				setPosition(result.botPanelPosition);
			} else {
				console.log('[BotControlPanel] No saved position found, using default');
			}
			hasLoadedPosition.current = true;
		});
	}, []);

	// Save position when it changes (debounced to avoid excessive writes)
	useEffect(() => {
		// Don't save before position has been loaded or if it's the default position
		if (!hasLoadedPosition.current || (position.x === 20 && position.y === 20)) {
			return;
		}

		// Clear any existing timeout
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		// Set a new timeout to save after 500ms of no changes
		saveTimeoutRef.current = setTimeout(() => {
			console.log('[BotControlPanel] Saving position:', position);
			chrome.storage.local.set({ botPanelPosition: position });
		}, 500);

		// Cleanup timeout on unmount or when position changes
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [position]);

	const handleMouseDown = (e: React.MouseEvent) => {
		// Only start dragging if clicking on the drag handle
		if ((e.target as HTMLElement).classList.contains('drag-handle')) {
			setIsDragging(true);
			setDragOffset({
				x: e.clientX - position.x,
				y: e.clientY - position.y,
			});
		}
	};

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging) {
				setPosition({
					x: e.clientX - dragOffset.x,
					y: e.clientY - dragOffset.y,
				});
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, dragOffset]);

	return (
		<div
			ref={panelRef}
			style={{
				position: 'fixed',
				left: `${position.x}px`,
				top: `${position.y}px`,
				zIndex: 999999,
				background: '#0a0a0a',
				border: '1px solid #1f1f1f',
				borderRadius: '6px',
				padding: '6px 8px',
				fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
				cursor: isDragging ? 'grabbing' : 'default',
				userSelect: 'none',
				boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
				opacity: shouldShow ? 1 : 0,
				visibility: shouldShow ? 'visible' : 'hidden',
				transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
				pointerEvents: shouldShow ? 'auto' : 'none',
			}}
			onMouseDown={handleMouseDown}
		>
			{/* Main horizontal row */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
				}}
			>
				{/* Title */}
				<span
					className="drag-handle"
					style={{
						color: '#ededed',
						fontWeight: 500,
						fontSize: '11px',
						cursor: 'grab',
					}}
				>
					LazyFrog <span style={{ opacity: 0.7 }}>{VERSION}</span>
				</span>

				{/* Status indicator dot */}
				<div
					style={{
						width: '6px',
						height: '6px',
						borderRadius: '50%',
						background: isRunning ? '#22c55e' : '#3f3f46',
						boxShadow: isRunning ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none',
						animation: isRunning ? 'pulse 2s ease-in-out infinite' : 'none',
						flexShrink: 0,
						marginLeft: 'auto',
					}}
				/>

				{/* Play button - only show when not running */}
				{!isRunning && (
					<button
						onClick={onStart}
						style={{
							width: '28px',
							height: '28px',
							padding: '0',
							border: '1px solid',
							borderColor: '#1a1a1a',
							borderRadius: '50%',
							background: '#0f0f0f',
							color: '#22c55e',
							cursor: 'pointer',
							transition: 'all 0.2s',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = '#22c55e';
							e.currentTarget.style.background = '#171717';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = '#1a1a1a';
							e.currentTarget.style.background = '#0f0f0f';
						}}
						title="Start"
					>
						<Play size={14} fill="#22c55e" />
					</button>
				)}

				{/* Pause button - only show when running */}
				{isRunning && (
					<button
						onClick={onStop}
						style={{
							width: '28px',
							height: '28px',
							padding: '0',
							border: '1px solid',
							borderColor: '#1a1a1a',
							borderRadius: '50%',
							background: '#0f0f0f',
							color: '#ef4444',
							cursor: 'pointer',
							transition: 'all 0.2s',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = '#ef4444';
							e.currentTarget.style.background = '#171717';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = '#1a1a1a';
							e.currentTarget.style.background = '#0f0f0f';
						}}
						title="Stop"
					>
						<Pause size={14} />
					</button>
				)}
			</div>

			{/* Status text below */}
			<div
				style={{
					marginTop: '4px',
					fontSize: '9px',
					color: '#525252',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					paddingLeft: '14px',
				}}
			>
				{status || 'Idle'}
			</div>

			{/* Pulse animation */}
			<style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
		</div>
	);
};

export default BotControlPanel;

/**
 * Reusable Log Viewer Component
 * Uses TanStack Table with virtualized rows for performance
 * Can be used in both extension and website
 */

import React, { useMemo, useState, useRef } from 'react';
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	ColumnDef,
	SortingState,
	ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, X, ChevronUp, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import ReactJson from '@microlink/react-json-view';

export interface LogEntry {
	timestamp: string;
	context: string;
	level: 'log' | 'info' | 'warn' | 'error' | 'debug';
	message: string;
	data?: any;
}

interface LogViewerProps {
	logs: LogEntry[];
	height?: string;
	onClearFilter?: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, height = '500px', onClearFilter }) => {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState('');
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
	const [newestFirst, setNewestFirst] = useState(true);
	const tableContainerRef = useRef<HTMLDivElement>(null);

	const toggleRow = (rowId: string) => {
		setExpandedRows((prev) => {
			const next = new Set(prev);
			if (next.has(rowId)) {
				next.delete(rowId);
			} else {
				next.add(rowId);
			}
			return next;
		});
	};

	const toggleSortOrder = () => {
		setNewestFirst((prev) => {
			const newValue = !prev;
			setSorting([{ id: 'timestamp', desc: newValue }]);
			return newValue;
		});
	};

	// Define columns
	const columns = useMemo<ColumnDef<LogEntry>[]>(
		() => [
			{
				accessorKey: 'timestamp',
				header: 'Time',
				cell: (info) => {
					const date = new Date(info.getValue() as string);
					const timeStr = date.toLocaleTimeString('en-US', {
						hour12: false,
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
					});
					const ms = date.getMilliseconds().toString().padStart(3, '0');
					return `${timeStr}.${ms}`;
				},
				size: 120,
			},
			{
				accessorKey: 'level',
				header: 'Level',
				cell: (info) => {
					const level = info.getValue() as string;
					const colors: Record<string, string> = {
						log: '#a1a1aa',
						info: '#3b82f6',
						warn: '#f59e0b',
						error: '#ef4444',
						debug: '#8b5cf6',
					};
					return (
						<span
							style={{
								color: colors[level] || '#a1a1aa',
								fontWeight: 500,
								textTransform: 'uppercase',
								fontSize: '11px',
							}}
						>
							{level}
						</span>
					);
				},
				size: 70,
				filterFn: 'equals',
			},
			{
				accessorKey: 'context',
				header: 'Context',
				cell: (info) => (
					<span
						style={{
							fontFamily: 'monospace',
							fontSize: '12px',
							color: '#a1a1aa',
						}}
					>
						{info.getValue() as string}
					</span>
				),
				size: 120,
			},
			{
				accessorKey: 'message',
				header: 'Message',
				cell: (info) => {
					const row = info.row.original;
					const hasData = row.data !== undefined && row.data !== null;
					const isExpanded = expandedRows.has(info.row.id);

					return (
						<div>
							<div
								style={{
									fontSize: '13px',
									color: '#e5e5e5',
									wordBreak: 'break-word',
									display: 'flex',
									alignItems: 'flex-start',
									gap: '8px',
								}}
							>
								<div style={{ width: '16px', flexShrink: 0 }}>
									{hasData && (
										<button
											onClick={() => toggleRow(info.row.id)}
											style={{
												background: 'none',
												border: 'none',
												cursor: 'pointer',
												padding: '0',
												display: 'flex',
												alignItems: 'center',
												color: '#a1a1aa',
												transition: 'transform 0.2s',
												transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
											}}
										>
											<ChevronRight size={16} />
										</button>
									)}
								</div>
								<span style={{ flex: 1 }}>{info.getValue() as string}</span>
							</div>
							{hasData && isExpanded && (
								<div
									style={{
										marginTop: '8px',
										marginLeft: '24px',
									}}
								>
									<ReactJson
										src={row.data}
										theme="monokai"
										collapsed={false}
										displayDataTypes={false}
										displayObjectSize={false}
										enableClipboard={false}
										name={false}
										iconStyle="triangle"
										style={{
											background: '#171717',
											padding: '8px',
											borderRadius: '4px',
											fontSize: '12px',
										}}
									/>
								</div>
							)}
						</div>
					);
				},
				size: 600,
			},
		],
		[expandedRows],
	);

	const table = useReactTable({
		data: logs,
		columns,
		state: {
			sorting,
			columnFilters,
			globalFilter,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn: 'includesString',
	});

	const { rows } = table.getRowModel();

	// Virtualization
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => tableContainerRef.current,
		estimateSize: () => 40,
		overscan: 10,
	});

	const virtualRows = rowVirtualizer.getVirtualItems();
	const totalSize = rowVirtualizer.getTotalSize();
	const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
	const paddingBottom =
		virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

	return (
		<div style={{ width: '100%' }}>
			{/* Search and Filter Controls */}
			<div
				style={{
					marginBottom: '16px',
					display: 'flex',
					gap: '12px',
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				{/* Global Search */}
				<div style={{ position: 'relative', flex: '1 1 300px' }}>
					<Search
						size={16}
						style={{
							position: 'absolute',
							left: '12px',
							top: '50%',
							transform: 'translateY(-50%)',
							color: '#71717a',
						}}
					/>
					<input
						type="text"
						value={globalFilter ?? ''}
						onChange={(e) => setGlobalFilter(e.target.value)}
						placeholder="Search all logs..."
						style={{
							width: '100%',
							padding: '8px 36px 8px 36px',
							background: '#171717',
							border: '1px solid #1a1a1a',
							borderRadius: '6px',
							color: '#e5e5e5',
							fontSize: '13px',
						}}
					/>
					{globalFilter && (
						<button
							onClick={() => setGlobalFilter('')}
							style={{
								position: 'absolute',
								right: '8px',
								top: '50%',
								transform: 'translateY(-50%)',
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								color: '#71717a',
								padding: '4px',
								display: 'flex',
								alignItems: 'center',
							}}
						>
							<X size={16} />
						</button>
					)}
				</div>

				{/* Level Filter */}
				<select
					value={(table.getColumn('level')?.getFilterValue() as string) ?? 'all'}
					onChange={(e) => {
						const value = e.target.value;
						table.getColumn('level')?.setFilterValue(value === 'all' ? undefined : value);
					}}
					style={{
						padding: '8px 12px',
						background: '#171717',
						border: '1px solid #1a1a1a',
						borderRadius: '6px',
						color: '#e5e5e5',
						fontSize: '13px',
						cursor: 'pointer',
					}}
				>
					<option value="all">All Levels</option>
					<option value="log">Log</option>
					<option value="info">Info</option>
					<option value="warn">Warn</option>
					<option value="error">Error</option>
					<option value="debug">Debug</option>
				</select>

				{/* Sort Order Toggle */}
				<button
					onClick={toggleSortOrder}
					style={{
						padding: '8px 12px',
						background: '#171717',
						border: '1px solid #1a1a1a',
						borderRadius: '6px',
						color: '#e5e5e5',
						fontSize: '13px',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
					}}
					title={newestFirst ? 'Newest first' : 'Oldest first'}
				>
					{newestFirst ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
					{newestFirst ? 'Newest' : 'Oldest'}
				</button>

				{/* Results Count */}
				<span style={{ color: '#71717a', fontSize: '13px', whiteSpace: 'nowrap' }}>
					{rows.length} {rows.length === 1 ? 'log' : 'logs'}
					{rows.length !== logs.length && ` (filtered from ${logs.length})`}
				</span>

				{/* Clear Filters */}
				{(globalFilter || columnFilters.length > 0) && (
					<button
						onClick={() => {
							setGlobalFilter('');
							setColumnFilters([]);
							onClearFilter?.();
						}}
						style={{
							padding: '8px 12px',
							background: '#171717',
							border: '1px solid #1a1a1a',
							borderRadius: '6px',
							color: '#ef4444',
							fontSize: '13px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: '6px',
						}}
					>
						<X size={14} />
						Clear Filters
					</button>
				)}
			</div>

			{/* Table */}
			<div
				ref={tableContainerRef}
				style={{
					height,
					overflow: 'auto',
					border: '1px solid #1a1a1a',
					borderRadius: '6px',
					background: '#0a0a0a',
				}}
			>
				<table
					style={{
						width: '100%',
						borderCollapse: 'collapse',
						fontSize: '13px',
					}}
				>
					<thead
						style={{
							position: 'sticky',
							top: 0,
							background: '#171717',
							zIndex: 1,
							borderBottom: '1px solid #1a1a1a',
						}}
					>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										style={{
											padding: '12px',
											textAlign: 'left',
											color: '#a1a1aa',
											fontWeight: 600,
											fontSize: '12px',
											textTransform: 'uppercase',
											letterSpacing: '0.5px',
											cursor: header.column.getCanSort() ? 'pointer' : 'default',
											userSelect: 'none',
											width: header.getSize(),
										}}
										onClick={header.column.getToggleSortingHandler()}
									>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '6px',
											}}
										>
											{flexRender(header.column.columnDef.header, header.getContext())}
											{header.column.getIsSorted() && (
												<span style={{ color: '#3b82f6' }}>
													{header.column.getIsSorted() === 'asc' ? (
														<ChevronUp size={14} />
													) : (
														<ChevronDown size={14} />
													)}
												</span>
											)}
										</div>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{paddingTop > 0 && (
							<tr>
								<td style={{ height: `${paddingTop}px` }} />
							</tr>
						)}
						{virtualRows.map((virtualRow) => {
							const row = rows[virtualRow.index];
							return (
								<tr
									key={row.id}
									style={{
										borderBottom: '1px solid #1a1a1a',
										transition: 'background 0.1s',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = '#171717';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = 'transparent';
									}}
								>
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											style={{
												padding: '10px 12px',
												verticalAlign: 'top',
											}}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							);
						})}
						{paddingBottom > 0 && (
							<tr>
								<td style={{ height: `${paddingBottom}px` }} />
							</tr>
						)}
					</tbody>
				</table>

				{/* Empty State */}
				{rows.length === 0 && (
					<div
						style={{
							padding: '48px 24px',
							textAlign: 'center',
							color: '#71717a',
						}}
					>
						<p style={{ fontSize: '14px', marginBottom: '8px' }}>No logs found</p>
						<p style={{ fontSize: '12px' }}>
							{logs.length === 0
								? 'Logs will appear here as the extension runs'
								: 'Try adjusting your filters'}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default LogViewer;

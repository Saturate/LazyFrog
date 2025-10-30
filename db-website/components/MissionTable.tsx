'use client';

import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	ColumnDef,
	flexRender,
	SortingState,
	FilterFn,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ExternalLink, Star, X } from 'lucide-react';
import {
	MissionRecord,
	ENVIRONMENT_LABELS,
	ENCOUNTER_LABELS,
	EncounterType,
} from '@lazyfrog/types';
import { DatabaseFilters } from './MissionFilters';

interface MissionTableProps {
	missions: MissionRecord[];
	filters: DatabaseFilters;
}

export function MissionTable({ missions, filters }: MissionTableProps) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
	const [selectedMission, setSelectedMission] = useState<MissionRecord | null>(null);

	// Custom filter function that applies all our filters
	const customFilterFn: FilterFn<MissionRecord> = (row, columnId, filterValue) => {
		const mission = row.original;
		const filters = filterValue as DatabaseFilters;

		// Search query
		if (filters.searchQuery) {
			const query = filters.searchQuery.toLowerCase();
			const searchableText = [
				mission.missionTitle,
				mission.foodName,
				mission.environment,
				mission.metadata?.missionAuthorName,
				mission.tags,
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();

			if (!searchableText.includes(query)) return false;
		}

		// Difficulty filter
		if (filters.difficulties.length > 0) {
			if (!filters.difficulties.includes(mission.difficulty)) return false;
		}

		// Level range filter
		if (mission.minLevel > filters.maxLevel || mission.maxLevel < filters.minLevel) {
			return false;
		}

		// Environment filter
		if (filters.environments.length > 0) {
			if (!filters.environments.includes(mission.environment)) return false;
		}

		// Encounter types filter
		if (filters.encounterTypes.length > 0) {
			const missionEncounterTypes =
				mission.metadata?.mission?.encounters?.map((e) => e.type as EncounterType) || [];
			const hasMatchingEncounter = filters.encounterTypes.some((type) =>
				missionEncounterTypes.includes(type),
			);
			if (!hasMatchingEncounter) return false;
		}

		// Rarity filter
		if (filters.rarities.length > 0) {
			const missionRarity = mission.metadata?.mission?.rarity;
			if (!missionRarity || !filters.rarities.includes(missionRarity)) return false;
		}

		// Miniboss filter (crossroadsFight encounters are miniboss encounters)
		if (filters.hasMiniboss !== null) {
			const hasMiniboss =
				mission.metadata?.mission?.encounters?.some(
					(e) => (e.type as string) === 'crossroadsFight',
				) || false;
			if (filters.hasMiniboss !== hasMiniboss) return false;
		}

		// Boss Rush filter (missions with type === "bossRush")
		if (filters.hasBossRush !== null) {
			const hasBossRush = (mission.metadata?.mission?.type as string) === 'bossRush';
			if (filters.hasBossRush !== hasBossRush) return false;
		}

		// Boss Loot filter (missions with boss encounters)
		if (filters.hasBossLoot !== null) {
			const hasBossLoot =
				mission.metadata?.mission?.encounters?.some((e) => (e.type as string) === 'boss') || false;
			if (filters.hasBossLoot !== hasBossLoot) return false;
		}

		return true;
	};

	const columns = useMemo<ColumnDef<MissionRecord>[]>(
		() => [
			{
				id: 'title',
				accessorKey: 'missionTitle',
				header: 'Mission',
				cell: (info) => (
					<div className="min-w-[150px] max-w-[250px]">
						<button
							onClick={() => setSelectedMission(info.row.original)}
							className="font-medium text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-left truncate block w-full"
							title={(info.getValue() as string) || 'Untitled Mission'}
						>
							{(info.getValue() as string) || 'Untitled Mission'}
						</button>
						<a
							href={info.row.original.permalink}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-1"
							onClick={(e) => e.stopPropagation()}
						>
							View on Reddit <ExternalLink className="w-3 h-3" />
						</a>
					</div>
				),
			},
			{
				id: 'environment',
				accessorKey: 'environment',
				header: 'Environment',
				cell: (info) => {
					const env = info.getValue() as keyof typeof ENVIRONMENT_LABELS;
					return (
						<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap">
							{ENVIRONMENT_LABELS[env] || env || 'Unknown'}
						</span>
					);
				},
			},
			{
				id: 'difficulty',
				accessorKey: 'difficulty',
				header: 'Difficulty',
				cell: (info) => (
					<div className="flex items-center gap-0.5 flex-wrap max-w-[120px]">
						{Array.from({ length: info.getValue() as number }).map((_, i) => (
							<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
						))}
					</div>
				),
			},
			{
				id: 'levels',
				accessorFn: (row) => `${row.minLevel}-${row.maxLevel}`,
				header: 'Level Range',
				cell: (info) => {
					const row = info.row.original;
					return (
						<div className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
							{row.minLevel} - {row.maxLevel}
						</div>
					);
				},
			},
			{
				id: 'encounters',
				header: 'Encounters',
				cell: (info) => {
					const encounters = info.row.original.metadata?.mission?.encounters || [];
					const uniqueTypes = [...new Set(encounters.map((e) => e.type))];
					const hasMiniboss = encounters.some((e) => (e.type as string) === 'crossroadsFight');
					const hasBossRush = (info.row.original.metadata?.mission?.type as string) === 'bossRush';
					const hasBossLoot = encounters.some((e) => (e.type as string) === 'boss');

					return (
						<div className="group relative">
							<button className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
								{uniqueTypes.length} {hasMiniboss && '👑'} {hasBossRush && '🔥'}{' '}
								{hasBossLoot && '💎'}
							</button>
							<div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg p-3 min-w-[200px]">
								<div className="flex flex-wrap gap-1">
									{uniqueTypes.map((type) => (
										<span
											key={type}
											className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
										>
											{ENCOUNTER_LABELS[type as EncounterType] || type}
										</span>
									))}
								</div>
								{hasMiniboss && (
									<div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
										Contains Miniboss
									</div>
								)}
								{hasBossRush && (
									<div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
										Boss Rush Mission
									</div>
								)}
								{hasBossLoot && (
									<div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
										Contains Boss Loot
									</div>
								)}
							</div>
						</div>
					);
				},
			},
			{
				id: 'rarity',
				accessorFn: (row) => row.metadata?.mission?.rarity,
				header: 'Rarity',
				cell: (info) => {
					const rarity = info.getValue() as string;
					const rarityColors: Record<string, string> = {
						common: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
						rare: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
						epic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
						legendary: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
						mythic: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
					};
					return (
						<span
							className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${rarityColors[rarity] || rarityColors.common}`}
						>
							{rarity || 'Unknown'}
						</span>
					);
				},
			},
			{
				id: 'timestamp',
				accessorKey: 'timestamp',
				header: 'Added',
				cell: (info) => (
					<div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
						{new Date(info.getValue() as number).toLocaleDateString()}
					</div>
				),
			},
		],
		[],
	);

	const table = useReactTable({
		data: missions,
		columns,
		state: {
			sorting,
			globalFilter: filters,
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn: customFilterFn,
		initialState: {
			pagination: {
				pageSize: 50,
			},
		},
	});

	const filteredCount = table.getFilteredRowModel().rows.length;
	const totalCount = missions.length;

	return (
		<div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg overflow-hidden">
			{/* Results count */}
			<div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Showing{' '}
					<span className="font-semibold text-gray-900 dark:text-white">{filteredCount}</span> of{' '}
					<span className="font-semibold text-gray-900 dark:text-white">{totalCount}</span> missions
				</p>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead className="bg-gray-50 dark:bg-zinc-900">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
										onClick={header.column.getToggleSortingHandler()}
									>
										<div className="flex items-center gap-2">
											{flexRender(header.column.columnDef.header, header.getContext())}
											{header.column.getIsSorted() && (
												<span>
													{header.column.getIsSorted() === 'asc' ? (
														<ChevronUp className="w-4 h-4" />
													) : (
														<ChevronDown className="w-4 h-4" />
													)}
												</span>
											)}
										</div>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
						{table.getRowModel().rows.map((row) => (
							<tr
								key={row.id}
								className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="px-3 py-2 whitespace-nowrap">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-700 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<button
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
						className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
					>
						First
					</button>
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
					>
						Previous
					</button>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
					>
						Next
					</button>
					<button
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
						className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
					>
						Last
					</button>
				</div>
				<span className="text-sm text-gray-600 dark:text-gray-400">
					Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
				</span>
			</div>

			{/* Mission Detail Modal */}
			{selectedMission && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={() => setSelectedMission(null)}
				>
					<div
						className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 p-6 flex items-start justify-between">
							<div className="flex-1">
								<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
									{selectedMission.missionTitle}
								</h2>
								<div className="flex items-center gap-3 flex-wrap">
									<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
										{ENVIRONMENT_LABELS[selectedMission.environment] ||
											selectedMission.environment ||
											'Unknown'}
									</span>
									<div className="flex items-center gap-1">
										{Array.from({ length: selectedMission.difficulty }).map((_, i) => (
											<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
										))}
									</div>
									<span className="text-sm text-gray-600 dark:text-gray-400">
										Levels {selectedMission.minLevel} - {selectedMission.maxLevel}
									</span>
								</div>
							</div>
							<button
								onClick={() => setSelectedMission(null)}
								className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Content */}
						<div className="p-6 space-y-6">
							{/* Mission Details */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
										Food Reward
									</h3>
									<p className="text-base font-medium text-gray-900 dark:text-white">
										{selectedMission.foodName}
									</p>
								</div>
								<div>
									<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
										Author
									</h3>
									<p className="text-base font-medium text-gray-900 dark:text-white">
										{selectedMission.metadata?.missionAuthorName || 'Unknown'}
									</p>
								</div>
								<div>
									<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
										Posted
									</h3>
									<p className="text-base font-medium text-gray-900 dark:text-white">
										{new Date(selectedMission.timestamp).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'short',
											day: 'numeric',
										})}
									</p>
								</div>
								<div>
									<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
										Rarity
									</h3>
									<p className="text-base font-medium text-gray-900 dark:text-white capitalize">
										{selectedMission.metadata?.mission?.rarity || 'Unknown'}
									</p>
								</div>
							</div>

							{/* Encounters */}
							{selectedMission.metadata?.mission?.encounters && (
								<div>
									<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
										Encounters
									</h3>
									<div className="space-y-2">
										{selectedMission.metadata.mission.encounters.map((encounter, idx) => (
											<div
												key={idx}
												className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg"
											>
												<div className="flex items-center gap-3">
													<span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
														{ENCOUNTER_LABELS[encounter.type as EncounterType] || encounter.type}
													</span>
													{(encounter.type as string) === 'crossroadsFight' && (
														<span className="text-sm font-medium text-amber-600 dark:text-amber-400">
															👑 Miniboss
														</span>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Links */}
							<div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
								<a
									href={selectedMission.permalink}
									target="_blank"
									rel="noopener noreferrer"
									className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
								>
									View on Reddit <ExternalLink className="w-4 h-4" />
								</a>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

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
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
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
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true },
  ]);

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
      const missionEncounterTypes = mission.metadata?.mission?.encounters?.map(e => e.type) || [];
      const hasMatchingEncounter = filters.encounterTypes.some(type =>
        missionEncounterTypes.includes(type)
      );
      if (!hasMatchingEncounter) return false;
    }

    // Miniboss filter
    if (filters.hasMiniboss !== null) {
      const hasMiniboss = mission.metadata?.mission?.encounters?.some(
        e => e.type === 'crossroads'
      ) || false;
      if (filters.hasMiniboss !== hasMiniboss) return false;
    }

    return true;
  };

  const columns = useMemo<ColumnDef<MissionRecord>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'missionTitle',
        header: 'Mission',
        cell: info => (
          <div className="min-w-[200px]">
            <div className="font-medium text-gray-900 dark:text-white">
              {info.getValue() as string || 'Untitled Mission'}
            </div>
            <a
              href={info.row.original.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-1"
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
        cell: info => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {ENVIRONMENT_LABELS[info.getValue() as keyof typeof ENVIRONMENT_LABELS]}
          </span>
        ),
      },
      {
        id: 'difficulty',
        accessorKey: 'difficulty',
        header: 'Difficulty',
        cell: info => (
          <div className="flex items-center gap-1 flex-wrap max-w-[100px]">
            {Array.from({ length: info.getValue() as number }).map((_, i) => (
              <span key={i} className="text-lg">⭐</span>
            ))}
          </div>
        ),
      },
      {
        id: 'levels',
        accessorFn: row => `${row.minLevel}-${row.maxLevel}`,
        header: 'Level Range',
        cell: info => {
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
        cell: info => {
          const encounters = info.row.original.metadata?.mission?.encounters || [];
          const uniqueTypes = [...new Set(encounters.map(e => e.type))];
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {uniqueTypes.map(type => (
                <span
                  key={type}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  {ENCOUNTER_LABELS[type as EncounterType]}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: 'author',
        accessorFn: row => row.metadata?.missionAuthorName,
        header: 'Author',
        cell: info => (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {info.getValue() as string || 'Unknown'}
          </div>
        ),
      },
      {
        id: 'timestamp',
        accessorKey: 'timestamp',
        header: 'Added',
        cell: info => (
          <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {new Date(info.getValue() as number).toLocaleDateString()}
          </div>
        ),
      },
    ],
    []
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
          Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredCount}</span> of{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{totalCount}</span> missions
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-zinc-900">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
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
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
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
    </div>
  );
}

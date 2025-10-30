'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MissionRecord, MissionsDatabase } from '@lazyfrog/types';
import { MissionFilters, DatabaseFilters } from '@/components/MissionFilters';
import { MissionTable } from '@/components/MissionTable';
import { DatabaseDownloadButton } from '@/components/DatabaseDownloadButton';
import { Database, AlertCircle } from 'lucide-react';

const MissionStats = dynamic(() => import('@/components/MissionStats').then(mod => ({ default: mod.MissionStats })), {
  ssr: false,
  loading: () => (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>
  )
});

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/Saturate/LazyFrog/refs/heads/main/db/missions.json';

const INITIAL_FILTERS: DatabaseFilters = {
  searchQuery: '',
  difficulties: [],
  minLevel: 0,
  maxLevel: 1000,
  environments: [],
  encounterTypes: [],
  rarities: [],
  hasMiniboss: null,
};

export default function DatabasePage() {
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DatabaseFilters>(INITIAL_FILTERS);

  useEffect(() => {
    // Load filters from localStorage
    const savedFilters = localStorage.getItem('databaseFilters');
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Failed to parse saved filters:', e);
      }
    }

    // Fetch missions from GitHub
    const fetchMissions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(GITHUB_RAW_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch missions: ${response.status} ${response.statusText}`);
        }

        const data: MissionsDatabase = await response.json();

        // Convert object to array
        const missionsArray = Object.values(data);
        setMissions(missionsArray);
      } catch (err) {
        console.error('Error fetching missions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load missions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMissions();
  }, []);

  useEffect(() => {
    // Save filters to localStorage whenever they change
    localStorage.setItem('databaseFilters', JSON.stringify(filters));
  }, [filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="mx-auto px-4 py-12 max-w-[1800px]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-600 rounded-full">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                FrogDB
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Sword & Supper Mission Database
              </p>
            </div>
          </div>

          {/* Download Button */}
          <div className="flex items-center gap-4 mt-6">
            <DatabaseDownloadButton missions={missions} isLoading={isLoading} />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
                  Failed to Load Missions
                </h3>
                <p className="text-red-700 dark:text-red-300">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <MissionStats missions={missions} isLoading={isLoading} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <MissionFilters filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Table */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading missions...</p>
              </div>
            ) : missions.length === 0 && !error ? (
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-12 text-center">
                <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No missions found</p>
              </div>
            ) : (
              <MissionTable missions={missions} filters={filters} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

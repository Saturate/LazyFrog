import { Search, X } from 'lucide-react';
import {
  Environment,
  EncounterType,
  ENVIRONMENT_LABELS,
  ENCOUNTER_LABELS,
} from '@lazyfrog/types';

export interface DatabaseFilters {
  searchQuery: string;
  difficulties: number[];
  minLevel: number;
  maxLevel: number;
  environments: Environment[];
  encounterTypes: EncounterType[];
  hasMiniboss: boolean | null;
}

interface MissionFiltersProps {
  filters: DatabaseFilters;
  onFiltersChange: (filters: DatabaseFilters) => void;
}

export function MissionFilters({ filters, onFiltersChange }: MissionFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, searchQuery: e.target.value });
  };

  const toggleDifficulty = (star: number) => {
    const newDifficulties = filters.difficulties.includes(star)
      ? filters.difficulties.filter(s => s !== star)
      : [...filters.difficulties, star];
    onFiltersChange({ ...filters, difficulties: newDifficulties });
  };

  const toggleEnvironment = (env: Environment) => {
    const newEnvironments = filters.environments.includes(env)
      ? filters.environments.filter(e => e !== env)
      : [...filters.environments, env];
    onFiltersChange({ ...filters, environments: newEnvironments });
  };

  const toggleEncounterType = (type: EncounterType) => {
    const newTypes = filters.encounterTypes.includes(type)
      ? filters.encounterTypes.filter(t => t !== type)
      : [...filters.encounterTypes, type];
    onFiltersChange({ ...filters, encounterTypes: newTypes });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      difficulties: [],
      minLevel: 0,
      maxLevel: 1000,
      environments: [],
      encounterTypes: [],
      hasMiniboss: null,
    });
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.difficulties.length > 0 ||
    filters.minLevel > 0 ||
    filters.maxLevel < 1000 ||
    filters.environments.length > 0 ||
    filters.encounterTypes.length > 0 ||
    filters.hasMiniboss !== null;

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="Search missions, food, author..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Difficulty */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Difficulty
        </label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => toggleDifficulty(star)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filters.difficulties.includes(star)
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
              }`}
            >
              {'⭐'.repeat(star)}
            </button>
          ))}
        </div>
      </div>

      {/* Level Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Level Range: {filters.minLevel} - {filters.maxLevel}
        </label>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Min Level</label>
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={filters.minLevel}
              onChange={e => onFiltersChange({ ...filters, minLevel: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Max Level</label>
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={filters.maxLevel}
              onChange={e => onFiltersChange({ ...filters, maxLevel: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Environments */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Environment
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ENVIRONMENT_LABELS) as Environment[]).map(env => (
            <button
              key={env}
              onClick={() => toggleEnvironment(env)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                filters.environments.includes(env)
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
              }`}
            >
              {ENVIRONMENT_LABELS[env]}
            </button>
          ))}
        </div>
      </div>

      {/* Encounter Types */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Encounter Types
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ENCOUNTER_LABELS) as EncounterType[]).map(type => (
            <button
              key={type}
              onClick={() => toggleEncounterType(type)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                filters.encounterTypes.includes(type)
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
              }`}
            >
              {ENCOUNTER_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Miniboss Toggle */}
      <div className="mb-0">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Miniboss
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onFiltersChange({ ...filters, hasMiniboss: null })}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
              filters.hasMiniboss === null
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
            }`}
          >
            Any
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, hasMiniboss: true })}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
              filters.hasMiniboss === true
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
            }`}
          >
            With
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, hasMiniboss: false })}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
              filters.hasMiniboss === false
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
            }`}
          >
            Without
          </button>
        </div>
      </div>
    </div>
  );
}

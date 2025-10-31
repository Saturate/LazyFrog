/**
 * React hook for managing automation filters
 */

import { useState, useEffect, useCallback } from 'react';
import { AutomationFilters } from './storageTypes';
import { getAutomationFilters, setAutomationFilters } from './getAutomationFilters';

/**
 * Hook to manage automation filters with Chrome storage
 * Automatically loads from storage on mount and provides setter
 */
export function useAutomationFilters() {
	const [filters, setFiltersState] = useState<AutomationFilters | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Load filters on mount
	useEffect(() => {
		let mounted = true;

		getAutomationFilters()
			.then((loadedFilters) => {
				if (mounted) {
					setFiltersState(loadedFilters);
					setIsLoading(false);
				}
			})
			.catch((err) => {
				if (mounted) {
					setError(err);
					setIsLoading(false);
				}
			});

		return () => {
			mounted = false;
		};
	}, []);

	// Update filters in state and storage
	const updateFilters = useCallback(async (updates: Partial<AutomationFilters>) => {
		if (!filters) return;

		const newFilters = { ...filters, ...updates };
		setFiltersState(newFilters);

		try {
			await setAutomationFilters(newFilters);
		} catch (err) {
			setError(err as Error);
			// Revert on error
			setFiltersState(filters);
		}
	}, [filters]);

	// Replace filters entirely
	const replaceFilters = useCallback(async (newFilters: AutomationFilters) => {
		setFiltersState(newFilters);

		try {
			await setAutomationFilters(newFilters);
		} catch (err) {
			setError(err as Error);
			// Revert on error
			if (filters) {
				setFiltersState(filters);
			}
		}
	}, [filters]);

	return {
		filters,
		isLoading,
		error,
		updateFilters,
		replaceFilters,
	};
}

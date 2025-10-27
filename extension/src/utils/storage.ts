/**
 * Chrome Storage Utility - Legacy compatibility layer
 * 
 * This file re-exports all storage functions for backward compatibility.
 * New code should import directly from lib/storage/* files instead.
 * 
 * @deprecated Import directly from lib/storage/* instead
 */

// Types
export * from '../lib/storage/types';

// Automation filters
export * from '../lib/storage/getAutomationFilters';
export * from '../lib/storage/useAutomationFilters';

// Mission CRUD
export * from '../lib/storage/missions';

// Mission queries and filtering
export * from '../lib/storage/missionQueries';

// Mission statistics
export * from '../lib/storage/missionStats';

// User options
export * from '../lib/storage/userOptions';

// Storage statistics
export * from '../lib/storage/storageStats';

// DOM utilities
export * from '../lib/storage/domUtils';

/**
 * Import Database Modal
 * Shows progress and results when importing missions from FrogDB
 */

import React, { useState, useEffect } from 'react';
import { X, Download, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { MissionsDatabase } from '../../lib/storage/types';
import { importMissions, getAllMissions } from '../../lib/storage/missions';

interface ImportDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportProgress {
  phase: 'fetching' | 'processing' | 'complete' | 'error';
  message: string;
  processedCount?: number;
  totalCount?: number;
}

interface ImportResults {
  newMissions: number;
  updatedMissions: number;
  skippedMissions: number;
  totalInDatabase: number;
}

const GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/Saturate/LazyFrog/refs/heads/main/db/missions.json';

export const ImportDatabaseModal: React.FC<ImportDatabaseModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [progress, setProgress] = useState<ImportProgress>({
    phase: 'fetching',
    message: 'Connecting to FrogDB...',
  });
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startImport();
    }
  }, [isOpen]);

  const startImport = async () => {
    try {
      // Reset state
      setProgress({ phase: 'fetching', message: 'Fetching missions from FrogDB...' });
      setResults(null);
      setError(null);

      // Fetch missions from GitHub
      const response = await fetch(GITHUB_RAW_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const data: MissionsDatabase = await response.json();
      const missionsArray = Object.values(data);

      setProgress({
        phase: 'processing',
        message: 'Processing missions...',
        totalCount: missionsArray.length,
        processedCount: 0,
      });

      // Get existing missions to track changes
      const existingMissions = await getAllMissions();
      const existingPostIds = new Set(Object.keys(existingMissions));

      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      // Import missions in batches
      const batchSize = 50;
      for (let i = 0; i < missionsArray.length; i += batchSize) {
        const batch = missionsArray.slice(i, i + batchSize);

        // Track which are new vs updates
        for (const mission of batch) {
          if (existingPostIds.has(mission.postId)) {
            updatedCount++;
          } else {
            newCount++;
          }
        }

        // Import the batch
        await importMissions(batch);

        setProgress({
          phase: 'processing',
          message: 'Processing missions...',
          totalCount: missionsArray.length,
          processedCount: Math.min(i + batchSize, missionsArray.length),
        });

        // Small delay to prevent UI blocking
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      skippedCount = missionsArray.length - newCount - updatedCount;

      // Complete
      const finalResults: ImportResults = {
        newMissions: newCount,
        updatedMissions: updatedCount,
        skippedMissions: skippedCount,
        totalInDatabase: missionsArray.length,
      };

      setResults(finalResults);
      setProgress({
        phase: 'complete',
        message: 'Import complete!',
      });

      // Notify parent to refresh
      onImportComplete();
    } catch (err) {
      console.error('Import error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setProgress({
        phase: 'error',
        message: 'Import failed',
      });
    }
  };

  const handleClose = () => {
    if (progress.phase !== 'fetching' && progress.phase !== 'processing') {
      onClose();
    }
  };

  const handleRetry = () => {
    startImport();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#18181b',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          border: '1px solid #27272a',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Download size={24} style={{ color: '#22c55e' }} />
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e5e5e5', margin: 0 }}>
              Import from FrogDB
            </h2>
          </div>
          {progress.phase !== 'fetching' && progress.phase !== 'processing' && (
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Progress/Error/Success */}
        <div style={{ marginBottom: '20px' }}>
          {progress.phase === 'error' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <AlertCircle size={24} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: '16px', color: '#e5e5e5' }}>{progress.message}</span>
              </div>
              {error && (
                <div
                  style={{
                    padding: '12px',
                    background: '#7f1d1d',
                    borderRadius: '6px',
                    marginBottom: '12px',
                  }}
                >
                  <p style={{ fontSize: '14px', color: '#fca5a5', margin: 0 }}>{error}</p>
                </div>
              )}
              <button
                onClick={handleRetry}
                style={{
                  padding: '8px 16px',
                  background: '#22c55e',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Retry
              </button>
            </div>
          ) : progress.phase === 'complete' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <CheckCircle size={24} style={{ color: '#22c55e' }} />
                <span style={{ fontSize: '16px', color: '#e5e5e5' }}>{progress.message}</span>
              </div>

              {results && (
                <div
                  style={{
                    padding: '16px',
                    background: '#171717',
                    borderRadius: '8px',
                    border: '1px solid #27272a',
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa', marginBottom: '12px' }}>
                    Import Results
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#e5e5e5' }}>New missions:</span>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: results.newMissions > 0 ? '#22c55e' : '#71717a',
                        }}
                      >
                        {results.newMissions}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#e5e5e5' }}>Updated missions:</span>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: results.updatedMissions > 0 ? '#3b82f6' : '#71717a',
                        }}
                      >
                        {results.updatedMissions}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#e5e5e5' }}>Total in database:</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#e5e5e5' }}>
                        {results.totalInDatabase}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: '#22c55e',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  width: '100%',
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Loader size={24} style={{ color: '#22c55e', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '16px', color: '#e5e5e5' }}>{progress.message}</span>
              </div>

              {progress.totalCount && progress.processedCount !== undefined && (
                <div>
                  {/* Progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: '#27272a',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: `${(progress.processedCount / progress.totalCount) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(to right, #22c55e, #16a34a)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '14px', color: '#a1a1aa' }}>
                    {progress.processedCount} / {progress.totalCount}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        {progress.phase === 'fetching' && (
          <div
            style={{
              padding: '12px',
              background: '#171717',
              borderRadius: '6px',
              border: '1px solid #27272a',
            }}
          >
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
              Importing community-contributed missions from the FrogDB database...
            </p>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

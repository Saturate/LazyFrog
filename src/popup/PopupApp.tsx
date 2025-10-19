/**
 * Main Popup App Component
 */

import React, { useState, useEffect } from 'react';
import { LevelFilters, Level } from '../types';
import './popup.css';

const PopupApp: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [filters, setFilters] = useState<LevelFilters>({
    stars: [1, 2],
    minLevel: 1,
    maxLevel: 340,
    onlyIncomplete: true,
    autoProcess: false,
  });
  const [levels, setLevels] = useState<Level[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    chrome.storage.local.get(['filters'], (result) => {
      if (result.filters) {
        setFilters(result.filters);
      }
    });

    // Listen for messages
    const messageListener = (message: any) => {
      if (message.type === 'LEVELS_FOUND') {
        setLevels(message.levels);
        setShowResults(true);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Save filters when they change
  useEffect(() => {
    chrome.storage.local.set({ filters });
  }, [filters]);

  const handleStart = () => {
    chrome.runtime.sendMessage(
      {
        type: 'START_BOT',
        filters,
      },
      () => {
        setIsRunning(true);
      }
    );
  };

  const handleStop = () => {
    chrome.runtime.sendMessage(
      {
        type: 'STOP_BOT',
      },
      () => {
        setIsRunning(false);
      }
    );
  };

  const handleScan = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            type: 'GET_LEVELS',
            filters,
          },
          (response) => {
            if (response?.levels) {
              setLevels(response.levels);
              setShowResults(true);
            }
          }
        );
      }
    });
  };

  const updateFilter = (key: keyof LevelFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>⚔️ Sword & Supper Bot</h1>
        <p className="subtitle">Automate level completion</p>
      </header>

      <div className="status">
        <div className={`status-indicator ${isRunning ? 'running' : ''}`}>
          <span className="dot"></span>
          <span>{isRunning ? 'Running' : 'Idle'}</span>
        </div>
      </div>

      <div className="section">
        <h3>Filters</h3>

        <div className="form-group">
          <label>Star Difficulty:</label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <label key={star} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.stars.includes(star)}
                  onChange={(e) => {
                    const newStars = e.target.checked
                      ? [...filters.stars, star]
                      : filters.stars.filter((s) => s !== star);
                    updateFilter('stars', newStars.sort());
                  }}
                  disabled={isRunning}
                />
                <span style={{ fontSize: '14px' }}>{'★'.repeat(star)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="minLevel">Min Level:</label>
          <input
            type="number"
            id="minLevel"
            value={filters.minLevel}
            onChange={(e) => updateFilter('minLevel', parseInt(e.target.value) || 1)}
            disabled={isRunning}
            min="1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="maxLevel">Max Level:</label>
          <input
            type="number"
            id="maxLevel"
            value={filters.maxLevel}
            onChange={(e) => updateFilter('maxLevel', parseInt(e.target.value) || 340)}
            disabled={isRunning}
            min="1"
          />
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={filters.onlyIncomplete}
              onChange={(e) => updateFilter('onlyIncomplete', e.target.checked)}
              disabled={isRunning}
            />
            Only show incomplete levels
          </label>
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={filters.autoProcess || false}
              onChange={(e) => updateFilter('autoProcess', e.target.checked)}
              disabled={isRunning}
            />
            Auto-process levels
          </label>
        </div>
      </div>

      <div className="section">
        <h3>Controls</h3>
        <div className="button-group">
          <button className="btn btn-primary" onClick={handleStart} disabled={isRunning}>
            Start Bot
          </button>
          <button className="btn btn-secondary" onClick={handleStop} disabled={!isRunning}>
            Stop Bot
          </button>
        </div>
        <button className="btn btn-outline" onClick={handleScan}>
          Scan Levels
        </button>
      </div>

      {showResults && (
        <div className="section">
          <h3>Results</h3>
          <div className="results-content">
            {levels.length === 0 ? (
              <p>No levels found matching the filters.</p>
            ) : (
              <>
                <p>
                  <strong>{levels.length} level(s) found</strong>
                </p>
                {levels.slice(0, 5).map((level, index) => (
                  <div key={index} className="result-item">
                    <strong>{level.title}</strong>
                    <br />
                    <small>
                      {level.stars > 0 && `${'★'.repeat(level.stars)}`}
                      {level.levelRange && ` | ${level.levelRange}`}
                      {level.levelNumber && ` | Level ${level.levelNumber}`}
                      {level.isCompleted && ' | ✓ Completed'}
                    </small>
                  </div>
                ))}
                {levels.length > 5 && <p className="more">...and {levels.length - 5} more</p>}
              </>
            )}
          </div>
        </div>
      )}

      <footer>
        <p className="small">
          Navigate to{' '}
          <a href="https://www.reddit.com/r/SwordAndSupperGame/" target="_blank" rel="noreferrer">
            r/SwordAndSupperGame
          </a>{' '}
          to use
        </p>
      </footer>
    </div>
  );
};

export default PopupApp;

/**
 * Main Popup App Component
 */

import React, { useState, useEffect } from 'react';
import { LevelFilters, Level } from '../types';
import './popup.css';

interface AutomationConfig {
  enabled: boolean;
  abilityTierList: string[];
  autoAcceptSkillBargains: boolean;
  skillBargainStrategy: 'always' | 'positive-only' | 'never';
  emulateMode: boolean;
  emulateDelaySeconds: number;
  debugMode: boolean;
  remoteLogging: boolean;
}

const PopupApp: React.FC = () => {
  console.log('[POPUP] 🔵 PopupApp component loaded');

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
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({
    enabled: false,
    abilityTierList: ['IceKnifeOnTurnStart', 'LightningOnCrit', 'HealOnFirstTurn'],
    autoAcceptSkillBargains: true,
    skillBargainStrategy: 'positive-only',
    emulateMode: false,
    emulateDelaySeconds: 3,
    debugMode: false,
    remoteLogging: true,
  });
  const [currentTab, setCurrentTab] = useState<'control' | 'options'>('control');

  // Load saved filters and automation config on mount
  useEffect(() => {
    chrome.storage.local.get(['filters', 'automationConfig'], (result) => {
      if (result.filters) {
        setFilters(result.filters);
      }
      if (result.automationConfig) {
        setAutomationConfig(result.automationConfig);
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

  // Save automation config when it changes
  useEffect(() => {
    chrome.storage.local.set({ automationConfig });
  }, [automationConfig]);

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

  const updateAutomationConfig = (key: keyof AutomationConfig, value: any) => {
    setAutomationConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (dragIndex === dropIndex) return;

    const newTierList = [...automationConfig.abilityTierList];
    const [draggedItem] = newTierList.splice(dragIndex, 1);
    newTierList.splice(dropIndex, 0, draggedItem);

    updateAutomationConfig('abilityTierList', newTierList);
  };

  // Debug Step 1: Navigate to mission permalink from queue
  const handleNavigateToMission = () => {
    console.log('[POPUP] 🔵 Debug Step 1: Navigate to mission');
    chrome.runtime.sendMessage({
      type: 'NAVIGATE_TO_MISSION',
      filters,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[POPUP] ❌ Error:', chrome.runtime.lastError.message);
      } else if (response?.error) {
        console.error('[POPUP] ❌ Error:', response.error);
      } else if (response?.success) {
        console.log('[POPUP] ✅', response.message || 'Navigating to mission');
      }
    });
  };

  // Debug Step 2: Open devvit iframe (start mission)
  const handleOpenIframe = () => {
    console.log('[POPUP] 🔵 Debug Step 2: Open iframe');
    chrome.runtime.sendMessage({
      type: 'OPEN_MISSION_IFRAME',
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[POPUP] ❌ Error:', chrome.runtime.lastError.message);
      } else if (response?.error) {
        console.error('[POPUP] ❌ Error:', response.error);
      } else if (response?.success) {
        console.log('[POPUP] ✅', response.message || 'Iframe opened');
      }
    });
  };

  // Debug Step 3: Auto play opened mission
  const handleAutoPlay = () => {
    console.log('[POPUP] 🔵 Debug Step 3: Auto play mission');
    console.log('[POPUP] 📤 Sending START_MISSION_AUTOMATION via background...');

    chrome.runtime.sendMessage({
      type: 'START_MISSION_AUTOMATION',
      config: { ...automationConfig, enabled: true },
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[POPUP] ❌ Error:', chrome.runtime.lastError.message);
      } else {
        console.log('[POPUP] ✅ Message sent, response:', response);
      }
    });
  };

  const handleStopAutomation = () => {
    console.log('[POPUP] ⏹️ Stopping automation');
    chrome.runtime.sendMessage({
      type: 'STOP_MISSION_AUTOMATION',
    });
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>⚔️ Sword & Supper Bot</h1>
        <p className="subtitle">Mission automation & level scanning</p>
      </header>

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${currentTab === 'control' ? 'active' : ''}`}
          onClick={() => setCurrentTab('control')}
        >
          🎮 Control
        </button>
        <button
          className={`tab ${currentTab === 'options' ? 'active' : ''}`}
          onClick={() => setCurrentTab('options')}
        >
          ⚙️ Options
        </button>
      </div>

      {/* Control Tab */}
      {currentTab === 'control' && (
        <>
          {/* Debug Controls - only shown when debug mode is enabled */}
          {automationConfig.debugMode && (
            <div className="section">
              <h3>🐛 Debug Controls</h3>
              <p className="help-text" style={{ marginBottom: '12px' }}>
                Test each automation step individually:
              </p>

              <button className="btn btn-outline" onClick={handleNavigateToMission} style={{ marginBottom: '8px' }}>
                1️⃣ Navigate to Mission Permalink
              </button>

              <button className="btn btn-outline" onClick={handleOpenIframe} style={{ marginBottom: '8px' }}>
                2️⃣ Open Devvit Iframe (Start Mission)
              </button>

              <button className="btn btn-outline" onClick={handleAutoPlay} style={{ marginBottom: '8px' }}>
                3️⃣ Auto Play Opened Mission
              </button>

              <button className="btn btn-secondary" onClick={handleStopAutomation}>
                ⏹️ Stop Automation
              </button>
            </div>
          )}

          <div className="status">
            <div className={`status-indicator ${isRunning ? 'running' : ''}`}>
              <span className="dot"></span>
              <span>{isRunning ? 'Running' : 'Idle'}</span>
            </div>
          </div>

          <div className="section">
            <h3>Level Scanner</h3>
            <h4 style={{ fontSize: '14px', marginBottom: '10px', marginTop: '15px' }}>Filters</h4>

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

        <div className="button-group" style={{ marginTop: '15px' }}>
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
        </>
      )}

      {/* Options Tab */}
      {currentTab === 'options' && (
        <>
          <div className="section">
            <h3>Ability Tier List</h3>
            <p className="help-text">Drag to reorder. Abilities will be selected in this order of preference:</p>
            <div className="tier-list">
              {automationConfig.abilityTierList.map((ability, index) => (
                <div
                  key={index}
                  className="tier-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <span className="tier-drag-handle">⋮⋮</span>
                  <span className="tier-rank">{index + 1}</span>
                  <span className="tier-name">{ability}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h3>Skill Bargain Strategy</h3>
            <div className="form-group">
              <label htmlFor="skillBargainStrategy">When to accept skill bargains:</label>
              <select
                id="skillBargainStrategy"
                value={automationConfig.skillBargainStrategy}
                onChange={(e) => updateAutomationConfig('skillBargainStrategy', e.target.value)}
              >
                <option value="always">Always Accept</option>
                <option value="positive-only">Accept if Positive &gt; Negative</option>
                <option value="never">Never Accept</option>
              </select>
            </div>
          </div>

          <div className="section">
            <h3>Debug Settings</h3>
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={automationConfig.debugMode}
                  onChange={(e) => updateAutomationConfig('debugMode', e.target.checked)}
                />
                Enable Debug Mode
              </label>
              <p className="help-text" style={{ marginTop: '8px', marginLeft: '24px' }}>
                Shows debug controls in the Control tab for step-by-step testing
              </p>
            </div>

            <div className="form-group checkbox" style={{ marginTop: '16px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={automationConfig.remoteLogging}
                  onChange={(e) => updateAutomationConfig('remoteLogging', e.target.checked)}
                />
                Enable Remote Logging
              </label>
              <p className="help-text" style={{ marginTop: '8px', marginLeft: '24px' }}>
                Sends logs to http://localhost:7856/log for debugging and AI integration
              </p>
            </div>
          </div>
        </>
      )}

      <footer>
        <p className="small">
          Navigate to{' '}
          <a href="https://www.reddit.com/r/SwordAndSupperGame/" target="_blank" rel="noreferrer">
            r/SwordAndSupperGame
          </a>{' '}
          to use the bot
        </p>
      </footer>
    </div>
  );
};

export default PopupApp;

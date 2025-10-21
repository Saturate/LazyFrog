/**
 * Simplified Popup - Status Dashboard with Debug Tools
 */

import React, { useState, useEffect } from "react";
import { Play, Pause, Settings, BarChart3, Wrench, ChevronDown, ChevronRight, Star, Bug } from "lucide-react";
import { getMissionStats } from "../utils/storage";
import { VERSION, getTimeSinceBuild } from "../utils/buildInfo";
import "./popup-new.css";

interface MissionStats {
  queued: number;
  total: number;
  cleared: number;
  uncleared: number;
  todayCleared: number;
}

interface MissionFilters {
  stars: number[];
  minLevel: number;
  maxLevel: number;
}

const PopupAppNew: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState("Idle");
  const [currentMission, setCurrentMission] = useState<string | null>(null);
  const [stats, setStats] = useState<MissionStats>({
    queued: 0,
    total: 0,
    cleared: 0,
    uncleared: 0,
    todayCleared: 0,
  });
  const [buildAge, setBuildAge] = useState(getTimeSinceBuild());
  const [filters, setFilters] = useState<MissionFilters>({
    stars: [1, 2],
    minLevel: 1,
    maxLevel: 340,
  });

  // Collapsible section states
  const [showFilters, setShowFilters] = useState(() => {
    const saved = localStorage.getItem('popup.showFilters');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showStats, setShowStats] = useState(() => {
    const saved = localStorage.getItem('popup.showStats');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showDebug, setShowDebug] = useState(() => {
    const saved = localStorage.getItem('popup.showDebug');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showStepByStepControls, setShowStepByStepControls] = useState(false);
  const [showStepControls, setShowStepControls] = useState(() => {
    const saved = localStorage.getItem('popup.showStepControls');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Load stats and filters on mount
  useEffect(() => {
    loadStats();

    // Load saved filters and debug mode setting
    chrome.storage.local.get(['filters', 'automationConfig'], (result) => {
      if (result.filters) {
        setFilters({
          stars: result.filters.stars || [1, 2],
          minLevel: result.filters.minLevel || 1,
          maxLevel: result.filters.maxLevel || 340,
        });
      }
      if (result.automationConfig) {
        setShowStepByStepControls(result.automationConfig.showStepByStepControls || false);
      }
    });

    // Update build age every minute
    const interval = setInterval(() => {
      setBuildAge(getTimeSinceBuild());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Save collapsible states to localStorage
  useEffect(() => {
    localStorage.setItem('popup.showFilters', JSON.stringify(showFilters));
  }, [showFilters]);

  useEffect(() => {
    localStorage.setItem('popup.showStats', JSON.stringify(showStats));
  }, [showStats]);

  useEffect(() => {
    localStorage.setItem('popup.showDebug', JSON.stringify(showDebug));
  }, [showDebug]);

  useEffect(() => {
    localStorage.setItem('popup.showStepControls', JSON.stringify(showStepControls));
  }, [showStepControls]);

  // Save filters to chrome storage when changed
  useEffect(() => {
    chrome.storage.local.set({ filters: {
      stars: filters.stars,
      minLevel: filters.minLevel,
      maxLevel: filters.maxLevel,
      onlyIncomplete: true,
      autoProcess: false,
    }});
    // Also reload stats when filters change
    loadStats();
  }, [filters]);

  // Listen for messages from background
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === "STATUS_UPDATE") {
        setStatusText(message.status);
      } else if (message.type === "STATE_CHANGED") {
        setIsRunning(!["idle", "error"].includes(message.state));
        // Update stats when state changes
        loadStats();
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  // Load mission statistics
  const loadStats = async () => {
    try {
      const missionStats = await getMissionStats();
      setStats(missionStats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  // Handle start button
  const handleStart = () => {
    chrome.runtime.sendMessage({
      type: "START_BOT",
      filters: {
        stars: filters.stars,
        minLevel: filters.minLevel,
        maxLevel: filters.maxLevel,
        onlyIncomplete: true,
        autoProcess: false,
      },
    });
  };

  // Toggle difficulty star
  const toggleStar = (star: number) => {
    setFilters(prev => ({
      ...prev,
      stars: prev.stars.includes(star)
        ? prev.stars.filter(s => s !== star)
        : [...prev.stars, star].sort()
    }));
  };

  // Handle stop button
  const handleStop = () => {
    chrome.runtime.sendMessage({ type: "STOP_BOT" });
  };

  // Debug functions
  const viewLogs = () => {
    window.open("http://localhost:7856/logs", "_blank");
  };

  const testSelectors = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "TEST_SELECTORS" });
    }
  };

  const exportData = async () => {
    try {
      const { getAllMissions } = await import("../utils/storage");
      const missions = await getAllMissions();
      const settings = await chrome.storage.local.get(null);

      const data = {
        missions,
        settings,
        exportedAt: new Date().toISOString(),
        version: VERSION,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autosupper-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to export data: " + error);
    }
  };

  const openSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  };

  // Debug step functions
  const handleNavigateToMission = () => {
    chrome.runtime.sendMessage({
      type: "NAVIGATE_TO_MISSION",
      filters: {
        stars: filters.stars,
        minLevel: filters.minLevel,
        maxLevel: filters.maxLevel,
        onlyIncomplete: true,
        autoProcess: false,
      },
    });
  };

  const handleOpenIframe = () => {
    chrome.runtime.sendMessage({
      type: "OPEN_MISSION_IFRAME",
    });
  };

  const handleAutoPlay = () => {
    chrome.storage.local.get(['automationConfig'], (result) => {
      const config = result.automationConfig || {};
      chrome.runtime.sendMessage({
        type: "START_MISSION_AUTOMATION",
        config: { ...config, enabled: true },
      });
    });
  };

  const handleStopAutomation = () => {
    chrome.runtime.sendMessage({
      type: "STOP_MISSION_AUTOMATION",
    });
  };

  return (
    <div className="popup-container-new">
      {/* Status Section */}
      <div className="status-section">
        <div className="status-header">
          <span className="status-text">AutoSupper Bot</span>
          <span className={`status-dot ${isRunning ? "running" : "idle"}`} />
        </div>
        <div className="status-details">
          <div className="status-line">Status: {statusText}</div>
          {currentMission && <div className="status-line">Mission: {currentMission}</div>}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="control-section">
        <button
          className="control-button start-button"
          onClick={handleStart}
          disabled={isRunning}
        >
          <Play size={16} />
          START ({stats.queued})
        </button>
        <button
          className="control-button stop-button"
          onClick={handleStop}
          disabled={!isRunning}
        >
          <Pause size={16} />
          STOP
        </button>
      </div>

      {/* Step-by-Step Controls - Only shown when enabled in settings */}
      {showStepByStepControls && (
        <div className="collapsible-section">
          <div className="section-header" onClick={() => setShowStepControls(!showStepControls)}>
            {showStepControls ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Bug size={14} />
            <span>Step-by-Step Controls</span>
          </div>
          {showStepControls && (
            <div className="section-content">
              <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '12px' }}>
                Test each automation step individually:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className="debug-button"
                  onClick={handleNavigateToMission}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px' }}
                >
                  1. Navigate to Next Mission
                </button>
                <button
                  className="debug-button"
                  onClick={handleOpenIframe}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px' }}
                >
                  2. Open Dialog (Start Mission)
                </button>
                <button
                  className="debug-button"
                  onClick={handleAutoPlay}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px' }}
                >
                  3. Auto Play Opened Mission
                </button>
                <button
                  className="debug-button"
                  onClick={handleStopAutomation}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px', color: '#ef4444' }}
                >
                  Stop Automation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mission Filters - Collapsible */}
      <div className="collapsible-section">
        <div className="section-header" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Mission Filters</span>
        </div>
        {showFilters && (
          <div className="section-content" style={{ padding: '12px 16px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label className="filter-label" style={{ marginBottom: '6px' }}>Difficulty:</label>
              <div className="star-buttons">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-button ${filters.stars.includes(star) ? 'active' : ''}`}
                    onClick={() => toggleStar(star)}
                    disabled={isRunning}
                  >
                    <Star size={10} fill={filters.stars.includes(star) ? '#eab308' : 'none'} color="#eab308" />
                    {star}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="filter-label" style={{ marginBottom: '6px' }}>Level:</label>
              <div className="level-inputs">
                <input
                  type="number"
                  min="1"
                  max="340"
                  value={filters.minLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, minLevel: parseInt(e.target.value) || 1 }))}
                  disabled={isRunning}
                  placeholder="Min"
                />
                <span>-</span>
                <input
                  type="number"
                  min="1"
                  max="340"
                  value={filters.maxLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxLevel: parseInt(e.target.value) || 340 }))}
                  disabled={isRunning}
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mission Stats - Collapsible */}
      <div className="collapsible-section">
        <div className="section-header" onClick={() => setShowStats(!showStats)}>
          {showStats ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <BarChart3 size={14} />
          <span>Mission Stats</span>
        </div>
        {showStats && (
          <div className="section-content" style={{ padding: '8px 16px 12px 16px' }}>
            <div className="stat-row" style={{ padding: '4px 0', fontSize: '13px' }}>
              <span className="stat-label">Queued:</span>
              <span className="stat-value">{stats.queued} missions</span>
            </div>
            <div className="stat-row" style={{ padding: '4px 0', fontSize: '13px' }}>
              <span className="stat-label">Total:</span>
              <span className="stat-value">{stats.total} missions</span>
            </div>
            <div className="stat-row" style={{ padding: '4px 0', fontSize: '13px' }}>
              <span className="stat-label">Cleared:</span>
              <span className="stat-value">{stats.cleared} missions</span>
            </div>
            <div className="stat-row" style={{ padding: '4px 0', fontSize: '13px' }}>
              <span className="stat-label">Today:</span>
              <span className="stat-value">{stats.todayCleared} cleared</span>
            </div>
          </div>
        )}
      </div>

      {/* Debug Tools - Collapsible */}
      <div className="collapsible-section">
        <div className="section-header" onClick={() => setShowDebug(!showDebug)}>
          {showDebug ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Wrench size={14} />
          <span>Debug Tools</span>
        </div>
        {showDebug && (
          <div className="section-content">
            <div className="debug-grid">
              <button className="debug-button" onClick={viewLogs}>
                View Logs
              </button>
              <button className="debug-button" onClick={testSelectors}>
                Test Selectors
              </button>
              <button className="debug-button" onClick={exportData}>
                Export Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Big More Button */}
      <button className="settings-button" onClick={openSettings}>
        <Settings size={20} />
        MORE
      </button>

      {/* Footer */}
      <div className="footer">
        <span>v{VERSION}</span>
        <span>Built: {buildAge}</span>
      </div>
    </div>
  );
};

export default PopupAppNew;

/**
 * Settings Tab - Debug and advanced settings
 */

import React, { useState, useEffect } from "react";
import { Settings, Bug, Trash2 } from "lucide-react";

interface DebugSettings {
  debugMode: boolean;
  remoteLogging: boolean;
  showStepByStepControls: boolean;
}

const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<DebugSettings>({
    debugMode: false,
    remoteLogging: true,
    showStepByStepControls: false,
  });

  // Load settings on mount
  useEffect(() => {
    chrome.storage.local.get(["automationConfig"], (result) => {
      if (result.automationConfig) {
        setSettings({
          debugMode: result.automationConfig.debugMode || false,
          remoteLogging: result.automationConfig.remoteLogging !== false,
          showStepByStepControls:
            result.automationConfig.showStepByStepControls || false,
        });
      }
    });
  }, []);

  // Save settings when they change
  useEffect(() => {
    chrome.storage.local.get(["automationConfig"], (result) => {
      const fullConfig = {
        ...result.automationConfig,
        debugMode: settings.debugMode,
        remoteLogging: settings.remoteLogging,
        showStepByStepControls: settings.showStepByStepControls,
      };
      chrome.storage.local.set({ automationConfig: fullConfig });
    });
  }, [settings]);

  const handleClearMissions = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear ALL missions from the database? This cannot be undone."
      )
    ) {
      const { clearAllMissions } = await import("../../utils/storage");
      await clearAllMissions();
      alert("All missions cleared!");
    }
  };

  const handleClearAllData = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear ALL DATA? This will delete all missions, settings, and filters, resetting the extension to default state. This cannot be undone."
      )
    ) {
      await chrome.storage.local.clear();
      alert(
        "All data cleared! The extension has been reset to default state. Please reload the extension."
      );
    }
  };

  const handleMarkAllIncomplete = async () => {
    if (
      window.confirm(
        "Mark ALL missions as incomplete? This will reset cleared status on every mission."
      )
    ) {
      const { markAllMissionsIncomplete } = await import("../../utils/storage");
      await markAllMissionsIncomplete();
      alert("All missions marked as incomplete.");
    }
  };

  return (
    <div>
      <div className="card">
        <h2>
          <Bug
            size={20}
            style={{
              display: "inline-block",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          Debug Settings
        </h2>

        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={settings.showStepByStepControls}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  showStepByStepControls: e.target.checked,
                }))
              }
              style={{ cursor: "pointer" }}
            />
            <span>Show Step-by-Step Controls</span>
          </label>
          <p
            style={{
              color: "#a1a1aa",
              fontSize: "13px",
              marginTop: "8px",
              marginLeft: "28px",
            }}
          >
            Shows step-by-step automation controls in the popup (1. Navigate, 2.
            Open, 3. Play).
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={settings.debugMode}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  debugMode: e.target.checked,
                }))
              }
              style={{ cursor: "pointer" }}
            />
            <span>Enable Debug Mode</span>
          </label>
          <p
            style={{
              color: "#a1a1aa",
              fontSize: "13px",
              marginTop: "8px",
              marginLeft: "28px",
            }}
          >
            Enables additional debug logging and features throughout the
            extension.
          </p>
        </div>

        <div className="form-group">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={settings.remoteLogging}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  remoteLogging: e.target.checked,
                }))
              }
              style={{ cursor: "pointer" }}
            />
            <span>Enable Remote Logging</span>
          </label>
          <p
            style={{
              color: "#a1a1aa",
              fontSize: "13px",
              marginTop: "8px",
              marginLeft: "28px",
            }}
          >
            Sends logs to http://localhost:7856/log for debugging and AI
            integration.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>
          <Trash2
            size={20}
            style={{
              display: "inline-block",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          Data Management
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <p
            style={{ color: "#a1a1aa", fontSize: "14px", marginBottom: "12px" }}
          >
            Clear all mission data from the database. This action cannot be
            undone.
          </p>
          <button
            className="button danger"
            onClick={handleClearMissions}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Trash2 size={16} />
            Clear All Missions
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <p
            style={{ color: "#a1a1aa", fontSize: "14px", marginBottom: "12px" }}
          >
            Mark all missions as incomplete. This preserves mission entries but
            resets their cleared status.
          </p>
          <button
            className="button"
            onClick={handleMarkAllIncomplete}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            Mark All Missions Incomplete
          </button>
        </div>

        <div>
          <p
            style={{ color: "#a1a1aa", fontSize: "14px", marginBottom: "12px" }}
          >
            Clear all data including missions, settings, and filters. Resets the
            extension to default state. This action cannot be undone.
          </p>
          <button
            className="button danger"
            onClick={handleClearAllData}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Trash2 size={16} />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;

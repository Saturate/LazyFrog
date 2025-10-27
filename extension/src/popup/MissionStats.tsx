import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Settings,
  BarChart3,
  Wrench,
  ChevronDown,
  ChevronRight,
  Star,
  Bug,
} from "lucide-react";
import { getMissionStats } from "../lib/storage/missionStats";

interface MissionStats {
  queued: number;
  total: number;
  cleared: number;
  uncleared: number;
  todayCleared: number;
}

interface Props {
  stats: MissionStats;
}

export function MissionStats({ stats }: Props) {
  const [showStats, setShowStats] = useState(() => {
    const saved = localStorage.getItem("popup.showStats");
    return saved !== null ? JSON.parse(saved) : true;
  });

  return (
    <div className="collapsible-section">
      <div className="section-header" onClick={() => setShowStats(!showStats)}>
        {showStats ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <BarChart3 size={14} />
        <span>Mission Stats</span>
      </div>
      {showStats && (
        <div
          className="section-content"
          style={{ padding: "8px 16px 12px 16px" }}
        >
          <div
            className="stat-row"
            style={{ padding: "4px 0", fontSize: "13px" }}
          >
            <span className="stat-label">Queued:</span>
            <span className="stat-value">{stats.queued} missions</span>
          </div>
          <div
            className="stat-row"
            style={{ padding: "4px 0", fontSize: "13px" }}
          >
            <span className="stat-label">Total:</span>
            <span className="stat-value">{stats.total} missions</span>
          </div>
          <div
            className="stat-row"
            style={{ padding: "4px 0", fontSize: "13px" }}
          >
            <span className="stat-label">Cleared:</span>
            <span className="stat-value">{stats.cleared} missions</span>
          </div>
          <div
            className="stat-row"
            style={{ padding: "4px 0", fontSize: "13px" }}
          >
            <span className="stat-label">Today:</span>
            <span className="stat-value">{stats.todayCleared} cleared</span>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  getAllMissions,
  clearAllMissions,
  MissionRecord,
} from "../utils/storage";
import { generateMissionMarkdown } from "./missionMarkdown";
import "./missions.css";

interface SortConfig {
  field: "timestamp" | "difficulty" | "minLevel" | "foodName" | "username";
  direction: "asc" | "desc";
}

const MissionsPage: React.FC = () => {
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<MissionRecord[]>([]);

  // Load filter state from localStorage
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('missionsPage.searchQuery') || "";
  });
  const [showCompleted, setShowCompleted] = useState(() => {
    const saved = localStorage.getItem('missionsPage.showCompleted');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showUncompleted, setShowUncompleted] = useState(() => {
    const saved = localStorage.getItem('missionsPage.showUncompleted');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [difficultyFilter, setDifficultyFilter] = useState<number[]>(() => {
    const saved = localStorage.getItem('missionsPage.difficultyFilter');
    return saved ? JSON.parse(saved) : [1, 2, 3, 4, 5];
  });
  const [showMiniboss, setShowMiniboss] = useState<boolean | null>(() => {
    const saved = localStorage.getItem('missionsPage.showMiniboss');
    return saved !== null ? JSON.parse(saved) : null;
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const saved = localStorage.getItem('missionsPage.sortConfig');
    return saved ? JSON.parse(saved) : { field: "timestamp", direction: "desc" };
  });
  const [stats, setStats] = useState({
    total: 0,
    cleared: 0,
    uncleared: 0,
    byDifficulty: {} as Record<number, number>,
  });

  // Load missions
  useEffect(() => {
    loadMissions();
  }, []);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('missionsPage.searchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem('missionsPage.showCompleted', JSON.stringify(showCompleted));
  }, [showCompleted]);

  useEffect(() => {
    localStorage.setItem('missionsPage.showUncompleted', JSON.stringify(showUncompleted));
  }, [showUncompleted]);

  useEffect(() => {
    localStorage.setItem('missionsPage.difficultyFilter', JSON.stringify(difficultyFilter));
  }, [difficultyFilter]);

  useEffect(() => {
    localStorage.setItem('missionsPage.showMiniboss', JSON.stringify(showMiniboss));
  }, [showMiniboss]);

  useEffect(() => {
    localStorage.setItem('missionsPage.sortConfig', JSON.stringify(sortConfig));
  }, [sortConfig]);

  // Filter and sort missions when data or filters change
  useEffect(() => {
    let filtered = missions;

    // Filter by cleared status
    if (!showCompleted) {
      filtered = filtered.filter((m) => !m.cleared);
    }
    if (!showUncompleted) {
      filtered = filtered.filter((m) => m.cleared);
    }

    // Filter by difficulty
    filtered = filtered.filter((m) => {
      const diff = m.difficulty || 0;
      return diff === 0 || difficultyFilter.includes(diff);
    });

    // Filter by miniboss presence
    if (showMiniboss !== null) {
      filtered = filtered.filter((m) => {
        const hasMiniboss = m.metadata?.mission?.encounters?.some(
          (enc: any) => enc.type === 'crossroadsFight'
        );
        return showMiniboss ? hasMiniboss : !hasMiniboss;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          (m.foodName && m.foodName.toLowerCase().includes(query)) ||
          m.username.toLowerCase().includes(query) ||
          m.postId.toLowerCase().includes(query) ||
          (m.tags && m.tags.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortConfig.field) {
        case "timestamp":
          aVal = a.timestamp;
          bVal = b.timestamp;
          break;
        case "difficulty":
          aVal = a.difficulty || 0;
          bVal = b.difficulty || 0;
          break;
        case "minLevel":
          aVal = a.minLevel || 0;
          bVal = b.minLevel || 0;
          break;
        case "foodName":
          aVal = (a.foodName || "").toLowerCase();
          bVal = (b.foodName || "").toLowerCase();
          break;
        case "username":
          aVal = a.username.toLowerCase();
          bVal = b.username.toLowerCase();
          break;
        default:
          aVal = a.timestamp;
          bVal = b.timestamp;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredMissions(filtered);
  }, [
    missions,
    searchQuery,
    showCompleted,
    showUncompleted,
    difficultyFilter,
    sortConfig,
  ]);

  const loadMissions = async () => {
    const allMissions = await getAllMissions();
    const missionArray = Object.values(allMissions);
    setMissions(missionArray);

    // Calculate stats
    const cleared = missionArray.filter((m) => m.cleared).length;
    const byDifficulty: Record<number, number> = {};
    missionArray.forEach((m) => {
      const diff = m.difficulty || 0;
      byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;
    });

    setStats({
      total: missionArray.length,
      cleared,
      uncleared: missionArray.length - cleared,
      byDifficulty,
    });
  };

  const handleSort = (field: SortConfig["field"]) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(missions, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `autosupper-missions-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = (mission: MissionRecord) => {
    const markdown = generateMissionMarkdown(mission);

    if (!markdown) {
      alert('No metadata available for this mission. Play it once to capture metadata.');
      return;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(markdown).then(() => {
      alert('Mission metadata copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Please check browser permissions.');
    });
  };

  const formatItemName = (itemId: string): string => {
    // Convert camelCase/PascalCase to readable format
    return itemId.replace(/([A-Z])/g, ' $1').trim();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);

        // Validate structure
        if (!Array.isArray(imported)) {
          alert("Invalid file format: Expected an array of missions");
          return;
        }

        // Import missions (merge with existing)
        const allMissions = await getAllMissions();
        let importedCount = 0;
        let skippedCount = 0;

        for (const mission of imported) {
          if (mission.postId && !allMissions[mission.postId]) {
            allMissions[mission.postId] = mission;
            importedCount++;
          } else {
            skippedCount++;
          }
        }

        // Save back
        await chrome.storage.local.set({ missions: allMissions });

        alert(
          `Imported ${importedCount} missions (${skippedCount} duplicates skipped)`
        );
        loadMissions();
      } catch (error) {
        alert("Error importing missions: " + error);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL missions? This cannot be undone."
      )
    ) {
      return;
    }

    await clearAllMissions();
    loadMissions();
  };

  const getSortIcon = (field: SortConfig["field"]) => {
    if (sortConfig.field !== field) return "↕️";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderStars = (difficulty: number | undefined) => {
    if (!difficulty || difficulty === 0)
      return <span className="no-difficulty">No difficulty</span>;
    return "⭐".repeat(difficulty);
  };

  return (
    <div className="missions-page">
      <header className="missions-header">
        <h1>AutoSupper Mission Manager</h1>
        <div className="header-actions">
          <button
            onClick={() =>
              chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") })
            }
            className="btn-secondary"
          >
            ⚙️ Settings
          </button>
          <button onClick={loadMissions} className="btn-secondary">
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Missions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.uncleared}</div>
          <div className="stat-label">Uncleared</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.cleared}</div>
          <div className="stat-label">Cleared</div>
        </div>
        {[1, 2, 3, 4, 5].map((diff) => (
          <div key={diff} className="stat-card">
            <div className="stat-value">{stats.byDifficulty[diff] || 0}</div>
            <div className="stat-label">{"⭐".repeat(diff)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="🔍 Search missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            Show Completed
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showUncompleted}
              onChange={(e) => setShowUncompleted(e.target.checked)}
            />
            Show Uncompleted
          </label>
        </div>

        <div className="filter-group">
          <label>Difficulty:</label>
          {[1, 2, 3, 4, 5].map((diff) => (
            <label key={diff} className="checkbox-label">
              <input
                type="checkbox"
                checked={difficultyFilter.includes(diff)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDifficultyFilter([...difficultyFilter, diff]);
                  } else {
                    setDifficultyFilter(
                      difficultyFilter.filter((d) => d !== diff)
                    );
                  }
                }}
              />
              {"⭐".repeat(diff)}
            </label>
          ))}
        </div>

        <div className="filter-group">
          <label>Miniboss:</label>
          <label className="checkbox-label">
            <input
              type="radio"
              name="miniboss"
              checked={showMiniboss === null}
              onChange={() => setShowMiniboss(null)}
            />
            All
          </label>
          <label className="checkbox-label">
            <input
              type="radio"
              name="miniboss"
              checked={showMiniboss === true}
              onChange={() => setShowMiniboss(true)}
            />
            🔱 With Miniboss
          </label>
          <label className="checkbox-label">
            <input
              type="radio"
              name="miniboss"
              checked={showMiniboss === false}
              onChange={() => setShowMiniboss(false)}
            />
            No Miniboss
          </label>
        </div>

        <div className="filter-group">
          <button onClick={handleExport} className="btn-primary">
            📥 Export JSON
          </button>
          <label className="btn-primary file-input-label">
            📤 Import Missions
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </label>
          <button onClick={handleClearAll} className="btn-danger">
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        Showing {filteredMissions.length} of {missions.length} missions
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="missions-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("timestamp")} className="sortable">
                Date {getSortIcon("timestamp")}
              </th>
              <th onClick={() => handleSort("foodName")} className="sortable">
                Mission {getSortIcon("foodName")}
              </th>
              <th onClick={() => handleSort("username")} className="sortable">
                Author {getSortIcon("username")}
              </th>
              <th onClick={() => handleSort("difficulty")} className="sortable">
                Difficulty {getSortIcon("difficulty")}
              </th>
              <th onClick={() => handleSort("minLevel")} className="sortable">
                Level {getSortIcon("minLevel")}
              </th>
              <th>Metadata</th>
              <th>Rewards</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMissions.map((mission) => (
              <tr
                key={mission.postId}
                className={mission.cleared ? "completed" : ""}
              >
                <td className="date-cell">{formatDate(mission.timestamp)}</td>
                <td className="mission-cell">
                  <div className="mission-title">{mission.foodName}</div>
                  {mission.tags && (
                    <div className="mission-tags">{mission.tags}</div>
                  )}
                </td>
                <td>{mission.username}</td>
                <td className="difficulty-cell">
                  {renderStars(mission.difficulty)}
                </td>
                <td className="level-cell">
                  {mission.minLevel && mission.maxLevel
                    ? `${mission.minLevel}-${mission.maxLevel}`
                    : "N/A"}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {mission.metadata?.mission?.encounters ? (
                    <span title={`${mission.metadata.mission.encounters.length} encounters`} style={{ cursor: 'help' }}>
                      ✅
                    </span>
                  ) : (
                    <span title="No metadata - play mission to capture" style={{ cursor: 'help', opacity: 0.4 }}>
                      📊
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {mission.finalLoot && mission.finalLoot.length > 0 ? (
                    <span
                      title={mission.finalLoot.map(item => `${item.quantity}× ${formatItemName(item.id)}`).join(', ')}
                      style={{ cursor: 'help', fontSize: '18px' }}
                    >
                      🎁
                    </span>
                  ) : (
                    <span title="No rewards captured" style={{ opacity: 0.3 }}>—</span>
                  )}
                </td>
                <td>
                  {mission.cleared ? (
                    <span className="status-badge completed">✓ Cleared</span>
                  ) : (
                    <span className="status-badge uncompleted">○ Pending</span>
                  )}
                </td>
                <td className="actions-cell">
                  <a
                    href={mission.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-link"
                  >
                    🔗 Open
                  </a>
                  <button
                    onClick={() => handleCopyMarkdown(mission)}
                    className="btn-link"
                    style={{ marginLeft: '8px', cursor: 'pointer', border: 'none', background: 'none' }}
                  >
                    📋 Copy Markdown
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredMissions.length === 0 && (
        <div className="empty-state">
          <p>No missions found matching your filters.</p>
          <p>Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

export default MissionsPage;

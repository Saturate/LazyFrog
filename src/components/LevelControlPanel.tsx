/**
 * Level Control Panel Component
 * React component injected into Reddit page for controlling the bot
 */

import React, { useState, useEffect } from 'react';
import { Level, LevelFilters } from '../types';

interface LevelControlPanelProps {
  levels: Level[];
  filters: LevelFilters;
  isRunning: boolean;
  onFilterChange: (filters: LevelFilters) => void;
  onStart: () => void;
  onStop: () => void;
  onLevelClick: (level: Level) => void;
}

const LevelControlPanel: React.FC<LevelControlPanelProps> = ({
  levels,
  filters,
  isRunning,
  onFilterChange,
  onStart,
  onStop,
  onLevelClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof LevelFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const getStarColor = (stars: number): string => {
    switch (stars) {
      case 1:
        return '#4CAF50'; // Green (easiest)
      case 2:
        return '#8BC34A'; // Light green
      case 3:
        return '#FF9800'; // Orange
      case 4:
        return '#F44336'; // Red
      case 5:
        return '#9C27B0'; // Purple (hardest)
      default:
        return '#757575'; // Gray (unknown)
    }
  };

  const renderStars = (stars: number): string => {
    return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '60px',
        right: '20px',
        width: '380px',
        maxHeight: '80vh',
        background: 'white',
        border: '2px solid #FF4500',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        zIndex: 10000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FF4500 0%, #FF6347 100%)',
          color: 'white',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            ⚔️ Sword & Supper Bot
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
            {levels.length} level{levels.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Filters */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#333' }}>Filters</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
                Star Difficulty
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <label key={star} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={localFilters.stars.includes(star)}
                      onChange={(e) => {
                        const newStars = e.target.checked
                          ? [...localFilters.stars, star]
                          : localFilters.stars.filter((s) => s !== star);
                        handleFilterChange('stars', newStars.sort());
                      }}
                      disabled={isRunning}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '16px', color: getStarColor(star) }}>{'★'.repeat(star)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
                  Min Level
                </label>
                <input
                  type="number"
                  value={localFilters.minLevel}
                  onChange={(e) => handleFilterChange('minLevel', parseInt(e.target.value) || 1)}
                  disabled={isRunning}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
                  Max Level
                </label>
                <input
                  type="number"
                  value={localFilters.maxLevel}
                  onChange={(e) => handleFilterChange('maxLevel', parseInt(e.target.value) || 340)}
                  disabled={isRunning}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={localFilters.onlyIncomplete}
                onChange={(e) => handleFilterChange('onlyIncomplete', e.target.checked)}
                disabled={isRunning}
                style={{ width: '16px', height: '16px' }}
              />
              Only show incomplete levels
            </label>
          </div>

          {/* Controls */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
            {!isRunning ? (
              <button
                onClick={onStart}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#FF4500',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🚀 Start Bot
              </button>
            ) : (
              <button
                onClick={onStop}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#757575',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⏹ Stop Bot
              </button>
            )}
          </div>

          {/* Level List */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {levels.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', fontSize: '13px' }}>
                No levels match your filters
              </p>
            ) : (
              levels.map((level, index) => (
                <div
                  key={index}
                  onClick={() => onLevelClick(level)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: level.cleared ? '#f5f5f5' : '#fafafa',
                    borderLeft: `4px solid ${getStarColor(level.stars)}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = level.cleared ? '#f5f5f5' : '#fafafa';
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#333' }}>
                    {level.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {level.stars > 0 && (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          background: getStarColor(level.stars),
                          color: 'white',
                          borderRadius: '3px',
                          marginRight: '6px',
                        }}
                      >
                        {renderStars(level.stars)}
                      </span>
                    )}
                    {level.levelRange && <span>{level.levelRange}</span>}
                    {level.levelNumber && <span> • Level {level.levelNumber}</span>}
                    {level.cleared && <span> • ✓ Cleared</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelControlPanel;

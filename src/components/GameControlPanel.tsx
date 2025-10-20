/**
 * Game Control Panel Component
 * React component injected into the game iframe
 */

import React, { useState, useEffect } from 'react';
import { enemyNames, mapNames } from '../data';

interface GameControlPanelProps {
  gameState: any;
}

// Generate mission tags from metadata (like autotag userscript)
function generateMissionTags(metadata: any): string {
  if (!metadata?.mission) return '';

  const mission = metadata.mission;
  const encounters = mission.encounters || [];
  const tags: string[] = [];

  // Stars
  tags.push(`${mission.difficulty}*`);

  // Level range
  tags.push(`${mission.minLevel} - ${mission.maxLevel}`);

  // Map name
  if (mission.environment && mapNames[mission.environment]) {
    tags.push(mapNames[mission.environment]);
  }

  // Food name
  if (mission.foodName) {
    tags.push(mission.foodName);
  }

  // Boss rush
  if (mission.type === 'bossRush') {
    tags.push('boss rush');
  }

  // Process encounters
  encounters.forEach((encounter: any) => {
    if (encounter.type === 'crossroadsFight' && encounter.enemies?.[0]) {
      let minibossTag = `miniboss ${enemyNames[encounter.enemies[0].type] || encounter.enemies[0].type}`;
      if (mission.minLevel > 60) {
        minibossTag = '2k ' + minibossTag;
      } else if (mission.minLevel > 40) {
        minibossTag = '1k ' + minibossTag;
      }
      tags.push(minibossTag);
    } else if ((encounter.type === 'boss' || encounter.type === 'rushBoss') && encounter.enemies?.[0]) {
      tags.push(`${enemyNames[encounter.enemies[0].type] || encounter.enemies[0].type} boss`);
    } else if (encounter.type === 'investigate') {
      tags.push('hut');
    }
  });

  return tags.join(' | ');
}

const GameControlPanel: React.FC<GameControlPanelProps> = ({ gameState: initialGameState }) => {
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized
  const [isHovering, setIsHovering] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [missionTags, setMissionTags] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [gameState, setGameState] = useState(initialGameState);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [currentEncounterIndex, setCurrentEncounterIndex] = useState(0);
  const [inCombat, setInCombat] = useState(false);

  // Panel is expanded only when clicked open (not on hover)
  const isExpanded = !isMinimized;
  // Show title when hovering over minimized button
  const showTitle = isHovering && isMinimized;

  // Listen for automation state changes (includes mission metadata)
  useEffect(() => {
    const handleStateChange = (event: CustomEvent) => {
      const state = event.detail;

      // Update mission tags and encounters if metadata is available
      if (state.missionMetadata) {
        const tags = generateMissionTags(state.missionMetadata);
        setMissionTags(tags);

        // Extract encounters
        if (state.missionMetadata.mission?.encounters) {
          setEncounters(state.missionMetadata.mission.encounters);
        }
      }

      // Update combat state
      if (state.inCombat !== undefined) {
        setInCombat(state.inCombat);
      }
    };

    window.addEventListener('SS_AUTOMATION_STATE_CHANGE', handleStateChange as EventListener);
    return () => window.removeEventListener('SS_AUTOMATION_STATE_CHANGE', handleStateChange as EventListener);
  }, []);

  // Periodically update game state
  useEffect(() => {
    const interval = setInterval(() => {
      // Extract current game state from DOM
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim() || '');
      const url = window.location.href;

      setGameState({
        buttons,
        url,
        levelInfo: gameState.levelInfo, // Keep existing values that don't change often
        stars: gameState.stars,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = () => {
    if (missionTags) {
      navigator.clipboard.writeText(missionTags).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Get icon for encounter type
  const getEncounterIcon = (encounter: any): string => {
    switch (encounter.type) {
      case 'enemy':
        return '⚔️';
      case 'boss':
      case 'rushBoss':
        return '👑';
      case 'crossroadsFight':
        return '🔱';
      case 'skillBargain':
        return '🤝';
      case 'abilityChoice':
        return '✨';
      case 'statsChoice':
      case 'blessing':
        return '📊';
      case 'treasure':
        return '💎';
      case 'investigate':
        return '🏚️';
      default:
        return '❓';
    }
  };

  // Get encounter label
  const getEncounterLabel = (encounter: any): string => {
    switch (encounter.type) {
      case 'enemy':
        return 'Battle';
      case 'boss':
      case 'rushBoss':
        return 'Boss Fight';
      case 'crossroadsFight':
        return 'Miniboss';
      case 'skillBargain':
        return 'Skill Bargain';
      case 'abilityChoice':
        return 'Ability Choice';
      case 'statsChoice':
        return 'Stat Choice';
      case 'blessing':
        return 'Blessing';
      case 'treasure':
        return 'Treasure';
      case 'investigate':
        return 'Hut';
      default:
        return encounter.type;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 999999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: 'white',
      }}
    >
      {/* Title tooltip - shows on hover when minimized */}
      {showTitle && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '0',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid #FF4500',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          ⚔️ AutoSupper
        </div>
      )}

      {/* Main panel */}
      <div
        style={{
          width: isExpanded ? '320px' : '48px',
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #FF4500',
          borderRadius: isExpanded ? '12px' : '24px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FF4500 0%, #FF6347 100%)',
            padding: '12px',
            borderRadius: isExpanded ? '10px 10px 0 0' : '22px',
            display: 'flex',
            justifyContent: isExpanded ? 'space-between' : 'center',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => setIsMinimized(!isMinimized)}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {isExpanded && <div style={{ fontSize: '14px', fontWeight: 600 }}>⚔️ AutoSupper</div>}
          <button
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '12px' }}>
          {/* Game State */}
          <div style={{ marginBottom: '12px', fontSize: '12px' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', color: '#FF6347' }}>Game State:</div>
            {gameState.levelInfo && <div>Level: {gameState.levelInfo}</div>}
            {gameState.stars && <div>Stars: {'★'.repeat(gameState.stars)}</div>}
            <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
              URL: {gameState.url.substring(0, 40)}...
            </div>
          </div>

          {/* Controls */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '12px', color: '#FF6347' }}>
              Controls:
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={(e) => setAutoPlay(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Auto-play mode
            </label>
          </div>

          {/* Mission Tags */}
          {missionTags && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '12px', color: '#FF6347' }}>
                Mission Tags:
              </div>
              <div
                onClick={copyToClipboard}
                style={{
                  padding: '8px',
                  background: 'rgba(255,69,0,0.1)',
                  border: '1px solid rgba(255,69,0,0.3)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  wordWrap: 'break-word',
                  position: 'relative',
                }}
                title="Click to copy"
              >
                {missionTags}
                {copied && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'rgba(0,0,0,0.9)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: '#0f0',
                    }}
                  >
                    Copied!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Encounters Timeline */}
          {encounters.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '12px', color: '#FF6347' }}>
                Encounters ({currentEncounterIndex + 1}/{encounters.length}):
              </div>
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                {/* Vertical timeline line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '0',
                    bottom: '0',
                    width: '2px',
                    background: 'rgba(255,69,0,0.3)',
                  }}
                />

                {encounters.map((encounter, index) => {
                  const isCompleted = index < currentEncounterIndex;
                  const isCurrent = index === currentEncounterIndex && inCombat;
                  const isPending = index > currentEncounterIndex;

                  return (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {/* Timeline dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-20px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: isCompleted
                            ? '#00c800'
                            : isCurrent
                            ? '#ffa500'
                            : 'rgba(255,255,255,0.2)',
                          border: `2px solid ${
                            isCompleted ? '#00c800' : isCurrent ? '#ffa500' : 'rgba(255,255,255,0.3)'
                          }`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          animation: isCurrent ? 'pulse 1s infinite' : 'none',
                        }}
                      >
                        {isCompleted && '✓'}
                      </div>

                      {/* Encounter info */}
                      <div
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: isCompleted
                            ? 'rgba(0, 200, 0, 0.1)'
                            : isCurrent
                            ? 'rgba(255, 165, 0, 0.1)'
                            : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${
                            isCompleted
                              ? 'rgba(0, 200, 0, 0.3)'
                              : isCurrent
                              ? 'rgba(255, 165, 0, 0.3)'
                              : 'rgba(255,255,255,0.1)'
                          }`,
                          borderRadius: '4px',
                          fontSize: '11px',
                          opacity: isPending ? 0.6 : 1,
                        }}
                      >
                        <span style={{ marginRight: '6px' }}>{getEncounterIcon(encounter)}</span>
                        {getEncounterLabel(encounter)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Buttons Found */}
          {gameState.buttons && gameState.buttons.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '12px', color: '#FF6347' }}>
                Buttons ({gameState.buttons.length}):
              </div>
              <div style={{ maxHeight: '150px', overflow: 'auto', fontSize: '11px' }}>
                {gameState.buttons.slice(0, 10).map((btn: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      marginBottom: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      console.log('Clicking button:', btn);
                      // Send message to click button
                      window.postMessage({ type: 'SS_BOT_CLICK_BUTTON', buttonText: btn }, '*');
                    }}
                  >
                    {btn}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debug Info */}
          <div style={{ marginTop: '12px', fontSize: '10px', color: '#666', borderTop: '1px solid #333', paddingTop: '8px' }}>
            Open console to use: window.ssBot
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GameControlPanel;

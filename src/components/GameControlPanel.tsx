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

const GameControlPanel: React.FC<GameControlPanelProps> = ({ gameState }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [missionTags, setMissionTags] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Listen for mission metadata
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.data?.message?.type === 'initialData') {
        const metadata = event.data.data.message.data?.missionMetadata;
        if (metadata) {
          const tags = generateMissionTags(metadata);
          setMissionTags(tags);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const copyToClipboard = () => {
    if (missionTags) {
      navigator.clipboard.writeText(missionTags).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: isMinimized ? '200px' : '320px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid #FF4500',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 999999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: 'white',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FF4500 0%, #FF6347 100%)',
          padding: '12px',
          borderTopLeftRadius: '10px',
          borderTopRightRadius: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div style={{ fontSize: '14px', fontWeight: 600 }}>⚔️ Game Bot</div>
        <button
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          {isMinimized ? '+' : '−'}
        </button>
      </div>

      {/* Content */}
      {!isMinimized && (
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
  );
};

export default GameControlPanel;

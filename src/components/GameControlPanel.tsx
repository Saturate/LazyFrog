/**
 * Game Control Panel Component
 * React component injected into the game iframe
 */

import React, { useState, useEffect } from 'react';

interface GameControlPanelProps {
  gameState: any;
}

const GameControlPanel: React.FC<GameControlPanelProps> = ({ gameState }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

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

/**
 * Automation Tab - Mission filters and bot controls
 */

import React, { useState, useEffect } from 'react';
import { Target, GripVertical } from 'lucide-react';

interface AutomationConfig {
  abilityTierList: string[];
  blessingStatPriority: string[];
  skillBargainStrategy: 'always' | 'positive-only' | 'never';
  crossroadsStrategy: 'fight' | 'skip';
}

const AutomationTab: React.FC = () => {
  const [config, setConfig] = useState<AutomationConfig>({
    abilityTierList: [],
    blessingStatPriority: [],
    skillBargainStrategy: 'positive-only',
    crossroadsStrategy: 'fight',
  });

  // Load config on mount
  useEffect(() => {
    chrome.storage.local.get(['automationConfig'], (result) => {
      if (result.automationConfig) {
        setConfig({
          abilityTierList: result.automationConfig.abilityTierList || [],
          blessingStatPriority: result.automationConfig.blessingStatPriority || [],
          skillBargainStrategy: result.automationConfig.skillBargainStrategy || 'positive-only',
          crossroadsStrategy: result.automationConfig.crossroadsStrategy || 'fight',
        });
      }
    });
  }, []);

  // Save config when it changes
  useEffect(() => {
    chrome.storage.local.get(['automationConfig'], (result) => {
      const fullConfig = {
        ...result.automationConfig,
        abilityTierList: config.abilityTierList,
        blessingStatPriority: config.blessingStatPriority,
        skillBargainStrategy: config.skillBargainStrategy,
        crossroadsStrategy: config.crossroadsStrategy,
      };
      chrome.storage.local.set({ automationConfig: fullConfig });
    });
  }, [config]);

  // Drag and drop handlers for abilities
  const handleAbilityDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleAbilityDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleAbilityDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const newList = [...config.abilityTierList];
    const [draggedItem] = newList.splice(dragIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);

    setConfig(prev => ({ ...prev, abilityTierList: newList }));
  };

  // Drag and drop handlers for blessings
  const handleBlessingDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleBlessingDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleBlessingDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const newList = [...config.blessingStatPriority];
    const [draggedItem] = newList.splice(dragIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);

    setConfig(prev => ({ ...prev, blessingStatPriority: newList }));
  };

  return (
    <div>
      <div className="card">
        <h2>
          <Target size={20} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
          Ability Tier List
        </h2>
        <p style={{ color: '#a1a1aa', marginBottom: '16px', fontSize: '14px' }}>
          Drag to reorder. Abilities will be selected in this order of preference when given a choice in missions.
        </p>
        {config.abilityTierList.length === 0 ? (
          <p style={{ color: '#71717a', fontSize: '14px', fontStyle: 'italic' }}>
            No abilities discovered yet. Play missions to discover abilities!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {config.abilityTierList.map((ability, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleAbilityDragStart(e, index)}
                onDragOver={handleAbilityDragOver}
                onDrop={(e) => handleAbilityDrop(e, index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#171717',
                  border: '1px solid #1a1a1a',
                  borderRadius: '8px',
                  cursor: 'move',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1f1f1f'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#171717'}
              >
                <GripVertical size={16} style={{ color: '#71717a' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6', minWidth: '30px' }}>
                  {index + 1}
                </span>
                <span style={{ fontSize: '14px', color: '#e5e5e5' }}>{ability}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Blessing Stat Priority</h2>
        <p style={{ color: '#a1a1aa', marginBottom: '16px', fontSize: '14px' }}>
          Drag to reorder. Stats will be prioritized in this order when choosing blessings during missions.
        </p>
        {config.blessingStatPriority.length === 0 ? (
          <p style={{ color: '#71717a', fontSize: '14px', fontStyle: 'italic' }}>
            No blessing stats discovered yet. Play missions to discover stats!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {config.blessingStatPriority.map((stat, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleBlessingDragStart(e, index)}
                onDragOver={handleBlessingDragOver}
                onDrop={(e) => handleBlessingDrop(e, index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#171717',
                  border: '1px solid #1a1a1a',
                  borderRadius: '8px',
                  cursor: 'move',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1f1f1f'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#171717'}
              >
                <GripVertical size={16} style={{ color: '#71717a' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#22c55e', minWidth: '30px' }}>
                  {index + 1}
                </span>
                <span style={{ fontSize: '14px', color: '#e5e5e5' }}>{stat}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Combat Strategies</h2>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Skill Bargain Strategy:</label>
          <p style={{ color: '#a1a1aa', fontSize: '13px', marginTop: '4px', marginBottom: '8px' }}>
            When to accept skill bargains (trade-offs between stats).
          </p>
          <select
            value={config.skillBargainStrategy}
            onChange={(e) => setConfig(prev => ({ ...prev, skillBargainStrategy: e.target.value as any }))}
          >
            <option value="always">Always Accept</option>
            <option value="positive-only">Accept if Positive &gt; Negative</option>
            <option value="never">Never Accept</option>
          </select>
        </div>

        <div className="form-group">
          <label>Crossroads Strategy:</label>
          <p style={{ color: '#a1a1aa', fontSize: '13px', marginTop: '4px', marginBottom: '8px' }}>
            What to do at miniboss encounters (crossroads).
          </p>
          <select
            value={config.crossroadsStrategy}
            onChange={(e) => setConfig(prev => ({ ...prev, crossroadsStrategy: e.target.value as any }))}
          >
            <option value="fight">Fight Miniboss</option>
            <option value="skip">Skip Miniboss</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default AutomationTab;

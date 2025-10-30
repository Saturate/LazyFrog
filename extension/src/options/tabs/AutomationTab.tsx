/**
 * Automation Tab - Mission filters and bot controls
 */

import React, { useState, useEffect } from 'react';
import { Target, Sparkles, Swords } from 'lucide-react';
import { PriorityListCard } from '../components/PriorityListCard';

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
  const [discoveredAbilities, setDiscoveredAbilities] = useState<string[]>([]);
  const [discoveredBlessingStats, setDiscoveredBlessingStats] = useState<string[]>([]);

  // Load config on mount
  useEffect(() => {
    chrome.storage.local.get(['automationConfig', 'discoveredAbilities', 'discoveredBlessingStats'], (result) => {
      if (result.automationConfig) {
        setConfig({
          abilityTierList: result.automationConfig.abilityTierList || [],
          blessingStatPriority: result.automationConfig.blessingStatPriority || [],
          skillBargainStrategy: result.automationConfig.skillBargainStrategy || 'positive-only',
          crossroadsStrategy: result.automationConfig.crossroadsStrategy || 'fight',
        });
      }
      setDiscoveredAbilities(result.discoveredAbilities || []);
      setDiscoveredBlessingStats(result.discoveredBlessingStats || []);
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

  // Handler for ability list changes
  const handleAbilityListChange = (newList: string[]) => {
    setConfig(prev => ({ ...prev, abilityTierList: newList }));
  };

  // Handler for blessing stat list changes
  const handleBlessingStatListChange = (newList: string[]) => {
    setConfig(prev => ({ ...prev, blessingStatPriority: newList }));
  };

  return (
    <div>
      <PriorityListCard
        title="Ability Pick Order"
        icon={Target}
        description="Drag to reorder. Abilities will be selected in this order of preference when given a choice in missions."
        matchingHint='The automation matches using partial text (case-insensitive). E.g., "Ice" matches "Ice Knife" ability.'
        items={config.abilityTierList}
        discoveredItems={discoveredAbilities}
        inputPlaceholder="Add ability name..."
        emptyMessage="No abilities in pick order. Add abilities above or play missions to discover them!"
        accentColor="#3b82f6"
        onItemsChange={handleAbilityListChange}
      />

      <PriorityListCard
        title="Blessing Stat Pick Order"
        icon={Sparkles}
        description="Drag to reorder. Stats will be prioritized in this order when choosing blessings during missions."
        matchingHint='The automation matches using partial text (case-insensitive). E.g., "Speed" matches "Increase Speed by 10%".'
        items={config.blessingStatPriority}
        discoveredItems={discoveredBlessingStats}
        inputPlaceholder="Add blessing stat name..."
        emptyMessage="No blessing stats in pick order. Add stats above or play missions to discover them!"
        accentColor="#22c55e"
        onItemsChange={handleBlessingStatListChange}
      />

      <div className="card">
        <h2>
          <Swords size={20} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
          Combat Strategies
        </h2>

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

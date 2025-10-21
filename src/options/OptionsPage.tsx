/**
 * Options Page - Main settings and configuration interface
 * Tabbed layout with Automation, Settings, Missions, and About tabs
 */

import React, { useState, useEffect } from 'react';
import { Target, Settings, BarChart3, Info } from 'lucide-react';
import AutomationTab from './tabs/AutomationTab';
import SettingsTab from './tabs/SettingsTab';
import MissionsTab from './tabs/MissionsTab';
import AboutTab from './tabs/AboutTab';
import './options.css';

type TabType = 'missions' | 'automation' | 'settings' | 'about';

const OptionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('missions');

  // Support URL hash navigation
  useEffect(() => {
    const hash = window.location.hash.slice(1) as TabType;
    if (hash && ['missions', 'automation', 'settings', 'about'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  return (
    <div className="options-container">
      {/* Header */}
      <header className="options-header">
        <h1>AutoSupper Settings</h1>
        <p>Configure your Sword & Supper automation bot</p>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'missions' ? 'active' : ''}`}
          onClick={() => handleTabChange('missions')}
        >
          <BarChart3 size={16} />
          Missions
        </button>
        <button
          className={`tab-button ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => handleTabChange('automation')}
        >
          <Target size={16} />
          Automation
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabChange('settings')}
        >
          <Settings size={16} />
          Settings
        </button>
        <button
          className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => handleTabChange('about')}
        >
          <Info size={16} />
          About
        </button>
      </nav>

      {/* Tab Content */}
      <main className="tab-content">
        {activeTab === 'missions' && <MissionsTab />}
        {activeTab === 'automation' && <AutomationTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'about' && <AboutTab />}
      </main>
    </div>
  );
};

export default OptionsPage;

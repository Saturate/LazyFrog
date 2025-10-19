/**
 * Game script - Runs inside the game iframe (*.devvit.net)
 * This is where we interact with the actual Sword & Supper game
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import GameControlPanel from '../components/GameControlPanel';

console.log('🎮 Sword & Supper Game script loaded in iframe:', window.location.href);

let root: Root | null = null;

/**
 * Analyze the game page structure
 */
function analyzeGamePage(): void {
  console.log('📊 Analyzing game page...');
  console.log('Document title:', document.title);
  console.log('Body HTML (first 1000 chars):', document.body.innerHTML.substring(0, 1000));

  // Look for common game elements
  const buttons = document.querySelectorAll('button');
  console.log('Buttons found:', buttons.length);
  buttons.forEach((btn, i) => {
    if (i < 10) {
      console.log(`Button ${i}:`, btn.textContent, btn.className);
    }
  });

  // Look for canvas (games often use canvas)
  const canvases = document.querySelectorAll('canvas');
  console.log('Canvas elements:', canvases.length);

  // Look for divs that might contain game state
  const allDivs = document.querySelectorAll('div');
  console.log('Total divs:', allDivs.length);

  // Look for text that might indicate level/difficulty
  const bodyText = document.body.textContent || '';
  console.log('Body contains "level":', bodyText.toLowerCase().includes('level'));
  console.log('Body contains "star":', bodyText.toLowerCase().includes('star'));
  console.log('Body contains "mission":', bodyText.toLowerCase().includes('mission'));

  // Log all elements with IDs
  const elementsWithIds = document.querySelectorAll('[id]');
  console.log('Elements with IDs:', elementsWithIds.length);
  elementsWithIds.forEach((el, i) => {
    if (i < 20) {
      console.log(`ID ${i}:`, el.id, el.tagName, el.textContent?.substring(0, 50));
    }
  });

  // Log all elements with classes
  const elementsWithClasses = document.querySelectorAll('[class]');
  console.log('Elements with classes (first 20):', elementsWithClasses.length);
  Array.from(elementsWithClasses).slice(0, 20).forEach((el, i) => {
    console.log(`Class ${i}:`, el.className, el.tagName, el.textContent?.substring(0, 50));
  });
}

/**
 * Try to extract game state from the page
 */
function extractGameState(): any {
  console.log('🔍 Extracting game state...');

  const state: any = {
    url: window.location.href,
    title: document.title,
    levelInfo: null,
    stars: null,
    buttons: [],
  };

  // Look for level information in the page
  const bodyText = document.body.textContent || '';

  // Try to find level number
  const levelMatch = bodyText.match(/level\s*(\d+)/i);
  if (levelMatch) {
    state.levelInfo = levelMatch[0];
  }

  // Try to find star rating
  const starMatch = bodyText.match(/(\d+)\s*stars?/i);
  if (starMatch) {
    state.stars = parseInt(starMatch[1]);
  }

  // Get all clickable buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach((btn) => {
    const text = btn.textContent?.trim();
    if (text && text.length < 100) {
      state.buttons.push(text);
    }
  });

  console.log('Extracted game state:', state);
  return state;
}

/**
 * Inject React control panel into the game
 */
function injectControlPanel(): void {
  console.log('💉 Injecting control panel...');

  // Remove existing container if any
  let container = document.getElementById('ss-game-control-root');
  if (container) {
    container.remove();
  }

  // Create new container
  container = document.createElement('div');
  container.id = 'ss-game-control-root';
  document.body.appendChild(container);

  // Create root and render
  root = createRoot(container);
  root.render(<GameControlPanel gameState={extractGameState()} />);

  console.log('✅ Control panel injected');
}

/**
 * Click a button by text content
 */
function clickButton(buttonText: string): boolean {
  const buttons = Array.from(document.querySelectorAll('button'));
  const targetButton = buttons.find(
    (btn) => btn.textContent?.trim().toLowerCase().includes(buttonText.toLowerCase())
  );

  if (targetButton) {
    console.log('🖱️ Clicking button:', buttonText);
    targetButton.click();
    return true;
  } else {
    console.log('❌ Button not found:', buttonText);
    return false;
  }
}

/**
 * Get all clickable elements
 */
function getClickableElements(): Element[] {
  const clickable: Element[] = [];

  // Buttons
  clickable.push(...Array.from(document.querySelectorAll('button')));

  // Links
  clickable.push(...Array.from(document.querySelectorAll('a')));

  // Elements with click handlers
  clickable.push(...Array.from(document.querySelectorAll('[onclick]')));

  return clickable;
}

// Listen for messages from the main page
window.addEventListener('message', (event) => {
  console.log('📨 Game script received message:', event.data);

  if (event.data.type === 'SS_BOT_ANALYZE') {
    analyzeGamePage();
    extractGameState();
  } else if (event.data.type === 'SS_BOT_INJECT_CONTROLS') {
    injectControlPanel();
  } else if (event.data.type === 'SS_BOT_CLICK_BUTTON') {
    clickButton(event.data.buttonText);
  }
});

// Notify parent that game script is ready
window.parent.postMessage({ type: 'SS_GAME_SCRIPT_READY', url: window.location.href }, '*');

// Initial analysis after a delay
setTimeout(() => {
  console.log('🚀 Running initial game analysis...');
  analyzeGamePage();
  extractGameState();

  // Auto-inject control panel
  // injectControlPanel();
}, 2000);

// Export functions for use in console
(window as any).ssBot = {
  analyze: analyzeGamePage,
  getState: extractGameState,
  clickButton,
  injectControls: injectControlPanel,
  getClickable: getClickableElements,
};

console.log('💡 Bot functions available in console via window.ssBot');

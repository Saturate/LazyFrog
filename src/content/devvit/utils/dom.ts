/**
 * Game DOM utility functions
 * Functions for analyzing, extracting state, and interacting with the game DOM
 */

/**
 * Analyze the game page structure (debug function)
 */
export function analyzeGamePage(): void {
  console.log('[DEVVIT] 📊 Analyzing game page...');
  console.log('[DEVVIT] Document title:', document.title);
  console.log('[DEVVIT] Body HTML (first 1000 chars):', document.body.innerHTML.substring(0, 1000));

  // Look for common game elements
  const buttons = document.querySelectorAll('button');
  console.log('[DEVVIT] Buttons found:', buttons.length);
  buttons.forEach((btn, i) => {
    if (i < 10) {
      console.log(`[DEVVIT] Button ${i}:`, btn.textContent, btn.className);
    }
  });

  // Look for canvas (games often use canvas)
  const canvases = document.querySelectorAll('canvas');
  console.log('[DEVVIT] Canvas elements:', canvases.length);

  // Look for divs that might contain game state
  const allDivs = document.querySelectorAll('div');
  console.log('[DEVVIT] Total divs:', allDivs.length);

  // Look for text that might indicate level/difficulty
  const bodyText = document.body.textContent || '';
  console.log('[DEVVIT] Body contains "level":', bodyText.toLowerCase().includes('level'));
  console.log('[DEVVIT] Body contains "star":', bodyText.toLowerCase().includes('star'));
  console.log('[DEVVIT] Body contains "mission":', bodyText.toLowerCase().includes('mission'));

  // Log all elements with IDs
  const elementsWithIds = document.querySelectorAll('[id]');
  console.log('[DEVVIT] Elements with IDs:', elementsWithIds.length);
  elementsWithIds.forEach((el, i) => {
    if (i < 20) {
      console.log(`[DEVVIT] ID ${i}:`, el.id, el.tagName, el.textContent?.substring(0, 50));
    }
  });

  // Log all elements with classes
  const elementsWithClasses = document.querySelectorAll('[class]');
  console.log('[DEVVIT] Elements with classes (first 20):', elementsWithClasses.length);
  Array.from(elementsWithClasses).slice(0, 20).forEach((el, i) => {
    console.log(`[DEVVIT] Class ${i}:`, el.className, el.tagName, el.textContent?.substring(0, 50));
  });
}

/**
 * Extract game state from the page
 */
export function extractGameState(): any {
  console.log('[DEVVIT] 🔍 Extracting game state...');

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

  console.log('[DEVVIT] Extracted game state:', state);
  return state;
}

/**
 * Click a button by text content
 */
export function clickButton(buttonText: string): boolean {
  const buttons = Array.from(document.querySelectorAll('button'));
  const targetButton = buttons.find(
    (btn) => btn.textContent?.trim().toLowerCase().includes(buttonText.toLowerCase())
  );

  if (targetButton) {
    console.log('[DEVVIT] 🖱️ Clicking button:', buttonText);
    targetButton.click();
    return true;
  } else {
    console.log('[DEVVIT] ❌ Button not found:', buttonText);
    return false;
  }
}

/**
 * Get all clickable elements
 */
export function getClickableElements(): Element[] {
  const clickable: Element[] = [];

  // Buttons
  clickable.push(...Array.from(document.querySelectorAll('button')));

  // Links
  clickable.push(...Array.from(document.querySelectorAll('a')));

  // Elements with click handlers
  clickable.push(...Array.from(document.querySelectorAll('[onclick]')));

  return clickable;
}

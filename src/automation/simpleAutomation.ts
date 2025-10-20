/**
 * Simple Button-Clicking Automation
 * No metadata required - just clicks buttons as they appear
 */

import { devvitLogger } from '../utils/logger';

export interface SimpleAutomationConfig {
  enabled: boolean;
  abilityTierList: string[]; // Preferred abilities in order
  blessingStatPriority: string[]; // Preferred blessing stats in order (e.g., ['Speed', 'Attack', 'Defense'])
  autoAcceptSkillBargains: boolean;
  skillBargainStrategy: 'always' | 'positive-only' | 'never';
  crossroadsStrategy: 'fight' | 'skip'; // Whether to fight or skip mini boss encounters
  clickDelay: number; // Delay between clicks in ms
}

export const DEFAULT_SIMPLE_CONFIG: SimpleAutomationConfig = {
  enabled: false,
  abilityTierList: ['IceKnifeOnTurnStart', 'LightningOnCrit', 'HealOnFirstTurn'],
  blessingStatPriority: ['Speed', 'Attack', 'Crit', 'Health', 'Defense', 'Dodge'], // Speed first for faster gameplay
  autoAcceptSkillBargains: true,
  skillBargainStrategy: 'positive-only',
  crossroadsStrategy: 'skip', // Skip mini bosses by default (safer/faster)
  clickDelay: 1000,
};

export class SimpleAutomationEngine {
  private config: SimpleAutomationConfig;
  private intervalId: number | null = null;
  private isProcessing = false;
  private inCombat = false;
  private missionMetadata: any = null;

  constructor(config: SimpleAutomationConfig) {
    this.config = { ...DEFAULT_SIMPLE_CONFIG, ...config };
    this.setupMessageListener();
  }

  /**
   * Listen to window messages for game state
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      try {
        // Log ALL game messages to server for debugging (but not to console)
        if (event.data) {
          // Determine message type for categorization
          let messageType = 'unknown';
          if (event.data?.data?.message?.type) {
            messageType = event.data.data.message.type;
          } else if (event.data?.type) {
            messageType = event.data.type;
          }

          // Log to server (simplified for storage)
          devvitLogger.log(`[GameMessage:${messageType}]`, {
            type: messageType,
            hasData: !!event.data.data,
            origin: event.origin,
            dataKeys: Object.keys(event.data).slice(0, 10), // First 10 keys
            // Include full data for important messages
            fullData: ['initialData', 'COMBAT_START', 'COMBAT_END'].includes(messageType)
              ? event.data
              : undefined,
          });
        }

        // Check for initialData message (mission metadata)
        if (event.data?.data?.message?.type === 'initialData') {
          this.missionMetadata = event.data.data.message.data?.missionMetadata;
          devvitLogger.log('[SimpleAutomation] Mission metadata received', {
            difficulty: this.missionMetadata?.mission?.difficulty,
            environment: this.missionMetadata?.mission?.environment,
            encounters: this.missionMetadata?.mission?.encounters?.length,
          });
        }

        // Check for combat events
        if (event.data?.type === 'COMBAT_START') {
          this.inCombat = true;
          devvitLogger.log('[SimpleAutomation] Combat started - pausing button clicks');
        }

        if (event.data?.type === 'COMBAT_END') {
          this.inCombat = false;
          devvitLogger.log('[SimpleAutomation] Combat ended - resuming automation');
        }
      } catch (error) {
        // Log parsing errors
        devvitLogger.error('[SimpleAutomation] Error parsing message', { error: String(error) });
      }
    });
  }

  /**
   * Start the automation loop
   */
  public start(): void {
    if (this.intervalId) {
      devvitLogger.log('[SimpleAutomation] Already running');
      return;
    }

    devvitLogger.log('[SimpleAutomation] Starting button-clicking automation');
    this.config.enabled = true;

    // Check for buttons every 500ms
    this.intervalId = window.setInterval(() => {
      if (this.config.enabled && !this.isProcessing) {
        this.processButtons();
      }
    }, 500);
  }

  /**
   * Stop the automation loop
   */
  public stop(): void {
    devvitLogger.log('[SimpleAutomation] Stopping automation');
    this.config.enabled = false;

    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SimpleAutomationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current state
   */
  public getState(): any {
    return {
      enabled: this.config.enabled,
      isProcessing: this.isProcessing,
      inCombat: this.inCombat,
      hasMissionMetadata: !!this.missionMetadata,
      missionDifficulty: this.missionMetadata?.mission?.difficulty,
      missionEnvironment: this.missionMetadata?.mission?.environment,
    };
  }

  /**
   * Main logic - find and click appropriate buttons
   */
  private async processButtons(): Promise<void> {
    this.isProcessing = true;

    try {
      // Skip if in combat (let the battle play out)
      if (this.inCombat) {
        this.isProcessing = false;
        return;
      }

      const buttons = this.findAllButtons();

      if (buttons.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Log buttons with element info for console inspection
      const buttonInfo = buttons.map(b => ({
        text: b.textContent?.trim(),
        tagName: b.tagName,
        className: b.className,
        element: b // This will be available in browser console but simplified in remote logs
      }));

      devvitLogger.log('[SimpleAutomation] Found buttons', {
        buttons: buttons.map(b => `${b.tagName}.${b.className}: "${b.textContent?.trim()}"`),
        count: buttons.length
      });

      // Also log to console with actual DOM references
      console.log('[SimpleAutomation] Button elements:', buttonInfo);

      // Priority order for clicking buttons (matching userscript logic)
      const clickedButton =
        this.tryClickSkip(buttons) ||        // Skip intro/dialogue
        this.tryClickBattle(buttons) ||      // Advance/Battle buttons
        this.tryClickCrossroads(buttons) ||  // Crossroads mini boss (Fight/Skip)
        this.tryClickAbility(buttons) ||     // Skill/Ability choices (includes blessings)
        this.tryClickSkillBargain(buttons) || // Accept/Decline bargains
        this.tryClickContinue(buttons);      // Continue/Finish

      if (clickedButton) {
        devvitLogger.log('[SimpleAutomation] Clicked button', { button: clickedButton });
        // Wait a bit before processing next button
        await this.delay(this.config.clickDelay);
      }
    } catch (error) {
      devvitLogger.error('[SimpleAutomation] Error processing buttons', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Find all clickable game buttons (matching working userscript pattern)
   */
  private findAllButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = [];

    // Match the working userscript pattern exactly
    // Look for: .advance-button, .skill-button, .skip-button
    const selectors = [
      '.advance-button',
      '.skill-button',
      '.skip-button',
      'button' // Also include regular buttons
    ];

    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
      for (const element of elements) {
        // For advance-button, check if parent wrapper has button-hidden class
        // If it does, skip this button (it's not clickable yet)
        if (selector === '.advance-button') {
          const parent = element.parentElement;
          if (parent && parent.classList.contains('advance-button-wrapper')) {
            if (parent.classList.contains('button-hidden')) {
              continue; // Skip hidden advance buttons
            }
          }
        }

        // Check if element is visible
        const rect = element.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;

        if (isVisible && !buttons.includes(element)) {
          buttons.push(element);
        }
      }
    }

    return buttons;
  }

  /**
   * Try to click skip button
   */
  private tryClickSkip(buttons: HTMLElement[]): string | null {
    const skipButton = buttons.find(b => b.classList.contains('skip-button'));

    if (skipButton) {
      this.clickElement(skipButton);
      return 'skip-button';
    }

    return null;
  }

  /**
   * Try to click "Battle" button (or any advance-button)
   */
  private tryClickBattle(buttons: HTMLElement[]): string | null {
    // Priority 1: Look for "Battle" text
    let battleButton = buttons.find(b =>
      b.textContent?.trim().toLowerCase() === 'battle'
    );

    // Priority 2: If no "Battle" text, look for .advance-button class
    if (!battleButton) {
      battleButton = buttons.find(b => b.classList.contains('advance-button'));
    }

    if (battleButton) {
      this.clickElement(battleButton);
      return battleButton.textContent?.trim() || 'advance-button';
    }

    return null;
  }

  /**
   * Click an element (simple native click like working userscript)
   */
  private clickElement(element: HTMLElement): void {
    // Just use native click - this is what works in the userscript
    element.click();
  }

  /**
   * Try to click crossroads mini boss encounter button (Let's Fight / Skip)
   */
  private tryClickCrossroads(buttons: HTMLElement[]): string | null {
    // Look for "Let's Fight" and "Skip" buttons (crossroads encounter)
    const fightButton = buttons.find(b => {
      const text = b.textContent?.trim().toLowerCase() || '';
      return text.includes("let's fight") || text.includes('fight');
    });
    const skipButton = buttons.find(b => {
      const text = b.textContent?.trim().toLowerCase() || '';
      // Only match "Skip" in crossroads context (not general skip-button)
      return text === 'skip' && !b.classList.contains('skip-button');
    });

    // Only process if we have both buttons (it's a crossroads encounter)
    if (fightButton && skipButton) {
      if (this.config.crossroadsStrategy === 'fight') {
        this.clickElement(fightButton);
        return `Crossroads: ${fightButton.textContent?.trim()} (fight strategy)`;
      } else {
        this.clickElement(skipButton);
        return `Crossroads: ${skipButton.textContent?.trim()} (skip strategy)`;
      }
    }

    return null;
  }

  /**
   * Try to click ability button based on tier list (skill-button class)
   * Also handles blessing stat choices
   */
  private tryClickAbility(buttons: HTMLElement[]): string | null {
    // Look for skill buttons
    const skillButtons = buttons.filter(b => b.classList.contains('skill-button'));

    if (skillButtons.length === 0) {
      return null;
    }

    // Check if this is a blessing encounter (stat choices like "Increase Speed by X%")
    const isBlessing = skillButtons.some(b => {
      const text = b.textContent?.trim() || '';
      return /Increase (Speed|Attack|Defense|Health|Crit|Dodge) by \d+%/.test(text);
    });

    if (isBlessing) {
      // Handle blessing stat choices based on priority
      for (const stat of this.config.blessingStatPriority) {
        const blessingButton = skillButtons.find(b => {
          const text = b.textContent?.trim() || '';
          return text.includes(`Increase ${stat}`);
        });

        if (blessingButton) {
          this.clickElement(blessingButton);
          return `Blessing: ${blessingButton.textContent?.trim()}`;
        }
      }
    }

    // Look for ability names from our tier list
    for (const abilityId of this.config.abilityTierList) {
      const abilityButton = skillButtons.find(b => {
        const text = b.textContent?.trim() || '';
        // Match ability ID or readable name
        return text.includes(abilityId) || this.matchesAbilityName(text, abilityId);
      });

      if (abilityButton) {
        this.clickElement(abilityButton);
        return abilityButton.textContent?.trim() || abilityId;
      }
    }

    // If no preferred ability found, click the first skill button
    if (skillButtons.length > 0) {
      this.clickElement(skillButtons[0]);
      return skillButtons[0].textContent?.trim() || 'skill-button';
    }

    return null;
  }

  /**
   * Try to click skill bargain button (Accept/Decline)
   */
  private tryClickSkillBargain(buttons: HTMLElement[]): string | null {
    const acceptButton = buttons.find(b =>
      b.textContent?.trim().toLowerCase() === 'accept'
    );
    const declineButton = buttons.find(b =>
      b.textContent?.trim().toLowerCase() === 'decline'
    );

    // Only process if we have both buttons (it's a skill bargain)
    if (acceptButton && declineButton) {
      if (this.config.skillBargainStrategy === 'always') {
        this.clickElement(acceptButton);
        return 'Accept (always strategy)';
      } else if (this.config.skillBargainStrategy === 'never') {
        this.clickElement(declineButton);
        return 'Decline (never strategy)';
      } else if (this.config.skillBargainStrategy === 'positive-only') {
        // For now, default to accept if auto-accept is enabled
        // TODO: Parse the bargain text to determine if it's positive
        if (this.config.autoAcceptSkillBargains) {
          this.clickElement(acceptButton);
          return 'Accept (positive-only strategy - default accept)';
        } else {
          this.clickElement(declineButton);
          return 'Decline (positive-only strategy - default decline)';
        }
      }
    }

    return null;
  }

  /**
   * Try to click "Continue" button
   */
  private tryClickContinue(buttons: HTMLElement[]): string | null {
    const continueButton = buttons.find(b => {
      // Check text content
      const text = b.textContent?.trim().toLowerCase() || '';
      if (text === 'continue') return true;

      // Check for continue-button class
      if (b.classList.contains('continue-button')) return true;

      // Check for img with alt="Continue"
      const img = b.querySelector('img[alt="Continue"]');
      if (img) return true;

      return false;
    });

    if (continueButton) {
      this.clickElement(continueButton);
      return 'Continue';
    }

    return null;
  }

  /**
   * Match ability readable name to ability ID
   */
  private matchesAbilityName(buttonText: string, abilityId: string): boolean {
    const nameMap: Record<string, string[]> = {
      'IceKnifeOnTurnStart': ['ice knife', 'iceknife'],
      'LightningOnCrit': ['lightning', 'crit lightning'],
      'HealOnFirstTurn': ['heal', 'healing', 'first turn heal'],
    };

    const variants = nameMap[abilityId] || [];
    const lowerText = buttonText.toLowerCase();
    return variants.some(variant => lowerText.includes(variant));
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

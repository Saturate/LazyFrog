/**
 * Mission Automation Module
 * Handles automatic mission playback based on mission metadata
 */

export interface MissionMetadata {
  mission: {
    environment: string;
    encounters: Encounter[];
    minLevel: number;
    maxLevel: number;
    difficulty: number;
    foodName: string;
    rarity: string;
  };
  missionTitle: string;
  missionAuthorName: string;
  scenarioText: string;
}

export interface Encounter {
  type: 'enemy' | 'skillBargain' | 'abilityChoice' | 'treasure';
  // Enemy encounter fields
  enemies?: Array<{
    id: string;
    type: string;
    level: number;
  }>;
  // Skill bargain fields
  positiveEffect?: {
    type: string;
    stat?: string;
    amount: number;
  };
  negativeEffect?: {
    type: string;
    stat?: string;
    amount: number;
  };
  // Ability choice fields
  isEnchanted?: boolean;
  optionA?: { type: string; abilityId: string };
  optionB?: { type: string; abilityId: string };
  optionC?: { type: string; abilityId: string };
  // Treasure fields
  missionType?: string;
  reward?: {
    essences?: Array<{ id: string; quantity: number }>;
    tier?: number;
  };
}

export interface AutomationConfig {
  enabled: boolean;
  abilityTierList: string[]; // Ordered list of ability IDs by preference
  autoAcceptSkillBargains: boolean;
  skillBargainStrategy: 'always' | 'positive-only' | 'never';
}

export interface ConsoleLogEntry {
  type: string;
  timestamp: number;
  args: any[];
  message: string;
}

export class MissionAutomationEngine {
  private missionMetadata: MissionMetadata | null = null;
  private currentEncounterIndex: number = 0;
  private config: AutomationConfig;
  private consoleLogListener: ((entry: ConsoleLogEntry) => void) | null = null;
  private inCombat: boolean = false;
  private missionActive: boolean = false;

  constructor(config: AutomationConfig) {
    this.config = config;
  }

  /**
   * Start monitoring console logs for mission metadata and combat events
   */
  public startConsoleMonitoring(): void {
    console.log('🔊 Starting console log monitoring for mission automation');

    // Override console.log to capture mission data
    const originalLog = console.log;
    const self = this;

    console.log = function (...args: any[]) {
      // Call original console.log
      originalLog.apply(console, args);

      // Check for mission metadata
      if (args.length > 0) {
        const firstArg = args[0];

        // Detect mission metadata (initialData message)
        if (
          typeof firstArg === 'string' &&
          (firstArg.includes('initialData') || firstArg.includes('missionMetadata'))
        ) {
          self.handleInitialData(args);
        }

        // Detect combat start
        if (firstArg === 'Combat start!') {
          self.inCombat = true;
          console.log('⚔️ Combat detected, waiting for completion...');
        }

        // Detect encounter result
        if (typeof firstArg === 'string' && firstArg.startsWith('Encounter result:')) {
          self.handleEncounterResult(args);
        }

        // Notify listener if set
        if (self.consoleLogListener) {
          self.consoleLogListener({
            type: 'log',
            timestamp: Date.now(),
            args,
            message: args.join(' '),
          });
        }
      }
    };
  }

  /**
   * Handle initial data message containing mission metadata
   */
  private handleInitialData(args: any[]): void {
    try {
      // Try to parse mission metadata from the log
      const logText = args.join(' ');

      // Look for JSON object in the log
      const jsonMatch = logText.match(/\{.*"missionMetadata".*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.missionMetadata) {
          this.missionMetadata = data.missionMetadata;
          this.missionActive = true;
          this.currentEncounterIndex = 0;
          console.log('✅ Mission metadata captured:', data.missionMetadata);
          console.log(`📋 Mission has ${data.missionMetadata.mission.encounters.length} encounters`);

          // If automation is enabled, start processing
          if (this.config.enabled) {
            this.processNextEncounter();
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse mission metadata:', error);
    }
  }

  /**
   * Handle encounter result message
   */
  private handleEncounterResult(args: any[]): void {
    this.inCombat = false;
    const logText = args.join(' ');

    try {
      const resultMatch = logText.match(/Encounter result: (\{.*\})/);
      if (resultMatch) {
        const result = JSON.parse(resultMatch[1]);
        console.log('✅ Encounter completed:', result);

        if (result.victory) {
          this.currentEncounterIndex++;
          console.log(`✨ Moving to encounter ${this.currentEncounterIndex}`);

          // Process next encounter after a delay
          if (this.config.enabled && this.missionActive) {
            setTimeout(() => this.processNextEncounter(), 2000);
          }
        } else {
          console.log('💀 Mission failed!');
          this.missionActive = false;
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse encounter result:', error);
    }
  }

  /**
   * Detect current encounter type by analyzing DOM elements
   * This is the primary detection method - more reliable than metadata
   */
  private detectCurrentEncounterType(): 'enemy' | 'skillBargain' | 'abilityChoice' | 'treasure' | 'unknown' {
    const buttons = Array.from(document.querySelectorAll('button'));
    const buttonTexts = buttons.map(btn => btn.textContent?.trim().toLowerCase() || '');

    // Check for "Battle" button -> Enemy encounter
    if (buttonTexts.some(text => text.includes('battle'))) {
      return 'enemy';
    }

    // Check for "Continue" button and "VICTORY" text -> Treasure
    const bodyText = document.body.textContent?.toLowerCase() || '';
    if (buttonTexts.some(text => text.includes('continue')) && bodyText.includes('victory')) {
      return 'treasure';
    }

    // Check for "Advance" button -> between encounters or choice pending
    if (buttonTexts.some(text => text === 'advance')) {
      return 'unknown'; // Need to advance first
    }

    // Check for ability choice - look for multiple ability-like buttons
    // Ability buttons typically contain longer descriptive text
    const longButtons = buttons.filter(btn =>
      (btn.textContent?.length || 0) > 10 &&
      !['battle', 'continue', 'advance', 'refuse'].includes(btn.textContent?.toLowerCase() || '')
    );
    if (longButtons.length >= 3) {
      return 'abilityChoice';
    }

    // Check for skill bargain - look for "Refuse" button
    if (buttonTexts.some(text => text.includes('refuse'))) {
      return 'skillBargain';
    }

    return 'unknown';
  }

  /**
   * Process the next encounter based on DOM detection (primary) with metadata fallback
   */
  private async processNextEncounter(): Promise<void> {
    if (!this.missionActive) {
      console.log('⏸️ Mission not active');
      return;
    }

    // Wait if in combat
    if (this.inCombat) {
      console.log('⏳ Waiting for combat to finish...');
      setTimeout(() => this.processNextEncounter(), 1000);
      return;
    }

    // Wait a bit for UI to render
    await this.sleep(1500);

    // Detect encounter type from DOM
    const encounterType = this.detectCurrentEncounterType();
    console.log(`🔍 Detected encounter type: ${encounterType}`);

    // If we have metadata, log which encounter we think we're on
    if (this.missionMetadata) {
      const encounters = this.missionMetadata.mission.encounters;
      if (this.currentEncounterIndex < encounters.length) {
        const expectedEncounter = encounters[this.currentEncounterIndex];
        console.log(
          `📋 Metadata says encounter ${this.currentEncounterIndex + 1}/${encounters.length}: ${expectedEncounter.type}`
        );
      }
    }

    // Handle encounter based on DOM detection
    switch (encounterType) {
      case 'enemy':
        await this.handleEnemyEncounter();
        break;
      case 'skillBargain':
        await this.handleSkillBargain();
        break;
      case 'abilityChoice':
        await this.handleAbilityChoice();
        break;
      case 'treasure':
        await this.handleTreasure();
        break;
      case 'unknown':
        console.log('❓ Unknown encounter state, clicking Advance if available');
        const advanceClicked = this.clickButtonByText('Advance');
        if (advanceClicked) {
          setTimeout(() => this.processNextEncounter(), 2000);
        } else {
          console.error('❌ Could not determine encounter type and no Advance button found');
        }
        break;
      default:
        console.error('❌ Unknown encounter type:', encounterType);
    }
  }

  /**
   * Handle enemy encounter - click Battle button
   */
  private async handleEnemyEncounter(): Promise<void> {
    console.log('⚔️ Enemy encounter - clicking Battle button');
    const clicked = this.clickButtonByText('Battle');
    if (clicked) {
      console.log('✅ Battle started, combat system will handle turns automatically');
    } else {
      console.error('❌ Failed to find Battle button');
    }
  }

  /**
   * Handle skill bargain - decide whether to accept or decline
   */
  private async handleSkillBargain(): Promise<void> {
    console.log('🤝 Skill Bargain encountered');

    // Try to get metadata for this encounter if available
    let shouldAccept = false;
    if (this.missionMetadata && this.currentEncounterIndex < this.missionMetadata.mission.encounters.length) {
      const encounter = this.missionMetadata.mission.encounters[this.currentEncounterIndex];
      if (encounter.type === 'skillBargain') {
        console.log('Positive effect:', encounter.positiveEffect);
        console.log('Negative effect:', encounter.negativeEffect);

        switch (this.config.skillBargainStrategy) {
          case 'always':
            shouldAccept = true;
            break;
          case 'never':
            shouldAccept = false;
            break;
          case 'positive-only':
            // Simple heuristic: accept if positive effect is larger than negative
            const positiveAmount = Math.abs(encounter.positiveEffect?.amount || 0);
            const negativeAmount = Math.abs(encounter.negativeEffect?.amount || 0);
            shouldAccept = positiveAmount >= negativeAmount;
            break;
        }
      }
    } else {
      // Fallback: use configured strategy without metadata
      shouldAccept = this.config.skillBargainStrategy === 'always';
    }

    console.log(`📊 Decision: ${shouldAccept ? 'Accept' : 'Decline'}`);

    // Click the appropriate button
    if (shouldAccept) {
      // Look for button with positive effect description (contains "Increase" or stat name)
      const clicked = this.clickButtonByText('Increase');
      if (!clicked) {
        console.error('❌ Failed to find Accept button, trying first non-refuse button');
        // Fallback: click first button that isn't Refuse
        const buttons = Array.from(document.querySelectorAll('button'));
        const acceptButton = buttons.find(btn => !btn.textContent?.toLowerCase().includes('refuse'));
        if (acceptButton) acceptButton.click();
      }
    } else {
      const clicked = this.clickButtonByText('Refuse');
      if (!clicked) {
        console.error('❌ Failed to find Decline button');
      }
    }

    // Skill bargains complete immediately, move to next encounter
    this.currentEncounterIndex++;
    setTimeout(() => this.processNextEncounter(), 2000);
  }

  /**
   * Handle ability choice - select based on tier list
   */
  private async handleAbilityChoice(): Promise<void> {
    console.log('🎓 Ability Choice encountered');

    // Try to use metadata if available
    if (this.missionMetadata && this.currentEncounterIndex < this.missionMetadata.mission.encounters.length) {
      const encounter = this.missionMetadata.mission.encounters[this.currentEncounterIndex];
      if (encounter.type === 'abilityChoice') {
        const options = [encounter.optionA, encounter.optionB, encounter.optionC].filter(
          Boolean
        ) as Array<{ type: string; abilityId: string }>;

        console.log('Available abilities (from metadata):', options.map((o) => o.abilityId));

        // Find the highest-ranked ability from tier list
        let selectedAbility = null;
        for (const preferredAbility of this.config.abilityTierList) {
          const found = options.find((opt) => opt.abilityId === preferredAbility);
          if (found) {
            selectedAbility = found;
            break;
          }
        }

        if (selectedAbility) {
          console.log(`✨ Selected ability: ${selectedAbility.abilityId}`);

          // Try to click based on ability name mapping
          const abilityNameMap: Record<string, string> = {
            IceKnifeOnTurnStart: 'Ice Knife',
            LightningOnCrit: 'Lightning',
            HealOnFirstTurn: 'Heal',
          };

          const buttonText = abilityNameMap[selectedAbility.abilityId] || selectedAbility.abilityId;
          const clicked = this.clickButtonByText(buttonText);

          if (clicked) {
            this.currentEncounterIndex++;
            setTimeout(() => this.processNextEncounter(), 2000);
            return;
          }
        }
      }
    }

    // Fallback: No metadata or metadata didn't help - click first ability button
    console.log('⚠️ Using DOM fallback - clicking first ability option');
    const buttons = Array.from(document.querySelectorAll('button'));
    const abilityButtons = buttons.filter(btn =>
      (btn.textContent?.length || 0) > 10 &&
      !['battle', 'continue', 'advance', 'refuse'].includes(btn.textContent?.toLowerCase() || '')
    );

    if (abilityButtons.length > 0) {
      abilityButtons[0].click();
      console.log(`✅ Clicked first ability button: ${abilityButtons[0].textContent}`);
    } else {
      console.error('❌ No ability buttons found');
    }

    this.currentEncounterIndex++;
    setTimeout(() => this.processNextEncounter(), 2000);
  }

  /**
   * Handle treasure - click Continue button
   */
  private async handleTreasure(): Promise<void> {
    console.log('🎁 Treasure encounter - clicking Continue button');
    const clicked = this.clickButtonByText('Continue');
    if (clicked) {
      console.log('✅ Mission completed!');
      this.missionActive = false;
    } else {
      console.error('❌ Failed to find Continue button');
    }
  }

  /**
   * Click a button by matching text content
   */
  private clickButtonByText(text: string): boolean {
    const buttons = Array.from(document.querySelectorAll('button'));
    const targetButton = buttons.find((btn) =>
      btn.textContent?.toLowerCase().includes(text.toLowerCase())
    );

    if (targetButton) {
      console.log(`🖱️ Clicking button: "${text}"`);
      targetButton.click();
      return true;
    }

    console.log(`❌ Button not found: "${text}"`);
    return false;
  }

  /**
   * Click a button by index
   */
  private clickButtonByIndex(index: number): boolean {
    const buttons = Array.from(document.querySelectorAll('button'));
    if (buttons[index]) {
      console.log(`🖱️ Clicking button at index ${index}`);
      buttons[index].click();
      return true;
    }
    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current mission state
   */
  public getState() {
    return {
      missionMetadata: this.missionMetadata,
      currentEncounterIndex: this.currentEncounterIndex,
      inCombat: this.inCombat,
      missionActive: this.missionActive,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ Automation config updated:', this.config);
  }

  /**
   * Enable/disable automation
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(enabled ? '▶️ Automation enabled' : '⏸️ Automation disabled');

    if (enabled && this.missionMetadata && !this.inCombat) {
      this.processNextEncounter();
    }
  }

  /**
   * Reset mission state
   */
  public reset(): void {
    this.missionMetadata = null;
    this.currentEncounterIndex = 0;
    this.inCombat = false;
    this.missionActive = false;
    console.log('🔄 Mission state reset');
  }
}

// Default configuration
export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  enabled: false,
  abilityTierList: [
    'IceKnifeOnTurnStart', // High damage, kills enemies faster
    'LightningOnCrit', // Additional damage on crits
    'HealOnFirstTurn', // Defensive fallback
  ],
  autoAcceptSkillBargains: true,
  skillBargainStrategy: 'positive-only',
};

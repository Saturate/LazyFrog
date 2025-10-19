#!/usr/bin/env node

/**
 * Debug script to test Reddit selectors using Puppeteer
 * This will launch Chrome, load the subreddit, and test all selectors
 */

const puppeteer = require('puppeteer');
const path = require('path');

const SUBREDDIT_URL = 'https://www.reddit.com/r/SwordAndSupperGame/';
const EXTENSION_PATH = path.join(__dirname, 'dist');

async function debugSelectors() {
  console.log('🚀 Launching Chrome with extension...');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();

  // Listen for console messages from the page
  page.on('console', async (msg) => {
    const text = msg.text();
    const type = msg.type();

    if (type === 'error') {
      console.log(`❌ [PAGE ERROR] ${text}`);
    } else if (text.includes('🤖') || text.includes('Sword & Supper')) {
      console.log(`📋 [EXTENSION] ${text}`);
    }
  });

  console.log('🌐 Navigating to Reddit...');
  await page.goto(SUBREDDIT_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('⏳ Waiting for page to fully load...');
  await page.waitForTimeout(5000);

  console.log('\n🔍 Testing selectors...\n');

  const selectors = [
    '[data-testid="post-container"]',
    'shreddit-post',
    '[data-click-id="background"]',
    'article',
    '[id^="t3_"]',
    '[slot="post-index"]',
    'div[tabindex="-1"]'
  ];

  const results = await page.evaluate((selectors) => {
    const results = [];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        results.push({
          selector,
          count: elements.length,
          found: elements.length > 0,
          sample: elements.length > 0 ? {
            tagName: elements[0].tagName,
            className: elements[0].className,
            id: elements[0].id,
            textPreview: elements[0].textContent?.substring(0, 100)
          } : null
        });
      } catch (error) {
        results.push({
          selector,
          error: error.message
        });
      }
    }

    return results;
  }, selectors);

  console.log('📊 Selector Results:');
  results.forEach(result => {
    if (result.error) {
      console.log(`  ❌ "${result.selector}" - Error: ${result.error}`);
    } else if (result.found) {
      console.log(`  ✅ "${result.selector}" - Found ${result.count} elements`);
      if (result.sample) {
        console.log(`     Tag: <${result.sample.tagName.toLowerCase()}>`);
        if (result.sample.className) {
          console.log(`     Class: "${result.sample.className.substring(0, 50)}"`);
        }
        if (result.sample.id) {
          console.log(`     ID: "${result.sample.id}"`);
        }
      }
    } else {
      console.log(`  ❌ "${result.selector}" - Found 0 elements`);
    }
  });

  console.log('\n🔎 Checking extension console logs...\n');

  // Check if our debug object is available
  const debugAvailable = await page.evaluate(() => {
    return typeof (window as any).autoSupperDebug !== 'undefined';
  });

  console.log(`Extension debug object available: ${debugAvailable ? '✅' : '❌'}`);

  if (debugAvailable) {
    console.log('🧪 Running extension debug tests...\n');

    const debugResults = await page.evaluate(() => {
      const debug = (window as any).autoSupperDebug;
      const levels = debug.getAllLevels();

      return {
        levelsFound: levels.length,
        filters: debug.filters,
        isRunning: debug.isRunning,
        sampleLevels: levels.slice(0, 3)
      };
    });

    console.log('📊 Extension Results:');
    console.log(`  Levels found: ${debugResults.levelsFound}`);
    console.log(`  Is running: ${debugResults.isRunning}`);
    console.log(`  Filters:`, debugResults.filters);

    if (debugResults.sampleLevels.length > 0) {
      console.log('\n🎯 Sample levels:');
      debugResults.sampleLevels.forEach((level, i) => {
        console.log(`  ${i + 1}. ${level.title}`);
        console.log(`     Level: ${level.levelNumber}, Stars: ${level.stars}`);
        console.log(`     URL: ${level.href}`);
      });
    } else {
      console.log('\n❌ No levels found by extension');
    }
  }

  console.log('\n📸 Taking screenshot...');
  await page.screenshot({ path: 'reddit-debug-screenshot.png', fullPage: false });
  console.log('Screenshot saved to: reddit-debug-screenshot.png');

  console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
  console.log('   You can interact with the page and check DevTools');

  await page.waitForTimeout(30000);

  await browser.close();
  console.log('✅ Debug complete!');
}

debugSelectors().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

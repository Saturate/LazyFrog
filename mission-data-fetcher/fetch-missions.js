#!/usr/bin/env node

/**
 * Mission Data Fetcher - Standalone Script
 *
 * Fetches mission metadata from Reddit's SwordAndSupper game by querying the Devvit gateway.
 *
 * Usage:
 *   node fetch-missions.js --input postIds.txt --output missions.json
 *
 * See README.md for detailed usage instructions.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

// Dynamic import for @devvit/protos (ESM)
let UIRequest, UIResponse;

// Configuration
const CONFIG = {
  DEVVIT_GATEWAY_URL: 'https://devvit-gateway.reddit.com/devvit.reddit.custom_post.v1alpha.CustomPost/RenderPostContent',
  DEVVIT_INSTALLATION_ID: '7f2e80d7-6821-4a20-9405-05c3b43012ea',
  DEFAULT_INPUT_FILE: 'postIds.txt',
  DEFAULT_OUTPUT_FILE: 'missions.json',
  DEFAULT_DELAY_MS: 1500,
};

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Print colored output to console
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: CONFIG.DEFAULT_INPUT_FILE,
    output: CONFIG.DEFAULT_OUTPUT_FILE,
    cookies: null,
    delay: CONFIG.DEFAULT_DELAY_MS,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--input':
      case '-i':
        options.input = next;
        i++;
        break;
      case '--output':
      case '-o':
        options.output = next;
        i++;
        break;
      case '--cookies':
      case '-c':
        options.cookies = next;
        i++;
        break;
      case '--delay':
      case '-d':
        options.delay = parseInt(next, 10);
        i++;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
${colors.bright}Mission Data Fetcher - Standalone Script${colors.reset}

${colors.cyan}USAGE:${colors.reset}
  node fetch-missions.js [OPTIONS]

${colors.cyan}OPTIONS:${colors.reset}
  -i, --input <file>     Input file with post IDs (default: postIds.txt)
  -o, --output <file>    Output JSON file (default: missions.json)
  -c, --cookies <str>    Reddit session cookies
  -d, --delay <ms>       Delay between requests in milliseconds (default: 1500)
  -h, --help             Show this help message

${colors.cyan}EXAMPLES:${colors.reset}
  node fetch-missions.js --input posts.txt --output results.json
  node fetch-missions.js --cookies "reddit_session=xxx; loid=yyy"
  node fetch-missions.js --delay 3000

${colors.cyan}ENVIRONMENT VARIABLES:${colors.reset}
  REDDIT_COOKIES         Reddit session cookies (alternative to --cookies)

For detailed documentation, see README.md
  `);
}

/**
 * Load environment variables from .env file
 */
async function loadEnv() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const envPath = path.join(__dirname, '.env');
    const envContent = await fs.readFile(envPath, 'utf-8');

    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  } catch (error) {
    // .env file not found or not readable - that's okay
  }
}

/**
 * Prompt user for input
 */
async function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Get Reddit cookies from args, env, or user prompt
 */
async function getCookies(options) {
  // 1. Try command-line argument
  if (options.cookies) {
    return options.cookies;
  }

  // 2. Try environment variable
  if (process.env.REDDIT_COOKIES) {
    return process.env.REDDIT_COOKIES;
  }

  // 3. Prompt user
  log('\n⚠️  No Reddit cookies provided!', 'yellow');
  log('You need to provide your Reddit session cookies to fetch mission data.\n', 'yellow');
  log('How to get cookies:', 'cyan');
  log('1. Open Reddit in your browser and log in');
  log('2. Open DevTools (F12) → Application/Storage → Cookies → reddit.com');
  log('3. Copy the cookie string (e.g., "reddit_session=xxx; loid=yyy")\n');

  const cookies = await prompt('Enter Reddit cookies: ');

  if (!cookies || cookies.trim() === '') {
    throw new Error('Reddit cookies are required to fetch mission data');
  }

  return cookies.trim();
}

/**
 * Normalize post ID to include t3_ prefix
 */
function normalizePostId(postId) {
  postId = postId.trim();
  if (!postId) return null;
  if (postId.startsWith('t3_')) return postId;
  return `t3_${postId}`;
}

/**
 * Read post IDs from input file
 */
async function readPostIds(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const postIds = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')) // Ignore empty lines and comments
      .map(normalizePostId)
      .filter(Boolean);

    if (postIds.length === 0) {
      throw new Error('No valid post IDs found in input file');
    }

    return postIds;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Input file not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Build protobuf request body with gRPC-web frame
 */
function buildRequestBody(postId) {
  // Create UIRequest
  const request = {
    props: { postId },
    state: {},
    events: [],
  };

  // Encode with protobuf
  const encoded = UIRequest.encode(request).finish();

  // Add gRPC-web frame header (5 bytes)
  // Byte 0: flags (0 = no compression)
  // Bytes 1-4: message length (big-endian 32-bit integer)
  const header = new Uint8Array(5);
  header[0] = 0; // flags
  const length = encoded.length;
  header[1] = (length >> 24) & 0xff;
  header[2] = (length >> 16) & 0xff;
  header[3] = (length >> 8) & 0xff;
  header[4] = length & 0xff;

  // Combine header and message
  const requestBody = new Uint8Array(5 + encoded.length);
  requestBody.set(header, 0);
  requestBody.set(encoded, 5);

  return requestBody;
}

/**
 * Parse protobuf response and extract mission data
 */
function parseResponse(arrayBuffer, postId) {
  try {
    // Remove gRPC-web frame header (5 bytes)
    let buffer = arrayBuffer;
    if (buffer.byteLength > 5) {
      buffer = buffer.slice(5);
    }

    // Decode protobuf response
    const uint8Array = new Uint8Array(buffer);
    const uiResponse = UIResponse.decode(uint8Array);
    const json = UIResponse.toJSON(uiResponse);

    // Extract mission data from state hooks
    const data = { postId };

    if (!json.state) {
      log(`  ⚠️  No state data in response for ${postId}`, 'yellow');
      return data;
    }

    // Iterate through state to find mission data
    for (const [key, value] of Object.entries(json.state)) {
      const stateValue = value.value;

      // Check for mission data
      if (stateValue?.mission) {
        const mission = stateValue.mission;

        // Extract mission fields
        if (mission.difficulty !== undefined) data.difficulty = Math.round(mission.difficulty);
        if (mission.minLevel !== undefined) data.minLevel = Math.round(mission.minLevel);
        if (mission.maxLevel !== undefined) data.maxLevel = Math.round(mission.maxLevel);
        if (mission.environment) data.environment = mission.environment;
        if (mission.foodName) data.foodName = mission.foodName;
        if (mission.foodImage) data.foodImage = mission.foodImage;
        if (mission.authorName) data.authorName = mission.authorName;
        if (mission.title) data.title = mission.title;
        if (mission.encounters) data.encounters = mission.encounters;
        if (mission.authorWeaponId) data.authorWeaponId = mission.authorWeaponId;
        if (mission.chef) data.chef = mission.chef;
        if (mission.cart) data.cart = mission.cart;
        if (mission.rarity) data.rarity = mission.rarity;
        if (mission.type) data.type = mission.type;
        if (mission.__cleared !== undefined) data.__cleared = mission.__cleared;
      }

      // Check for Inn post
      if (stateValue?.isInnPost !== undefined) {
        data.isInnPost = stateValue.isInnPost;
      }

      // Check for other relevant fields
      if (stateValue?.title && !data.title) {
        data.title = stateValue.title;
      }
    }

    return data;

  } catch (error) {
    throw new Error(`Failed to parse response: ${error.message}`);
  }
}

/**
 * Fetch mission data for a single post ID
 */
async function fetchMissionData(postId, cookies) {
  const requestBody = buildRequestBody(postId);

  const response = await fetch(CONFIG.DEVVIT_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'content-type': 'application/grpc-web+proto',
      'devvit-accept-language': 'en-GB',
      'devvit-accept-timezone': 'Europe/Copenhagen',
      'devvit-actor': 'main',
      'devvit-installation': CONFIG.DEVVIT_INSTALLATION_ID,
      'devvit-post': postId,
      'devvit-user-agent': 'Reddit;Shreddit;not-provided',
      'x-grpc-web': '1',
      'cookie': cookies,
      'referer': 'https://www.reddit.com/',
    },
    body: requestBody,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const missionData = parseResponse(arrayBuffer, postId);

  return missionData;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  // Show help if requested
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Load .env file
  await loadEnv();

  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║   Mission Data Fetcher - SwordAndSupper Reddit Bot       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝\n', 'cyan');

  try {
    // Import @devvit/protos dynamically
    log('📦 Loading protobuf library...', 'blue');
    const protos = await import('@devvit/protos/types/devvit/ui/block_kit/v1beta/ui.js');
    UIRequest = protos.UIRequest;
    UIResponse = protos.UIResponse;
    log('✓ Protobuf library loaded\n', 'green');

    // Get cookies
    log('🔑 Getting Reddit cookies...', 'blue');
    const cookies = await getCookies(options);
    log('✓ Cookies obtained\n', 'green');

    // Read post IDs
    log(`📄 Reading post IDs from: ${options.input}`, 'blue');
    const postIds = await readPostIds(options.input);
    log(`✓ Found ${postIds.length} post ID(s)\n`, 'green');

    // Fetch mission data for each post
    log('🚀 Fetching mission data...\n', 'blue');
    const missions = [];
    const errors = [];

    for (let i = 0; i < postIds.length; i++) {
      const postId = postIds[i];
      const num = `[${i + 1}/${postIds.length}]`;

      try {
        log(`${num} Fetching ${postId}...`, 'cyan');
        const missionData = await fetchMissionData(postId, cookies);

        // Check if we got meaningful data
        const hasData = Object.keys(missionData).length > 1; // More than just postId
        if (hasData) {
          missions.push(missionData);
          const preview = missionData.title || missionData.foodName || missionData.environment || 'mission';
          log(`${num} ✓ ${postId} - ${preview}`, 'green');
        } else {
          log(`${num} ⚠️  ${postId} - No mission data found (might be Inn post or invalid)`, 'yellow');
          missions.push(missionData); // Include it anyway
        }

        // Rate limiting - wait between requests
        if (i < postIds.length - 1) {
          await sleep(options.delay);
        }

      } catch (error) {
        log(`${num} ✗ ${postId} - Error: ${error.message}`, 'red');
        errors.push({ postId, error: error.message });

        // Continue with next post
        if (i < postIds.length - 1) {
          await sleep(options.delay);
        }
      }
    }

    // Save results
    log(`\n💾 Saving results to: ${options.output}`, 'blue');
    const outputDir = path.dirname(options.output);
    if (outputDir && outputDir !== '.') {
      await fs.mkdir(outputDir, { recursive: true });
    }
    await fs.writeFile(options.output, JSON.stringify(missions, null, 2), 'utf-8');
    log(`✓ Saved ${missions.length} mission(s)\n`, 'green');

    // Summary
    log('═══════════════════════════════════════════════════════', 'cyan');
    log(`✓ Successfully fetched: ${missions.length}`, 'green');
    if (errors.length > 0) {
      log(`✗ Failed: ${errors.length}`, 'red');
      log('\nFailed post IDs:', 'yellow');
      errors.forEach(({ postId, error }) => {
        log(`  - ${postId}: ${error}`, 'red');
      });
    }
    log('═══════════════════════════════════════════════════════\n', 'cyan');

    process.exit(errors.length > 0 ? 1 : 0);

  } catch (error) {
    log(`\n✗ Fatal error: ${error.message}\n`, 'red');

    if (error.message.includes('Cannot find package')) {
      log('💡 Make sure to run: npm install', 'yellow');
    } else if (error.message.includes('cookies')) {
      log('💡 Provide cookies via --cookies, .env file, or REDDIT_COOKIES environment variable', 'yellow');
    }

    process.exit(1);
  }
}

// Run main function
main();

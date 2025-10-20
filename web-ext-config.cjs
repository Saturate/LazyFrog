/**
 * web-ext configuration
 * Official Mozilla tool that works for Firefox, Chrome, and other browsers
 * https://extensionworkshop.com/documentation/develop/web-ext-command-reference/
 */

module.exports = {
  // Use the dist directory as source
  sourceDir: './dist',

  // Ignore files when building
  ignoreFiles: [
    '*.map',
    '*.md',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'node_modules',
  ],

  // Artifact configuration (for build command)
  artifactsDir: './artifacts',

  // Build configuration
  build: {
    overwriteDest: true,
  },

  // Run configuration (for testing)
  run: {
    // Start URL when testing
    startUrl: ['https://www.reddit.com/r/SwordAndSupperGame/'],
  },
};

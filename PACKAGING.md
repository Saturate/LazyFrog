# Packaging Guide for AutoSupper

This guide explains how to build and package the AutoSupper extension for distribution.

## Quick Start

### Build All Packages
```bash
npm run package
```

This creates:
- `artifacts/autosupper-firefox-v0.8.1.zip` - Firefox add-on
- `artifacts/autosupper-chrome-v0.8.1.crx` - Chrome extension
- `artifacts/autosupper-source-v0.8.1.zip` - Source code

## Development & Testing

### Test in Firefox
```bash
npm run start:firefox
```
Opens Firefox with the extension loaded and navigates to r/SwordAndSupperGame.

### Test in Chrome
```bash
npm run start:chrome
```
Opens Chrome with the extension loaded and navigates to r/SwordAndSupperGame.

### Lint Extension
```bash
npm run lint:firefox
```
Checks for common extension issues using web-ext.

## Individual Package Commands

### Firefox Only
```bash
npm run package:firefox
```

### Chrome Only
```bash
npm run package:chrome
```

### Source ZIP Only
```bash
npm run package:zip
```

## Firefox Add-on Signing

To distribute your Firefox add-on outside of AMO (addons.mozilla.org), you need to sign it.

### Prerequisites

1. Get API credentials from [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/):
   - Go to Tools → Manage API Keys
   - Generate API Credentials
   - You'll get: `API Key (JWT issuer)` and `API Secret`

2. Set environment variables:
```bash
export WEB_EXT_API_KEY="your-api-key-here"
export WEB_EXT_API_SECRET="your-api-secret-here"
```

### Sign the Extension
```bash
npm run package:firefox:sign
```

This will:
- Upload your extension to Mozilla for signing
- Download the signed XPI file to `artifacts/`
- The signed extension can be distributed outside of AMO

**Note**: The signing process requires:
- Valid API credentials
- The extension to pass Mozilla's automated review
- Channel set to "unlisted" (not publicly listed on AMO)

### Important Files

- **`autosupper-extension.pem`** - Chrome private key (DO NOT COMMIT)
  - Required to create updates with the same extension ID
  - Keep this file secure and backed up
  - Already added to `.gitignore`

- **`web-ext-config.cjs`** - web-ext configuration
  - Source directory: `./dist`
  - Artifacts directory: `./artifacts`
  - Start URL for testing

## Distribution

### For Testers (Development)
1. **Firefox**: Share `autosupper-firefox-v*.zip`
   - Testers drag-and-drop to `about:debugging#/runtime/this-firefox`
   - Or use "Load Temporary Add-on"

2. **Chrome**: Share `autosupper-chrome-v*.crx`
   - Testers drag-and-drop to `chrome://extensions/`
   - Enable "Developer mode" first

### For Production
1. **Firefox Add-ons (AMO)**:
   - Submit `autosupper-firefox-v*.zip` at https://addons.mozilla.org/developers/
   - Include `autosupper-source-v*.zip` for review

2. **Chrome Web Store**:
   - Submit `autosupper-source-v*.zip` at https://chrome.google.com/webstore/devconsole/
   - Upload the CRX is handled automatically

## Troubleshooting

### "Extension could not be loaded" in Firefox
- Run `npm run lint:firefox` to check for issues
- Check `manifest.json` syntax

### Chrome Extension ID Changes
- Make sure you have the `autosupper-extension.pem` file
- Don't delete or regenerate this file

### Signing Fails
- Verify API credentials are correct
- Check that version in `package.json` hasn't been used before
- Ensure extension passes `npm run lint:firefox`

## Version Management

Update version in `package.json`:
```json
{
  "version": "0.8.2"
}
```

All package commands automatically use this version number in filenames.

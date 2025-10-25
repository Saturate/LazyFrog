#!/bin/bash
# Build CRX package for LazyFrog extension

set -e

echo "Building LazyFrog CRX package..."

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Build the extension first
echo "Building extension..."
npm run build

# Chrome/Chromium executable path (macOS)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Check if Chrome exists
if [ ! -f "$CHROME" ]; then
  echo "Error: Chrome not found at $CHROME"
  exit 1
fi

# Extension directory
EXT_DIR="./dist"

# Create artifacts directory
mkdir -p artifacts

# Output files
CRX_FILE="artifacts/lazyfrog-chrome-v${VERSION}.crx"
PEM_FILE="lazyfrog-extension.pem"

echo "Packing extension..."

# Pack the extension
# If .pem exists, use it; otherwise Chrome will create one
if [ -f "$PEM_FILE" ]; then
  "$CHROME" --pack-extension="$EXT_DIR" --pack-extension-key="$PEM_FILE" 2>/dev/null || true
else
  "$CHROME" --pack-extension="$EXT_DIR" 2>/dev/null || true
  echo ""
  echo "Note: A new private key has been generated: $PEM_FILE"
  echo "Keep this file safe! You'll need it to update the extension."
fi

# Chrome creates the CRX in the parent directory with .crx extension
if [ -f "dist.crx" ]; then
  mv dist.crx "$CRX_FILE"
  echo ""
  echo "✅ CRX package created: $CRX_FILE"

  # Show file size
  echo ""
  echo "Package size:"
  ls -lh "$CRX_FILE" | awk '{print $9, $5}'
else
  echo "❌ Failed to create CRX package"
  exit 1
fi

# Move the .pem if it was created in dist directory
if [ -f "dist.pem" ] && [ ! -f "$PEM_FILE" ]; then
  mv dist.pem "$PEM_FILE"
  echo ""
  echo "⚠️  Private key saved to: $PEM_FILE"
  echo "   Keep this file secure and don't commit it to git!"
fi

echo ""
echo "Installation instructions:"
echo "1. For development: Go to chrome://extensions/, enable Developer mode, and drag the CRX file"
echo "2. For distribution: Users must download and drag to chrome://extensions/ (Chrome will show a warning)"
echo "3. For production: Publish to Chrome Web Store"

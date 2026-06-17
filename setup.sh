#!/usr/bin/env bash
# LeetNote Setup & Scaffolding Script
set -e

echo "========================================="
echo "   LeetNote Firefox Extension Setup      "
echo "========================================="

# 1. Environment Checks
echo "Checking dependencies..."
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed. Please install Node.js."
  exit 1
fi
echo "✓ Node.js: $(node --version)"

if ! command -v npm &> /dev/null; then
  echo "❌ Error: npm is not installed. Please install npm."
  exit 1
fi
echo "✓ npm: $(npm --version)"

# 2. Package Installation
echo "Installing dependencies..."
npm install

# 3. Icon Asset Processing
echo "Generating extension icons..."
mkdir -p src/assets

ICON_SOURCE="/home/akshit/.gemini/antigravity/brain/51313661-af66-4c65-8ad4-3e62da894bfc/leetnote_icon_large_1781602381025.png"

if [ -f "$ICON_SOURCE" ]; then
  echo "Found high-quality generated icon at $ICON_SOURCE"
  if command -v convert &> /dev/null; then
    echo "Resizing icons..."
    convert "$ICON_SOURCE" -resize 48x48 src/assets/icon-48.png
    convert "$ICON_SOURCE" -resize 96x96 src/assets/icon-96.png
    convert "$ICON_SOURCE" -resize 128x128 src/assets/icon-128.png
    echo "✓ Icons generated successfully!"
  elif command -v magick &> /dev/null; then
    echo "Resizing icons..."
    magick "$ICON_SOURCE" -resize 48x48 src/assets/icon-48.png
    magick "$ICON_SOURCE" -resize 96x96 src/assets/icon-96.png
    magick "$ICON_SOURCE" -resize 128x128 src/assets/icon-128.png
    echo "✓ Icons generated successfully!"
  else
    echo "⚠️ ImageMagick ('convert' or 'magick') not found. Copying source icon directly."
    cp "$ICON_SOURCE" src/assets/icon-48.png
    cp "$ICON_SOURCE" src/assets/icon-96.png
    cp "$ICON_SOURCE" src/assets/icon-128.png
  fi
else
  echo "⚠️ High-quality generated icon not found at $ICON_SOURCE."
  echo "Generating standard placeholders..."
  # Create a simple SVG or text placeholder for development
  echo "Creating mock icon files..."
  touch src/assets/icon-48.png
  touch src/assets/icon-96.png
  touch src/assets/icon-128.png
fi

# 4. Verify Build
echo "Testing build pipeline..."
npm run build

echo "========================================="
echo "✅ LeetNote scaffolded and built successfully!"
echo "========================================="
echo "To load in Firefox:"
echo "1. Open Firefox and navigate to about:debugging"
echo "2. Click 'This Firefox'"
echo "3. Click 'Load Temporary Add-on...'"
echo "4. Select the 'manifest.json' file in the 'dist' directory."
echo ""
echo "To develop with hot-reloading/re-compilation:"
echo "   npm run dev"
echo "========================================="

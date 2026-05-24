#!/bin/bash
# Build and deploy to GitHub Pages (lizh-debug/med-learn-mobile)
set -e

REPO="git@github.com:lizh-debug/med-learn-mobile.git"

echo "=== 1. Building Expo web app ==="
npx expo export --platform web

echo ""
echo "=== 2. Fixing paths for GitHub Pages subdirectory ==="
# Replace absolute paths with relative paths so assets load from /med-learn-mobile/ subdir
sed -i 's|href="/favicon.ico"|href="./favicon.ico"|g' dist/index.html
sed -i 's|src="/_expo/|src="./_expo/|g' dist/index.html

echo "=== 3. Creating 404.html for SPA routing ==="
cp dist/index.html dist/404.html

echo "=== 4. Deploying to gh-pages branch ==="
# Create a temp dir for gh-pages
TMP=$(mktemp -d)
cp -r dist/* "$TMP/"
cd "$TMP"

git init
git checkout -b gh-pages
git add -A
git commit -m "Deploy to GitHub Pages"

# Force push to gh-pages branch
git push -f "$REPO" gh-pages:gh-pages

cd -
rm -rf "$TMP"

echo ""
echo "=== Done! ==="
echo "URL: https://lizh-debug.github.io/med-learn-mobile/"

#!/bin/bash
# Build and deploy to GitHub Pages (lizh-debug/med-learn-mobile)
set -e

REPO="git@github.com:lizh-debug/med-learn-mobile.git"

echo "=== 1. Building Expo web app ==="
npx expo export --platform web

echo ""
echo "=== 2. Fixing paths for GitHub Pages subdirectory ==="
# The index.html already has /med-learn-mobile/ base path from Expo config
# Just ensure the paths are correct
sed -i 's|src="/med-learn-mobile/_expo/|src="/med-learn-mobile/_expo/|g' dist/index.html

echo "=== 3. Creating 404.html + .nojekyll ==="
cp dist/index.html dist/404.html
touch dist/.nojekyll

echo "=== 4. Deploying to gh-pages branch ==="
# Create a temp dir for gh-pages
TMP=$(mktemp -d)
cp -r dist/* "$TMP/"
# Bash * glob doesn't match dotfiles — copy .nojekyll explicitly
cp dist/.nojekyll "$TMP/" 2>/dev/null || true
cd "$TMP"

git init
git config user.name "lizh-debug"
git config user.email "lizh-debug@users.noreply.github.com"
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

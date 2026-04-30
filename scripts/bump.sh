#!/usr/bin/env bash
# bump.sh — Version bump for Finanza monorepo
# Usage: ./scripts/bump.sh [patch|minor|major] [--notes "Release notes"]
# Replaces broken standard-version with a proper monorepo-aware bumper
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# --- Parse args ---
BUMP_TYPE="${1:-patch}"
NOTES="${2:-}"

if [[ "$BUMP_TYPE" != patch && "$BUMP_TYPE" != minor && "$BUMP_TYPE" != major ]]; then
  echo "Usage: $0 [patch|minor|major] [--notes \"Release notes\"]"
  exit 1
fi

# --- Current version ---
CURRENT=$(node -e "console.log(require('./package.json').version)")
echo "Current version: $CURRENT"

# --- Calculate new version ---
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
case "$BUMP_TYPE" in
  patch)  ((PATCH++)) ;;
  minor)  ((MINOR++)); PATCH=0 ;;
  major)  ((MAJOR++)); MINOR=0; PATCH=0 ;;
esac
NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "New version: $NEW_VERSION"

# --- Bump all package.json files ---
for PKG in package.json backend/package.json frontend/package.json mobile/package.json; do
  if [[ -f "$PKG" ]]; then
    node -e "
      const fs = require('fs');
      const p = '$PKG';
      const d = JSON.parse(fs.readFileSync(p, 'utf8'));
      d.version = '$NEW_VERSION';
      fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
      console.log('  ✓ ' + p + ' → $NEW_VERSION');
    "
  fi
done

# --- Bump app.json (Expo) ---
if [[ -f mobile/app.json ]]; then
  node -e "
    const fs = require('fs');
    const d = JSON.parse(fs.readFileSync('mobile/app.json', 'utf8'));
    d.expo.version = '$NEW_VERSION';
    if (d.expo.android && d.expo.android.versionCode !== undefined) {
      d.expo.android.versionCode += 1;
      console.log('  ✓ mobile/app.json → $NEW_VERSION (versionCode: ' + d.expo.android.versionCode + ')');
    }
    fs.writeFileSync('mobile/app.json', JSON.stringify(d, null, 2) + '\n');
  "
fi

# --- Bump version-meta.json ---
META_FILE="backend/src/version-meta.json"
if [[ -f "$META_FILE" ]]; then
  node -e "
    const fs = require('fs');
    const d = JSON.parse(fs.readFileSync('$META_FILE', 'utf8'));
    d.version = '$NEW_VERSION';
    if ('$NOTES') {
      d.releaseNotes = '$NOTES'.replace(/\\\\n/g, '\\n');
    } else {
      // Auto-generate from recent conventional commits
      d.releaseNotes = 'Versão $NEW_VERSION';
    }
    fs.writeFileSync('$META_FILE', JSON.stringify(d, null, 2) + '\n');
    console.log('  ✓ $META_FILE → $NEW_VERSION');
  "
fi

# --- Update versionCode in build.gradle (for local builds) ---
GRADLE_FILE="mobile/android/app/build.gradle"
if [[ -f "$GRADLE_FILE" ]]; then
  node -e "
    const fs = require('fs');
    let content = fs.readFileSync('$GRADLE_FILE', 'utf8');
    // Read current versionCode from app.json
    const appJson = JSON.parse(fs.readFileSync('mobile/app.json', 'utf8'));
    const vc = appJson.expo.android.versionCode;
    content = content.replace(/versionCode\s+\d+/, 'versionCode ' + vc);
    fs.writeFileSync('$GRADLE_FILE', content);
    console.log('  ✓ build.gradle versionCode → ' + vc);
  "
fi

# --- Generate CHANGELOG entry ---
CHANGELOG_FILE="CHANGELOG.md"
COMMITS=$(git log "v${CURRENT}..HEAD" --oneline 2>/dev/null || git log -20 --oneline)

node -e "
  const fs = require('fs');
  const commits = \`$COMMITS\`.trim().split('\n');
  
  // Categorize by conventional commit type
  const categories = {
    'feat': { emoji: '✨', title: 'Features', items: [] },
    'fix': { emoji: '🐛', title: 'Bug Fixes', items: [] },
    'perf': { emoji: '⚡', title: 'Performance', items: [] },
    'refactor': { emoji: '♻️', title: 'Refactoring', items: [] },
    'docs': { emoji: '📝', title: 'Documentation', items: [] },
    'test': { emoji: '✅', title: 'Tests', items: [] },
    'build': { emoji: '📦', title: 'Build', items: [] },
    'ci': { emoji: '🔧', title: 'CI/CD', items: [] },
    'chore': { emoji: '🧹', title: 'Chores', items: [] },
  };
  const other = [];
  
  commits.forEach(line => {
    const match = line.match(/^[a-f0-9]+\s+(feat|fix|perf|refactor|docs|test|build|ci|chore)(\(.+?\))?:\s+(.+)/i);
    if (match) {
      const type = match[1].toLowerCase();
      const scope = match[2] || '';
      const desc = match[3];
      if (categories[type]) {
        categories[type].items.push(scope ? scope + ' ' + desc : desc);
      } else {
        other.push(line);
      }
    } else if (line.trim()) {
      other.push(line);
    }
  });
  
  let entry = '## [$NEW_VERSION](https://github.com/SelmoCastro/financa_new/compare/v${CURRENT}...v${NEW_VERSION}) ($(date +%Y-%m-%d))\n\n';
  
  Object.values(categories).forEach(cat => {
    if (cat.items.length > 0) {
      entry += '### ' + cat.emoji + ' ' + cat.title + '\n\n';
      cat.items.forEach(item => {
        entry += '* ' + item + '\n';
      });
      entry += '\n';
    }
  });
  
  if (other.length > 0) {
    entry += '### Other Changes\n\n';
    other.forEach(item => { entry += '* ' + item + '\n'; });
    entry += '\n';
  }
  
  // Prepend to existing changelog
  let existing = '';
  if (fs.existsSync('$CHANGELOG_FILE')) {
    existing = fs.readFileSync('$CHANGELOG_FILE', 'utf8');
  }
  const header = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  const body = existing.replace(/^# Changelog.*?\n\n/s, '');
  fs.writeFileSync('$CHANGELOG_FILE', header + entry + body);
  console.log('  ✓ CHANGELOG.md updated');
"

echo ""
echo "========================================="
echo "  Version bumped: $CURRENT → $NEW_VERSION"
echo "  Bump type: $BUMP_TYPE"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit:         git add -A && git commit -m 'chore: release v$NEW_VERSION'"
echo "  3. Tag:            git tag v$NEW_VERSION"
echo "  4. Push:           git push origin master --tags"
echo "  5. Deploy:         ./scripts/deploy.sh"
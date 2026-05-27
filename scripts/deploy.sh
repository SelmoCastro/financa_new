#!/usr/bin/env bash
# deploy.sh — Full deploy pipeline for Finanza
# Usage: ./scripts/deploy.sh [--backend-only] [--apk-only] [--skip-build]
# Deploys: backend to VPS + builds/uploads APK
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VPS="root@2.24.211.92"
VPS_BACKEND="/opt/finanza/backend"
BACKEND_DIR="$ROOT_DIR/backend"
MOBILE_DIR="$ROOT_DIR/mobile"
VPS_APK_DIR="/var/www/finanzaai.tech/downloads"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Parse args ---
BACKEND_ONLY=false
APK_ONLY=false
SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --backend-only) BACKEND_ONLY=true ;;
    --apk-only)     APK_ONLY=true ;;
    --skip-build)   SKIP_BUILD=true ;;
  esac
done

# --- Get version ---
VERSION=$(node -e "console.log(require('./package.json').version)")
log "Deploying Finanza v$VERSION"

# --- Pre-flight checks ---
if ! git diff --quiet 2>/dev/null; then
  err "Uncommitted changes detected! Commit or stash first."
  git status --short
  exit 1
fi

if [[ "$BACKEND_ONLY" == false && "$APK_ONLY" == false ]]; then
  # Full deploy — ensure version tag exists
  if ! git tag -l "v$VERSION" | grep -q "v$VERSION"; then
    warn "Tag v$VERSION not found. Creating..."
    git tag "v$VERSION"
  fi
fi

# =============================================
# BACKEND DEPLOY
# =============================================
if [[ "$APK_ONLY" == false ]]; then
  log "=== BACKEND DEPLOY ==="

  # 0. Backup .env BEFORE any VPS operation (protect secrets from accidental loss)
  log "Backing up VPS .env..."
  ssh "$VPS" "cp -p $VPS_BACKEND/.env $VPS_BACKEND/.env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null && echo 'Backup OK' || echo 'No .env to backup'"

  # 1. Push to GitHub (triggers VPS pull)
  log "Pushing to GitHub..."
  git push origin master --tags 2>&1 || true

  # 2. Pull on VPS
  log "Pulling on VPS..."
  ssh "$VPS" "cd $VPS_BACKEND && git pull origin master 2>&1"

  # 2.5 Validate .env survived the deploy (critical vars must exist)
  log "Validating .env critical variables..."
  ssh "$VPS" "
    MISSING=''
    for VAR in DATABASE_URL JWT_SECRET ENCRYPTION_KEY RESEND_API_KEY EMAIL_FROM FRONTEND_URL; do
      if ! grep -q \"^\${VAR}=\" $VPS_BACKEND/.env 2>/dev/null; then
        MISSING=\"\$MISSING \$VAR\"
      fi
    done
    if [ -n \"\$MISSING\" ]; then
      echo 'ERROR: Missing critical env vars:' \$MISSING
      # Restore from latest backup
      LATEST=\$(ls -t $VPS_BACKEND/.env.backup.* 2>/dev/null | head -1)
      if [ -n \"\$LATEST\" ]; then
        echo 'Restoring from backup:' \$LATEST
        cp \$LATEST $VPS_BACKEND/.env
        echo '.env restored from backup'
      else
        echo 'NO BACKUP FOUND! Abort deploy manually.'
        exit 1
      fi
    else
      echo 'All critical vars present'
    fi
  "

  # 3. Install deps & build
  if [[ "$SKIP_BUILD" == false ]]; then
    log "Installing dependencies on VPS..."
    ssh "$VPS" "cd $VPS_BACKEND && npm install --production=false 2>&1 | tail -3"

    log "Building on VPS..."
    ssh "$VPS" "cd $VPS_BACKEND && npm run build 2>&1 | tail -5"

    # 4. Verify build succeeded
    BUILD_EXIT=$?
    if [[ $BUILD_EXIT -ne 0 ]]; then
      err "Build failed on VPS! Aborting."
      ssh "$VPS" "cd $VPS_BACKEND && npm run build 2>&1 | tail -20"
      exit 1
    fi
  fi

  # 5. Restart PM2 with correct entry point (--update-env recarrega variáveis do .env)
  log "Restarting finanza-api..."
  ssh "$VPS" "
    cd $VPS_BACKEND && \\
    pm2 restart finanza-api --update-env 2>/dev/null || \\
    (pm2 delete finanza-api 2>/dev/null; pm2 start dist/main.js --name finanza-api && pm2 save)
  " 2>&1 | tail -5

  # 6. Health check
  log "Health check..."
  sleep 3
  HTTP_CODE=$(ssh "$VPS" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/v1/app/version")
  if [[ "$HTTP_CODE" == "200" ]]; then
    log "Backend is UP (HTTP $HTTP_CODE) — version endpoint OK"
  else
    err "Backend returned HTTP $HTTP_CODE!"
    ssh "$VPS" "pm2 logs finanza-api --lines 20 --nostream" 2>&1
    exit 1
  fi

  log "=== BACKEND DEPLOY COMPLETE ==="
fi

# =============================================
# FRONTEND DEPLOY (web)
# =============================================
if [[ "$APK_ONLY" == false ]]; then
  log "=== FRONTEND DEPLOY ==="

  # 1. Build frontend locally
  if [[ "$SKIP_BUILD" == false ]]; then
    log "Building frontend..."
    cd "$BACKEND_DIR/../frontend"
    npm run build 2>&1 | tail -5
    cd "$ROOT_DIR"
  fi

  # 2. Upload via tar (faster than scp -r for many small files)
  log "Uploading frontend to VPS..."
  tar czf /tmp/finanza-frontend.tar.gz -C frontend dist/
  scp /tmp/finanza-frontend.tar.gz "$VPS:/tmp/" 2>&1
  rm -f /tmp/finanza-frontend.tar.gz

  # 3. Extract on VPS
  ssh "$VPS" "rm -rf /opt/finanza/frontend/dist && tar xzf /tmp/finanza-frontend.tar.gz -C /opt/finanza/frontend/ && rm /tmp/finanza-frontend.tar.gz" 2>&1

  log "=== FRONTEND DEPLOY COMPLETE ==="
fi

# =============================================
# APK DEPLOY
# =============================================
if [[ "$BACKEND_ONLY" == false ]]; then
  log "=== APK DEPLOY ==="

  # 1. Build APK locally on SSD
  log "Building APK on SSD (this takes ~5 min)..."
  if [[ "$SKIP_BUILD" == false ]]; then
    cd "$MOBILE_DIR"

    # Ensure working dir is on SSD for build
    BUILD_DIR="/home/selmo/finanza-build"
    rm -rf "$BUILD_DIR" 2>/dev/null || true
    mkdir -p "$BUILD_DIR"
    
    # Copy mobile dir to SSD for faster build
    log "Copying mobile to SSD build dir..."
    rsync -a --exclude='node_modules' --exclude='.expo' --exclude='android' "$MOBILE_DIR/" "$BUILD_DIR/" 2>&1 | tail -1
    
    cd "$BUILD_DIR"

    # Ensure Android SDK is found (needed by both prebuild and Gradle)
    export ANDROID_HOME=/home/selmo/Android/Sdk

    log "Installing mobile deps on SSD..."
    npm install 2>&1 | tail -3

    log "Running expo prebuild..."
    npx expo prebuild --clean 2>&1 | tail -3

    log "Building Android APK (release)..."
    cd android
    
    # OOM-safe Gradle flags
    export GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=512m"
    ./gradlew assembleRelease -Parallel=false --no-daemon 2>&1 | tail -10

    APK_PATH="$BUILD_DIR/android/app/build/outputs/apk/release/app-release.apk"
    if [[ ! -f "$APK_PATH" ]]; then
      err "APK not found at $APK_PATH"
      exit 1
    fi

    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    log "APK built successfully ($APK_SIZE)"
  else
    # Find existing APK
    APK_PATH=$(find "$MOBILE_DIR/android/app/build/outputs/apk" -name "*.apk" -type f 2>/dev/null | head -1)
    if [[ -z "$APK_PATH" ]]; then
      # Try SSD build dir
      APK_PATH="/home/selmo/finanza-build/android/app/build/outputs/apk/release/app-release.apk"
    fi
    if [[ ! -f "$APK_PATH" ]]; then
      err "No APK found. Run without --skip-build first."
      exit 1
    fi
    log "Using existing APK: $APK_PATH"
  fi

  # 2. Upload to VPS
  DEST_NAME="Financa_new_v${VERSION}.apk"
  log "Uploading APK to VPS..."
  scp "$APK_PATH" "$VPS:/tmp/finanza-${VERSION}.apk" 2>&1

  # 3. Move to downloads dir and create symlink
  log "Installing APK on VPS..."
  ssh "$VPS" "
    cp /tmp/finanza-${VERSION}.apk $VPS_APK_DIR/$DEST_NAME && \
    ln -sf $VPS_APK_DIR/$DEST_NAME $VPS_APK_DIR/Financa_new.apk && \
    rm /tmp/finanza-${VERSION}.apk && \
    echo 'APK deployed: $VPS_APK_DIR/$DEST_NAME'
  " 2>&1

  # 4. Verify download URL
  sleep 1
  APK_HTTP=$(curl -s -o /dev/null -w '%{http_code}' "https://finanzaai.tech/downloads/$DEST_NAME")
  if [[ "$APK_HTTP" == "200" ]]; then
    log "APK download URL OK (HTTP $APK_HTTP)"
  else
    warn "APK download returned HTTP $APK_HTTP — check nginx config"
  fi

  log "=== APK DEPLOY COMPLETE ==="
fi

# =============================================
# SUMMARY
# =============================================
echo ""
echo "========================================="
echo "  🚀 Finanza v$VERSION Deployed!"
echo "========================================="
if [[ "$APK_ONLY" == false ]]; then
  echo "  Backend: https://finanzaai.tech/api/v1"
  echo "  Frontend: https://finanzaai.tech"
  echo "  Version: https://finanzaai.tech/api/v1/app/version"
fi
if [[ "$BACKEND_ONLY" == false ]]; then
  echo "  APK:     https://finanzaai.tech/downloads/Financa_new_v${VERSION}.apk"
fi
echo "  GitHub:  https://github.com/SelmoCastro/financa_new/releases/tag/v${VERSION}"
echo "========================================="
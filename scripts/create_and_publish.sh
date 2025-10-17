#!/bin/bash
set -e

WORKDIR="$1"
APP_NAME="$2"
GITHUB_USER="${GITHUB_USER:-YOUR_GITHUB_USERNAME}"
GITHUB_TOKEN="${GITHUB_TOKEN:-YOUR_GITHUB_TOKEN}"

if [ -z "$WORKDIR" ] || [ -z "$APP_NAME" ]; then
  echo "Usage: create_and_publish.sh <workdir> <app_name>"
  exit 1
fi

echo "[deploy] Starting deployment for $APP_NAME"
cd "$WORKDIR"

# ------------------ Initialize Git ------------------
if [ ! -d .git ]; then
  echo "[deploy] Initializing new git repo"
  git init
  git branch -M main
fi

git remote remove origin 2>/dev/null || true

# ------------------ Add remote ------------------
REMOTE_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${APP_NAME}.git"
git remote add origin "$REMOTE_URL" 2>/dev/null || true

# ------------------ Create repo if missing ------------------
# Use GitHub API to check/create repo
REPO_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/${GITHUB_USER}/${APP_NAME})

if [ "$REPO_CHECK" -eq 404 ]; then
  echo "[deploy] Repository $APP_NAME does not exist. Creating..."
  curl -H "Authorization: token $GITHUB_TOKEN" \
       -d "{\"name\":\"$APP_NAME\", \"private\":false}" \
       https://api.github.com/user/repos
fi

# ------------------ Commit and push main ------------------
git add .
git commit -m "Auto-generated deploy for $APP_NAME" || true
git push -u origin main --force

# ------------------ Deploy gh-pages ------------------
git checkout --orphan gh-pages
git reset --hard
git merge main --allow-unrelated-histories -m "Merge main into gh-pages"
git push origin gh-pages --force
git checkout main

# ------------------ Save deploy URL ------------------
DEPLOY_URL="https://${GITHUB_USER}.github.io/$APP_NAME/"
echo "$DEPLOY_URL" > "./deploy_url.txt"
echo "[deploy] ✅ App $APP_NAME deployed to $DEPLOY_URL"
echo "[deploy] Deployment URL saved to $WORKDIR/deploy_url.txt"
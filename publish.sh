#!/usr/bin/env bash
set -euo pipefail

# Bump version in package.json (and docs/README.md badge),
# optionally commit, push, and create a GitHub release that triggers
# the publish workflow.
# Usage: ./publish.sh

# ─── Validate ───

if [[ ! -f package.json ]]; then
    echo "Error: package.json not found (run from repo root)"
    exit 1
fi

# ─── Parse current version ───

CURRENT=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' package.json | head -1)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# ─── Prompt ───

echo "Current version: ${CURRENT}"
echo ""
echo "  0) skip    → ${CURRENT}"
echo "  1) patch   → ${MAJOR}.${MINOR}.$((PATCH + 1))"
echo "  2) minor   → ${MAJOR}.$((MINOR + 1)).0"
echo "  3) major   → $((MAJOR + 1)).0.0"
echo ""
read -rp "Select bump type [0-3]: " choice

case "${choice:-0}" in
    0) ;;
    1) PATCH=$((PATCH + 1)) ;;
    2) MINOR=$((MINOR + 1)); PATCH=0 ;;
    3) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    *) echo "Error: invalid choice"; exit 1 ;;
esac

VERSION="${MAJOR}.${MINOR}.${PATCH}"

# ─── Apply bump ───

if [[ "$VERSION" != "$CURRENT" ]]; then
    sed -i.bak "s/\"version\": \"${CURRENT}\"/\"version\": \"${VERSION}\"/" package.json
    rm -f package.json.bak

    if [[ -f docs/README.md ]]; then
        sed -i.bak "s|/version-${CURRENT}-42b883|/version-${VERSION}-42b883|" docs/README.md
        rm -f docs/README.md.bak
    fi

    echo ""
    echo "==> ${CURRENT} → ${VERSION}"
fi

# ─── Action ───

BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo ""
echo "  0) skip"
echo "  1) push     → commit (if changes) and push to origin/${BRANCH}"
echo "  2) release  → push and create GitHub release ${VERSION} (triggers publish)"
echo ""
read -rp "Select action [0-2]: " action

action="${action:-0}"

if [[ "$action" == "0" ]]; then
    exit 0
fi

# Stage only the version files
git add package.json
[[ -f docs/README.md ]] && git add docs/README.md

if ! git diff --cached --quiet; then
    git commit -m "chore: bump version to ${VERSION}"
fi

git push origin "$BRANCH"
echo ""
echo "==> Pushed ${BRANCH}"

if [[ "$action" == "2" ]]; then
    if [[ "$BRANCH" != "main" ]]; then
        echo ""
        echo "Warning: releases must be created from main (current: ${BRANCH})"
        read -rp "Merge ${BRANCH} into main and continue? [y/N]: " confirm
        [[ "${confirm,,}" == "y" ]] || exit 1

        SOURCE="$BRANCH"
        git checkout main
        git pull --ff-only origin main
        git merge --no-ff "$SOURCE" -m "Merge branch '${SOURCE}'"
        git push origin main
        BRANCH="main"

        echo ""
        echo "==> Merged ${SOURCE} into main"
    fi

    gh release create "$VERSION" --title "$VERSION" --generate-notes --target "$BRANCH"
    echo ""
    echo "==> Created release ${VERSION} (publish workflow triggered)"
fi

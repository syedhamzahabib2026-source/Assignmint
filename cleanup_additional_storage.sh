#!/bin/bash

# Additional storage cleanup - IDE/App caches
# SAFE TO DELETE - Current project Assignmint3 is NOT affected

set -e  # Exit on error

echo "=========================================="
echo "Additional Storage Cleanup Script"
echo "=========================================="
echo ""
echo "This will delete additional caches:"
echo "  - VS Code extension caches (~820MB)"
echo "  - Cursor extension caches (~300MB)"
echo "  - Telegram cache (~401MB)"
echo "  - App updater caches (~1.9GB+)"
echo ""
echo "Total: ~3GB+"
echo ""
echo "⚠️  Your current project (/Users/hamza/Assignmint3) will NOT be touched!"
echo "⚠️  Your browser bookmarks/passwords will NOT be affected!"
echo "⚠️  Your VS Code/Cursor settings will NOT be deleted!"
echo ""

read -p "Continue with additional cleanup? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo "=========================================="
echo ""

# Function to safely delete with verification
safe_delete() {
    local path="$1"
    local name="$2"
    
    if [ ! -d "$path" ] && [ ! -f "$path" ]; then
        echo "⚠️  Skipping: $name (not found)"
        return
    fi
    
    size=$(du -sh "$path" 2>/dev/null | cut -f1)
    echo "Deleting: $name ($size)"
    rm -rf "$path" 2>/dev/null || {
        echo "  ❌ Failed to delete (may need permission)"
        return 1
    }
    echo "  ✓ Deleted"
    echo ""
}

# IDE/Editor caches (safe - only extension caches, not settings)
echo "1. IDE/Editor Extension Caches:"
safe_delete "$HOME/Library/Application Support/Code/CachedExtensionVSIXs" "VS Code Extension Cache"
safe_delete "$HOME/Library/Application Support/Code/CachedData" "VS Code Cached Data"
safe_delete "$HOME/Library/Application Support/Code/Cache" "VS Code Cache"
safe_delete "$HOME/Library/Application Support/Cursor/CachedExtensionVSIXs" "Cursor Extension Cache"
safe_delete "$HOME/Library/Application Support/Cursor/CachedData" "Cursor Cached Data"
safe_delete "$HOME/Library/Application Support/Cursor/Cache" "Cursor Cache"

# App caches
echo "2. App Caches:"
safe_delete "$HOME/Library/Caches/ru.keepcoder.Telegram" "Telegram Cache"
safe_delete "$HOME/Library/Caches/com.todesktop.230313mzl4w4u92.ShipIt" "ToDesktop/ShipIt Cache"
safe_delete "$HOME/Library/Caches/canva-updater" "Canva Updater Cache"
safe_delete "$HOME/Library/Caches/com.oracle.java.JavaAppletPlugin" "Java Plugin Cache"
safe_delete "$HOME/Library/Caches/node-gyp" "node-gyp Cache"
safe_delete "$HOME/Library/Caches/Homebrew" "Homebrew Cache"

echo "=========================================="
echo "✅ Additional cleanup complete!"
echo "=========================================="
echo ""
echo "Approximately 3GB+ more freed up."
echo ""
echo "Note: Extension caches will re-download when needed."
echo "      Your settings and extensions are safe."

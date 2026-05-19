#!/bin/bash

# Script to clean up large caches and old files
# SAFE TO DELETE - Current project Assignmint3 is NOT affected

set -e  # Exit on error

echo "=========================================="
echo "Storage Cleanup Script"
echo "=========================================="
echo ""
echo "This will delete:"
echo "  - Xcode build caches (~3.1GB)"
echo "  - iOS Simulator data (~9.6GB)"
echo "  - npm cache (~7.0GB)"
echo "  - CocoaPods cache (~1.1GB)"
echo "  - Browser/development caches (~10GB+)"
echo "  - Old project folders (~350MB)"
echo ""
echo "Total: ~30-35 GB"
echo ""
echo "⚠️  Your current project (/Users/hamza/Assignmint3) will NOT be touched!"
echo ""

read -p "Continue with cleanup? (yes/no): " confirm

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

# Development caches (safe to delete)
echo "1. Development Build Caches:"
safe_delete "$HOME/Library/Developer/Xcode/DerivedData" "Xcode DerivedData"
safe_delete "$HOME/Library/Developer/CoreSimulator" "iOS Simulator Data"

# Package manager caches
echo "2. Package Manager Caches:"
safe_delete "$HOME/.npm" "npm Cache"
safe_delete "$HOME/Library/Caches/CocoaPods" "CocoaPods Cache"
safe_delete "$HOME/Library/Caches/pip" "pip Cache (Python)"
safe_delete "$HOME/Library/Caches/typescript" "TypeScript Cache"

# Browser/App caches
echo "3. Browser/App Caches:"
safe_delete "$HOME/Library/Caches/Google" "Google Cache"
safe_delete "$HOME/Library/Caches/vscode-cpptools" "VS Code C++ Tools Cache"
safe_delete "$HOME/Library/Caches/SiriTTS" "Siri TTS Cache"

# Old project folders
echo "4. Old Project Folders:"
safe_delete "/Users/hamza/TempNativeApp" "TempNativeApp"
safe_delete "/Users/hamza/node_modules" "Orphaned node_modules"
safe_delete "/Users/hamza/package-lock.json" "Orphaned package-lock.json"

echo "=========================================="
echo "✅ Cleanup complete!"
echo "=========================================="
echo ""
echo "Approximately 30-35 GB freed up."
echo ""
echo "Note: Caches will regenerate as needed when you build/run your project."

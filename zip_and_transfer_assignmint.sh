#!/bin/bash

# Script to zip and transfer remaining Assignmint projects to USB
# CURRENT PROJECT (DO NOT TOUCH): /Users/hamza/Assignmint3

set -e  # Exit on any error

USB_PATH="/Volumes/SYED USB"
BACKUP_DIR="$USB_PATH/Assignmint_Backups_$(date +%Y%m%d_%H%M%S)"

# Folders to zip and transfer (excluding already transferred AssignMint_backup)
FOLDERS=(
    "/Users/hamza/AssignMint"
    "/Users/hamza/Assignmint3_backups"
    "/Users/hamza/Desktop/AssignmintTemp2"
    "/Users/hamza/Downloads/AssignMint"
    "/Users/hamza/Downloads/AssignMint-main"
    "/Users/hamza/Desktop/Assignmint Notes"
    "/Users/hamza/Desktop/Assignmint Wireframe"
)

echo "=========================================="
echo "Assignmint Zip & Transfer Script"
echo "=========================================="
echo ""
echo "USB Path: $USB_PATH"
echo "Backup Directory: $BACKUP_DIR"
echo ""
echo "Folders to zip and transfer:"
for folder in "${FOLDERS[@]}"; do
    if [ -d "$folder" ]; then
        size=$(du -sh "$folder" 2>/dev/null | cut -f1)
        echo "  - $folder ($size)"
    fi
done
echo ""

# Check USB is mounted
if [ ! -d "$USB_PATH" ]; then
    echo "ERROR: USB not found at $USB_PATH"
    exit 1
fi

# Check available space
USB_FREE=$(df -h "$USB_PATH" | tail -1 | awk '{print $4}')
echo "USB Free Space: $USB_FREE"
echo ""

# Create backup directory on USB
mkdir -p "$BACKUP_DIR"
echo "Created backup directory: $BACKUP_DIR"
echo ""

# Function to zip and transfer a folder
zip_and_transfer() {
    local folder="$1"
    local folder_name=$(basename "$folder")
    local zip_name="${folder_name// /_}_$(date +%Y%m%d).zip"
    local zip_path="/tmp/$zip_name"
    local dest_path="$BACKUP_DIR/$zip_name"
    
    if [ ! -d "$folder" ]; then
        echo "⚠️  Skipping: $folder (not found)"
        return
    fi
    
    echo "Processing: $folder"
    
    # Create zip file
    echo "  → Creating zip: $zip_name"
    cd "$(dirname "$folder")"
    zip -r -q "$zip_path" "$(basename "$folder")" 2>/dev/null || {
        echo "  ❌ ERROR: Failed to create zip for $folder"
        return 1
    }
    
    # Check zip was created
    if [ ! -f "$zip_path" ]; then
        echo "  ❌ ERROR: Zip file not created"
        return 1
    fi
    
    zip_size=$(du -h "$zip_path" | cut -f1)
    echo "  ✓ Zip created: $zip_name ($zip_size)"
    
    # Transfer to USB
    echo "  → Transferring to USB..."
    cp "$zip_path" "$dest_path" || {
        echo "  ❌ ERROR: Failed to transfer zip to USB"
        rm -f "$zip_path"
        return 1
    }
    
    # Verify transfer
    if [ ! -f "$dest_path" ]; then
        echo "  ❌ ERROR: Verification failed - zip not on USB"
        rm -f "$zip_path"
        return 1
    fi
    
    # Compare file sizes
    local_size=$(stat -f%z "$zip_path" 2>/dev/null || stat -c%s "$zip_path" 2>/dev/null)
    usb_size=$(stat -f%z "$dest_path" 2>/dev/null || stat -c%s "$dest_path" 2>/dev/null)
    
    if [ "$local_size" != "$usb_size" ]; then
        echo "  ❌ ERROR: File size mismatch!"
        echo "    Local: $local_size bytes"
        echo "    USB: $usb_size bytes"
        rm -f "$zip_path"
        return 1
    fi
    
    echo "  ✓ Transferred and verified: $zip_name"
    
    # Delete zip from Mac
    echo "  → Deleting zip from Mac..."
    rm -f "$zip_path" || {
        echo "  ⚠️  WARNING: Failed to delete zip from Mac"
        return 1
    }
    echo "  ✓ Zip deleted from Mac"
    
    # Delete original folder
    echo "  → Deleting original folder..."
    rm -rf "$folder" || {
        echo "  ❌ ERROR: Failed to delete original folder"
        return 1
    }
    echo "  ✓ Original folder deleted"
    echo ""
}

# Process each folder
echo "Starting zip and transfer process..."
echo "=========================================="
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0

for folder in "${FOLDERS[@]}"; do
    if zip_and_transfer "$folder"; then
        ((SUCCESS_COUNT++))
    else
        ((FAILED_COUNT++))
        echo "  ⚠️  Continuing with next folder..."
    fi
done

echo "=========================================="
echo "Transfer Summary"
echo "=========================================="
echo "✓ Successfully transferred: $SUCCESS_COUNT"
if [ $FAILED_COUNT -gt 0 ]; then
    echo "✗ Failed: $FAILED_COUNT"
fi
echo ""
echo "Backup location on USB: $BACKUP_DIR"
echo ""
echo "✅ Process complete!"

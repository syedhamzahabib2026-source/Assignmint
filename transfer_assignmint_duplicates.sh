#!/bin/bash

# Script to transfer duplicate Assignmint projects to USB
# CURRENT PROJECT (DO NOT TRANSFER): /Users/hamza/Assignmint3

echo "=========================================="
echo "Assignmint Duplicate Transfer Script"
echo "=========================================="
echo ""
echo "CURRENT PROJECT (WILL NOT BE TRANSFERRED):"
echo "  /Users/hamza/Assignmint3"
echo ""
echo "FOLDERS TO TRANSFER:"
echo "  1. /Users/hamza/AssignMint"
echo "  2. /Users/hamza/AssignMint_backup (2.7GB)"
echo "  3. /Users/hamza/Assignmint3_backups"
echo "  4. /Users/hamza/Desktop/AssignmintTemp2"
echo "  5. /Users/hamza/Downloads/AssignMint"
echo "  6. /Users/hamza/Downloads/AssignMint-main"
echo "  7. /Users/hamza/Desktop/Assignmint Notes"
echo "  8. /Users/hamza/Desktop/Assignmint Wireframe"
echo ""

# Check for USB drive
echo "Checking for USB drives..."
USB_MOUNT=""
for volume in /Volumes/*; do
    if [ -d "$volume" ] && [ "$volume" != "/Volumes/Macintosh HD" ]; then
        USB_MOUNT="$volume"
        echo "Found USB drive: $USB_MOUNT"
        break
    fi
done

if [ -z "$USB_MOUNT" ]; then
    echo ""
    echo "ERROR: No USB drive detected!"
    echo "Please plug in your USB drive and run this script again."
    echo ""
    echo "To manually specify a USB path, edit this script and set:"
    echo "  USB_MOUNT=\"/Volumes/YOUR_USB_NAME\""
    exit 1
fi

# Create destination folder on USB
DEST_DIR="$USB_MOUNT/Assignmint_Backups_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DEST_DIR"

echo ""
echo "Destination: $DEST_DIR"
echo ""
read -p "Do you want to proceed with the transfer? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Transfer cancelled."
    exit 0
fi

echo ""
echo "Starting transfer..."
echo ""

# Transfer each folder
transfer_folder() {
    local source="$1"
    local dest="$2"
    
    if [ -d "$source" ]; then
        echo "Transferring: $source"
        cp -R "$source" "$dest" 2>&1 | grep -v "Operation not permitted" || echo "  ⚠️  Some files may have been skipped (permissions)"
        echo "  ✓ Done"
    else
        echo "  ⚠️  Not found: $source"
    fi
}

# Transfer all folders
transfer_folder "/Users/hamza/AssignMint" "$DEST_DIR/"
transfer_folder "/Users/hamza/AssignMint_backup" "$DEST_DIR/"
transfer_folder "/Users/hamza/Assignmint3_backups" "$DEST_DIR/"
transfer_folder "/Users/hamza/Desktop/AssignmintTemp2" "$DEST_DIR/"
transfer_folder "/Users/hamza/Downloads/AssignMint" "$DEST_DIR/"
transfer_folder "/Users/hamza/Downloads/AssignMint-main" "$DEST_DIR/"
transfer_folder "/Users/hamza/Desktop/Assignmint Notes" "$DEST_DIR/"
transfer_folder "/Users/hamza/Desktop/Assignmint Wireframe" "$DEST_DIR/"

echo ""
echo "=========================================="
echo "Transfer complete!"
echo "=========================================="
echo ""
echo "Files transferred to: $DEST_DIR"
echo ""
echo "⚠️  IMPORTANT: Verify the files on your USB before deleting from your Mac!"
echo ""
read -p "Do you want to delete the original folders now? (yes/no): " delete_confirm

if [ "$delete_confirm" == "yes" ]; then
    echo ""
    echo "Deleting original folders..."
    rm -rf "/Users/hamza/AssignMint"
    rm -rf "/Users/hamza/AssignMint_backup"
    rm -rf "/Users/hamza/Assignmint3_backups"
    rm -rf "/Users/hamza/Desktop/AssignmintTemp2"
    rm -rf "/Users/hamza/Downloads/AssignMint"
    rm -rf "/Users/hamza/Downloads/AssignMint-main"
    rm -rf "/Users/hamza/Desktop/Assignmint Notes"
    rm -rf "/Users/hamza/Desktop/Assignmint Wireframe"
    echo "✓ Deletion complete"
else
    echo "Originals kept. You can delete them manually later."
fi

echo ""
echo "Done!"

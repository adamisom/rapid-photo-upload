#!/bin/bash

# RapidPhotoUpload - Delete All Photos Script
# Deletes all photos and upload batches from database, keeps users intact

set -e

echo "=================================="
echo "Delete All Photos Script"
echo "=================================="
echo ""
echo "Database: rapidphoto_dev"
echo "Host: localhost:5432"
echo ""
echo "⚠️  WARNING: This will delete ALL photos and upload batches!"
echo "Users will remain intact."
echo ""
read -p "Are you sure? Type 'yes' to continue: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Aborted."
    exit 0
fi

echo ""
echo "Connecting to database..."
echo ""

# Delete in correct order to respect foreign key constraints
# 1. Delete photos first (references upload_batches)
# 2. Delete upload_batches (references users)

PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d rapidphoto_dev << EOF
-- Show counts before deletion
SELECT COUNT(*) as "Photos before deletion" FROM photos;
SELECT COUNT(*) as "Upload batches before deletion" FROM upload_batches;
SELECT COUNT(*) as "Users (will remain)" FROM users;

-- Delete all photos
DELETE FROM photos;

-- Delete all upload batches
DELETE FROM upload_batches;

-- Show counts after deletion
SELECT COUNT(*) as "Photos after deletion" FROM photos;
SELECT COUNT(*) as "Upload batches after deletion" FROM upload_batches;
SELECT COUNT(*) as "Users (remained)" FROM users;

-- Show success message
SELECT 'All photos and batches deleted successfully!' as "Status";
EOF

echo ""
echo "✅ All photos and batches deleted successfully!"
echo ""


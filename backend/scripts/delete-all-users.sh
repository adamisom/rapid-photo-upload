#!/bin/bash

# ============================================================================
# Delete All Users Script
# ============================================================================
# 
# This script deletes ALL users from the rapidphoto database.
# Due to CASCADE relationships, this will also delete:
# - All photos
# - All upload_batches
#
# USE ONLY IN DEVELOPMENT!

echo "============================================"
echo "DELETING ALL USERS FROM DATABASE"
echo "============================================"
echo ""
echo "Database: rapidphoto_dev"
echo "Host: localhost:5432"
echo ""
echo "⚠️  WARNING: This will delete ALL users and their data!"
echo "⚠️  This action cannot be undone."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Connecting to database..."
echo ""

# Execute SQL to delete all users
# Must delete in correct order due to foreign key constraints
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d rapidphoto_dev <<EOF
-- Show current counts
SELECT COUNT(*) as "Users before deletion" FROM users;
SELECT COUNT(*) as "Photos before deletion" FROM photos;
SELECT COUNT(*) as "Upload batches before deletion" FROM upload_batches;

-- Delete in correct order to avoid foreign key violations
-- 1. Delete photos first (they reference upload_batches and users)
DELETE FROM photos;

-- 2. Delete upload_batches (they reference users)
DELETE FROM upload_batches;

-- 3. Finally delete users
DELETE FROM users;

-- Show updated counts
SELECT COUNT(*) as "Users after deletion" FROM users;
SELECT COUNT(*) as "Photos after deletion" FROM photos;
SELECT COUNT(*) as "Upload batches after deletion" FROM upload_batches;

-- Show success message
SELECT 'All users deleted successfully!' as "Status";
EOF

echo ""
echo "============================================"
echo "✅ All users have been deleted"
echo "============================================"


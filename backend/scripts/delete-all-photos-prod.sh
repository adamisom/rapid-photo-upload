#!/bin/bash

# Script to delete all photos from production database
# This will delete all photos, upload batches, but keep users

set -e

echo "============================================"
echo "DELETING ALL PHOTOS FROM PRODUCTION DATABASE"
echo "============================================"
echo ""
echo "⚠️  WARNING: This will delete ALL photos and upload batches from PRODUCTION!"
echo "⚠️  Users will be preserved."
echo "⚠️  This action cannot be undone."
echo ""

# Confirmation prompt
read -p "Type 'yes' to confirm: " confirmation
if [ "$confirmation" != "yes" ]; then
    echo "❌ Deletion cancelled."
    exit 1
fi

echo ""
echo "Getting DATABASE_URL from Railway..."

# Method 1: Use Railway CLI (if linked) - prefer PUBLIC_URL for external access
if command -v railway &> /dev/null; then
    echo "Using Railway CLI..."
    cd "$(dirname "$0")/.."
    # Try DATABASE_PUBLIC_URL first (external connection), fallback to DATABASE_URL
    # Use Python for reliable JSON parsing
    if command -v python3 &> /dev/null; then
        DATABASE_URL=$(railway variables --json 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('DATABASE_PUBLIC_URL', data.get('DATABASE_URL', '')))" 2>/dev/null)
    else
        # Fallback to grep if Python not available
        DATABASE_URL=$(railway variables --json 2>/dev/null | grep -o '"DATABASE_PUBLIC_URL":"[^"]*' | cut -d'"' -f4)
        if [ -z "$DATABASE_URL" ]; then
            DATABASE_URL=$(railway variables --json 2>/dev/null | grep -o '"DATABASE_URL":"[^"]*' | cut -d'"' -f4)
        fi
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ Could not get DATABASE_URL from Railway CLI"
        echo ""
        echo "Please get DATABASE_PUBLIC_URL or DATABASE_URL manually:"
        echo "1. Go to https://railway.app/dashboard"
        echo "2. Select your PostgreSQL service"
        echo "3. Go to Variables tab"
        echo "4. Copy the DATABASE_PUBLIC_URL value (preferred) or DATABASE_URL"
        echo ""
        read -p "Paste connection string here: " DATABASE_URL
    fi
else
    echo "Railway CLI not found. Please provide connection string manually:"
    echo "1. Go to https://railway.app/dashboard"
    echo "2. Select your PostgreSQL service"
    echo "3. Go to Variables tab"
    echo "4. Copy the DATABASE_PUBLIC_URL value (preferred) or DATABASE_URL"
    echo ""
    read -p "Paste connection string here: " DATABASE_URL
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is required. Aborting."
    exit 1
fi

echo "Connecting to production database..."
echo ""

# Parse DATABASE_URL format: postgresql://user:password@host:port/dbname
# Extract components for psql
DB_URL=$(echo "$DATABASE_URL" | sed 's|postgresql://||')
DB_USER=$(echo "$DB_URL" | cut -d: -f1)
DB_PASS=$(echo "$DB_URL" | cut -d: -f2 | cut -d@ -f1)
DB_HOST_PORT=$(echo "$DB_URL" | cut -d@ -f2 | cut -d/ -f1)
DB_HOST=$(echo "$DB_HOST_PORT" | cut -d: -f1)
DB_PORT=$(echo "$DB_HOST_PORT" | cut -d: -f2)
DB_NAME=$(echo "$DB_URL" | cut -d/ -f2)

# Default port if not specified
if [ -z "$DB_PORT" ]; then
    DB_PORT=5432
fi

echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Export password for psql
export PGPASSWORD="$DB_PASS"

# Execute SQL to delete all photos and batches
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Show current counts
SELECT COUNT(*) as "Photos before deletion" FROM photos;
SELECT COUNT(*) as "Upload batches before deletion" FROM upload_batches;
SELECT COUNT(*) as "Users (will be preserved)" FROM users;

-- Use TRUNCATE with CASCADE for faster, atomic deletion
-- This will delete all photos and batches, but preserve users
TRUNCATE TABLE photos, upload_batches CASCADE;

-- Show updated counts
SELECT COUNT(*) as "Photos after deletion" FROM photos;
SELECT COUNT(*) as "Upload batches after deletion" FROM upload_batches;
SELECT COUNT(*) as "Users (preserved)" FROM users;

-- Show success message
SELECT 'All photos and batches deleted successfully!' as "Status";
EOF

# Clear password from environment
unset PGPASSWORD

echo ""
echo "============================================"
echo "✅ All photos and upload batches have been deleted from production"
echo "✅ Users have been preserved"
echo "============================================"


#!/bin/bash

# Script to check how many photos exist for a specific user

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <email>"
    echo "Example: $0 test5@example.com"
    exit 1
fi

EMAIL="$1"

echo "============================================"
echo "CHECKING PHOTOS FOR USER: $EMAIL"
echo "============================================"
echo ""

# Get DATABASE_URL from Railway
if command -v railway &> /dev/null; then
    echo "Getting DATABASE_URL from Railway..."
    cd "$(dirname "$0")/.."
    if command -v python3 &> /dev/null; then
        DATABASE_URL=$(railway variables --json 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('DATABASE_PUBLIC_URL', data.get('DATABASE_URL', '')))" 2>/dev/null)
    else
        DATABASE_URL=$(railway variables --json 2>/dev/null | grep -o '"DATABASE_PUBLIC_URL":"[^"]*' | cut -d'"' -f4)
        if [ -z "$DATABASE_URL" ]; then
            DATABASE_URL=$(railway variables --json 2>/dev/null | grep -o '"DATABASE_URL":"[^"]*' | cut -d'"' -f4)
        fi
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ Could not get DATABASE_URL from Railway CLI"
        exit 1
    fi
else
    echo "❌ Railway CLI not found"
    exit 1
fi

# Parse DATABASE_URL
DB_URL=$(echo "$DATABASE_URL" | sed 's|postgresql://||')
DB_USER=$(echo "$DB_URL" | cut -d: -f1)
DB_PASS=$(echo "$DB_URL" | cut -d: -f2 | cut -d@ -f1)
DB_HOST_PORT=$(echo "$DB_URL" | cut -d@ -f2 | cut -d/ -f1)
DB_HOST=$(echo "$DB_HOST_PORT" | cut -d: -f1)
DB_PORT=$(echo "$DB_HOST_PORT" | cut -d: -f2)
DB_NAME=$(echo "$DB_URL" | cut -d/ -f2)

if [ -z "$DB_PORT" ]; then
    DB_PORT=5432
fi

export PGPASSWORD="$DB_PASS"

# Query database
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF

-- Find user by email
SELECT 
    u.id as "User ID",
    u.email as "Email",
    COUNT(p.id) as "Total Photos",
    COUNT(CASE WHEN p.status = 'UPLOADED' THEN 1 END) as "Uploaded",
    COUNT(CASE WHEN p.status = 'PENDING' THEN 1 END) as "Pending",
    COUNT(CASE WHEN p.status = 'FAILED' THEN 1 END) as "Failed"
FROM users u
LEFT JOIN photos p ON p.user_id = u.id
WHERE u.email = '$EMAIL'
GROUP BY u.id, u.email;

-- Show recent photos for this user
SELECT 
    p.id as "Photo ID",
    p.original_filename as "Filename",
    p.status as "Status",
    p.file_size_bytes as "Size (bytes)",
    p.created_at as "Created At",
    p.updated_at as "Updated At"
FROM users u
JOIN photos p ON p.user_id = u.id
WHERE u.email = '$EMAIL'
ORDER BY p.created_at DESC
LIMIT 20;

EOF

unset PGPASSWORD

echo ""
echo "============================================"


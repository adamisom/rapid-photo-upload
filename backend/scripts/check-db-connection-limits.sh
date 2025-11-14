#!/bin/bash

# Script to check PostgreSQL connection limits and current usage
# Works with Railway production database

set -e

echo "============================================"
echo "CHECKING DATABASE CONNECTION LIMITS"
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

echo "Connecting to database..."
echo ""

# Parse DATABASE_URL format: postgresql://user:password@host:port/dbname
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

# Execute SQL queries to check connection limits
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF

-- Check max_connections setting
SELECT 
    name,
    setting,
    unit,
    short_desc
FROM pg_settings 
WHERE name = 'max_connections';

-- Check current connection count
SELECT 
    count(*) as "Current Connections",
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as "Max Connections",
    round(100.0 * count(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) as "Usage %"
FROM pg_stat_activity;

-- Show connection details by state
SELECT 
    state,
    count(*) as "Count"
FROM pg_stat_activity
GROUP BY state
ORDER BY count(*) DESC;

-- Show connections by database
SELECT 
    datname as "Database",
    count(*) as "Connections"
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname
ORDER BY count(*) DESC;

-- Show connections by user
SELECT 
    usename as "User",
    count(*) as "Connections"
FROM pg_stat_activity
WHERE usename IS NOT NULL
GROUP BY usename
ORDER BY count(*) DESC;

EOF

# Clear password from environment
unset PGPASSWORD

echo ""
echo "============================================"
echo "✅ Connection limit check complete"
echo "============================================"
echo ""
echo "💡 Tips:"
echo "- max_connections is the PostgreSQL server limit"
echo "- Your HikariCP pool size should be less than max_connections"
echo "- Leave some connections for other processes (admin, monitoring, etc.)"
echo "- Recommended: HikariCP max_pool_size = max_connections * 0.8"


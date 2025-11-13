#!/bin/bash
# Start backend with required environment variables and prerequisites

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Starting RapidPhoto Backend..."

# Check if JWT_SECRET is set
if [ -z "$JWT_SECRET" ]; then
    echo -e "${YELLOW}⚠️  JWT_SECRET not set in environment${NC}"
    echo "   Checking ~/.zshrc..."
    if grep -q "JWT_SECRET" ~/.zshrc 2>/dev/null; then
        echo -e "${GREEN}✅ Found JWT_SECRET in ~/.zshrc, sourcing...${NC}"
        source ~/.zshrc
    else
        echo -e "${YELLOW}⚠️  JWT_SECRET not found in ~/.zshrc${NC}"
        echo "   Setting temporary JWT_SECRET for this session..."
        export JWT_SECRET="dev-secret-minimum-64-characters-long-for-local-development-only-12345"
    fi
fi

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ JWT_SECRET is required but not set${NC}"
    echo "   Please set it with: export JWT_SECRET='your-secret-key'"
    exit 1
fi

echo -e "${GREEN}✅ JWT_SECRET is set${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running${NC}"
    echo "   Attempting to start Colima..."
    if command -v colima > /dev/null 2>&1; then
        colima start
        sleep 3
    else
        echo -e "${RED}❌ Docker is not running and Colima is not installed${NC}"
        echo "   Please start Docker or install Colima: brew install colima"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if PostgreSQL container is running
if ! docker ps | grep -q rapidphoto-postgres; then
    echo -e "${YELLOW}⚠️  PostgreSQL container is not running${NC}"
    echo "   Starting PostgreSQL with docker-compose..."
    cd "$(dirname "$0")/.."
    docker-compose up -d postgres
    echo "   Waiting for PostgreSQL to be ready..."
    sleep 3
fi

# Verify PostgreSQL is actually running
if docker ps | grep -q rapidphoto-postgres; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
    exit 1
fi

# Start backend
echo -e "${GREEN}✅ All prerequisites met, starting backend...${NC}"
cd "$(dirname "$0")/../backend"

# Ensure database environment variables are set (use defaults if not set)
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGDATABASE="${PGDATABASE:-rapidphoto_dev}"
export PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

echo -e "${GREEN}   Database config: ${PGHOST}:${PGPORT}/${PGDATABASE}${NC}"
echo -e "${GREEN}   JWT_SECRET: ${JWT_SECRET:+SET (${#JWT_SECRET} chars)}${NC}"

# Pass database config as system properties to ensure Spring Boot reads them
./mvnw spring-boot:run \
  -Dspring.datasource.url="jdbc:postgresql://${PGHOST}:${PGPORT}/${PGDATABASE}" \
  -Dspring.datasource.username="${PGUSER}" \
  -Dspring.datasource.password="${PGPASSWORD}" \
  -Djwt.secret="${JWT_SECRET}"

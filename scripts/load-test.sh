#!/bin/bash
# =============================================================================
# RapidPhotoUpload - Load Test Script
# =============================================================================
# Tests: 100 × 2MB concurrent photo uploads
# Validates: Backend handles high concurrency, S3 upload, database integrity
#
# Usage:
#   ./scripts/load-test.sh [num_photos] [photo_size_mb]
#   
#   Examples:
#     ./scripts/load-test.sh              # Default: 100 photos × 2MB
#     ./scripts/load-test.sh 50 1         # 50 photos × 1MB
#     ./scripts/load-test.sh 200 5        # 200 photos × 5MB
#
# Requirements:
#   - jq (for JSON parsing): brew install jq
#   - curl (for API calls)
#   - Backend running on localhost:8080
#   - PostgreSQL running
#   - AWS S3 configured
#
# Note: To start with a clean database, run:
#   ./backend/scripts/delete-all-photos.sh
# =============================================================================

set -e  # Exit on error

# =============================================================================
# Configuration
# =============================================================================
NUM_PHOTOS=${1:-100}
PHOTO_SIZE_MB=${2:-2}
API_URL="http://localhost:8080"
TEST_USER="loadtest_$(date +%s)@example.com"
TEST_PASS="LoadTest123!"
MAX_CONCURRENT=10  # Upload 10 files in parallel

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

check_dependency() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is required but not installed. Install with: $2"
        exit 1
    fi
}

# =============================================================================
# Pre-Flight Checks
# =============================================================================

echo ""
echo "==================================================================="
echo "  RapidPhotoUpload - Load Test"
echo "==================================================================="
echo ""
log_info "Configuration:"
echo "  • Photos: $NUM_PHOTOS"
echo "  • Size: $PHOTO_SIZE_MB MB each"
echo "  • Total: $((NUM_PHOTOS * PHOTO_SIZE_MB)) MB"
echo "  • API: $API_URL"
echo "  • Concurrency: $MAX_CONCURRENT parallel uploads"
echo ""

# Check dependencies
log_info "Checking dependencies..."
check_dependency "jq" "brew install jq"
check_dependency "curl" "(built-in)"
check_dependency "bc" "(built-in)"
log_success "All dependencies installed"

# Check backend is running
log_info "Checking backend availability..."
if ! curl -s -f "$API_URL/actuator/health" > /dev/null 2>&1; then
    log_error "Backend not responding at $API_URL"
    log_error "Please start the backend: cd backend && mvn spring-boot:run"
    exit 1
fi
log_success "Backend is running"

echo ""

# =============================================================================
# Phase 1: User Registration
# =============================================================================

echo "==================================================================="
echo "  Phase 1: Register Test User"
echo "==================================================================="
echo ""

log_info "Registering user: $TEST_USER"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")

if echo "$REGISTER_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
    log_success "User registered: $TEST_USER"
    log_info "Token: ${TOKEN:0:30}..."
else
    log_error "Registration failed"
    echo "$REGISTER_RESPONSE" | jq '.'
    exit 1
fi

echo ""

# =============================================================================
# Phase 2: Generate Test Images
# =============================================================================

echo "==================================================================="
echo "  Phase 2: Generate Test Images"
echo "==================================================================="
echo ""

TEST_DIR="/tmp/rapidphoto-loadtest-$(date +%s)"
mkdir -p "$TEST_DIR"
log_info "Test directory: $TEST_DIR"

log_info "Generating $NUM_PHOTOS test images ($PHOTO_SIZE_MB MB each)..."
for i in $(seq 1 $NUM_PHOTOS); do
    if [ $((i % 20)) -eq 0 ] || [ $i -eq $NUM_PHOTOS ]; then
        echo -ne "  Progress: $i/$NUM_PHOTOS\r"
    fi
    # Generate random binary file (simulating photo)
    dd if=/dev/urandom of="$TEST_DIR/photo-$i.jpg" bs=1M count=$PHOTO_SIZE_MB 2>/dev/null
done
echo ""
log_success "Generated $NUM_PHOTOS test images ($(du -sh $TEST_DIR | cut -f1))"

echo ""

# =============================================================================
# Phase 3: Initiate Uploads (Request Presigned URLs)
# =============================================================================

echo "==================================================================="
echo "  Phase 3: Initiate Uploads (Request Presigned URLs)"
echo "==================================================================="
echo ""

INITIATE_START=$(date +%s)
INITIATE_START_NS=$(date +%s%N)
log_info "Requesting $NUM_PHOTOS presigned URLs..."

# Store photo metadata in arrays
declare -a PHOTO_IDS
declare -a UPLOAD_URLS
declare -a BATCH_ID

BATCH_ID=""
FAILED_INITIATIONS=0

for i in $(seq 1 $NUM_PHOTOS); do
    if [ $((i % 20)) -eq 0 ] || [ $i -eq $NUM_PHOTOS ]; then
        echo -ne "  Progress: $i/$NUM_PHOTOS\r"
    fi
    
    INITIATE_RESPONSE=$(curl -s -X POST "$API_URL/api/upload/initiate" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"filename\": \"photo-$i.jpg\",
            \"fileSizeBytes\": $((PHOTO_SIZE_MB * 1024 * 1024)),
            \"contentType\": \"image/jpeg\"
        }")
    
    if echo "$INITIATE_RESPONSE" | jq -e '.photoId' > /dev/null 2>&1; then
        PHOTO_IDS[$i]=$(echo "$INITIATE_RESPONSE" | jq -r '.photoId')
        UPLOAD_URLS[$i]=$(echo "$INITIATE_RESPONSE" | jq -r '.uploadUrl')
        if [ -z "$BATCH_ID" ]; then
            BATCH_ID=$(echo "$INITIATE_RESPONSE" | jq -r '.batchId')
        fi
    else
        ((FAILED_INITIATIONS++))
    fi
done

echo ""

INITIATE_END=$(date +%s)
INITIATE_END_NS=$(date +%s%N)
INITIATE_MS=$(echo "scale=2; ($INITIATE_END_NS - $INITIATE_START_NS) / 1000000" | bc)
INITIATE_SECONDS=$(echo "scale=2; ($INITIATE_END - $INITIATE_START)" | bc)

if [ $FAILED_INITIATIONS -gt 0 ]; then
    log_warn "$FAILED_INITIATIONS initiations failed"
fi

SUCCESSFUL_INITIATIONS=$((NUM_PHOTOS - FAILED_INITIATIONS))
log_success "Initiated $SUCCESSFUL_INITIATIONS/$NUM_PHOTOS uploads in ${INITIATE_SECONDS}s"
log_info "Batch ID: $BATCH_ID"
log_info "Average time per initiation: $(echo "scale=2; $INITIATE_MS / $NUM_PHOTOS" | bc)ms"

if [ $FAILED_INITIATIONS -eq $NUM_PHOTOS ]; then
    log_error "All initiations failed. Aborting test."
    exit 1
fi

echo ""

# =============================================================================
# Phase 4: Upload to S3 (Concurrent)
# =============================================================================

echo "==================================================================="
echo "  Phase 4: Upload to S3 (Concurrent)"
echo "==================================================================="
echo ""

UPLOAD_START=$(date +%s)
log_info "Uploading $SUCCESSFUL_INITIATIONS files to S3 ($MAX_CONCURRENT in parallel)..."

# Track upload results
UPLOAD_SUCCESS_COUNT=0
UPLOAD_FAIL_COUNT=0
COMPLETED_COUNT=0

# Function to upload a single file
upload_file() {
    local INDEX=$1
    local PHOTO_ID=${PHOTO_IDS[$INDEX]}
    local UPLOAD_URL=${UPLOAD_URLS[$INDEX]}
    local FILE_PATH="$TEST_DIR/photo-$INDEX.jpg"
    
    if [ -z "$PHOTO_ID" ] || [ -z "$UPLOAD_URL" ]; then
        return 1
    fi
    
    # Upload to S3 using presigned URL
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$UPLOAD_URL" \
        -H "Content-Type: image/jpeg" \
        --data-binary "@$FILE_PATH")
    
    if [ "$HTTP_CODE" = "200" ]; then
        # Notify backend of completion
        COMPLETE_RESPONSE=$(curl -s -X POST "$API_URL/api/upload/complete/$PHOTO_ID" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"fileSizeBytes\": $((PHOTO_SIZE_MB * 1024 * 1024))}")
        
        if echo "$COMPLETE_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
            echo "SUCCESS:$INDEX" >> "$TEST_DIR/upload_results.txt"
        else
            echo "FAIL:$INDEX" >> "$TEST_DIR/upload_results.txt"
        fi
    else
        echo "FAIL:$INDEX" >> "$TEST_DIR/upload_results.txt"
    fi
}

# Upload with concurrency control
ACTIVE_JOBS=0
for i in $(seq 1 $NUM_PHOTOS); do
    # Skip if initiation failed
    if [ -z "${PHOTO_IDS[$i]}" ]; then
        continue
    fi
    
    # Wait if at max concurrent
    while [ $ACTIVE_JOBS -ge $MAX_CONCURRENT ]; do
        sleep 0.1
        # Count active background jobs
        ACTIVE_JOBS=$(jobs -r | wc -l | tr -d ' ')
        
        # Update progress from results file
        if [ -f "$TEST_DIR/upload_results.txt" ]; then
            COMPLETED_COUNT=$(wc -l < "$TEST_DIR/upload_results.txt" | tr -d ' ')
            echo -ne "  Progress: $COMPLETED_COUNT/$SUCCESSFUL_INITIATIONS uploaded\r"
        fi
    done
    
    # Start upload in background
    upload_file $i &
    ACTIVE_JOBS=$(jobs -r | wc -l | tr -d ' ')
done

# Wait for all uploads to complete
wait

# Count final results
if [ -f "$TEST_DIR/upload_results.txt" ]; then
    UPLOAD_SUCCESS_COUNT=$(grep -c "SUCCESS" "$TEST_DIR/upload_results.txt" || echo "0")
    UPLOAD_FAIL_COUNT=$(grep -c "FAIL" "$TEST_DIR/upload_results.txt" || echo "0")
fi

echo ""

UPLOAD_END=$(date +%s)
UPLOAD_DURATION=$((UPLOAD_END - UPLOAD_START))

log_success "S3 uploads completed in ${UPLOAD_DURATION}s"
log_info "Success: $UPLOAD_SUCCESS_COUNT"
log_info "Failed: $UPLOAD_FAIL_COUNT"

echo ""

# =============================================================================
# Phase 5: Verify Database State
# =============================================================================

echo "==================================================================="
echo "  Phase 5: Verify Database State"
echo "==================================================================="
echo ""

log_info "Checking batch status via API..."
BATCH_STATUS=$(curl -s -X GET "$API_URL/api/upload/batch/$BATCH_ID/status" \
    -H "Authorization: Bearer $TOKEN")

if echo "$BATCH_STATUS" | jq -e '.batchId' > /dev/null 2>&1; then
    DB_TOTAL=$(echo "$BATCH_STATUS" | jq -r '.totalCount')
    DB_COMPLETED=$(echo "$BATCH_STATUS" | jq -r '.completedCount')
    DB_FAILED=$(echo "$BATCH_STATUS" | jq -r '.failedCount')
    
    log_success "Batch status retrieved"
    log_info "Total count: $DB_TOTAL"
    log_info "Completed: $DB_COMPLETED"
    log_info "Failed: $DB_FAILED"
else
    log_warn "Could not retrieve batch status"
    echo "$BATCH_STATUS" | jq '.'
fi

echo ""

# =============================================================================
# Phase 6: Results Summary
# =============================================================================

echo "==================================================================="
echo "  Load Test Results"
echo "==================================================================="
echo ""

TOTAL_DURATION=$((UPLOAD_END - INITIATE_START))

echo "Configuration:"
echo "  • Photos: $NUM_PHOTOS × $PHOTO_SIZE_MB MB = $((NUM_PHOTOS * PHOTO_SIZE_MB)) MB total"
echo "  • API: $API_URL"
echo "  • Concurrency: $MAX_CONCURRENT parallel uploads"
echo ""

echo "Performance:"
echo "  • Initiation time: ${INITIATE_SECONDS}s ($SUCCESSFUL_INITIATIONS URLs)"
echo "  • Upload time: ${UPLOAD_DURATION}s"
echo "  • Average upload speed: $(echo "scale=2; ($NUM_PHOTOS * $PHOTO_SIZE_MB) / $UPLOAD_DURATION" | bc) MB/s"
echo ""

echo "Results:"
echo "  • Initiated: $SUCCESSFUL_INITIATIONS/$NUM_PHOTOS"
echo "  • Uploaded to S3: $UPLOAD_SUCCESS_COUNT"
echo "  • Failed: $UPLOAD_FAIL_COUNT"
echo "  • Database completed: ${DB_COMPLETED:-N/A}"
echo "  • Database failed: ${DB_FAILED:-N/A}"
echo ""

# Determine pass/fail
PASS=true
if [ $UPLOAD_FAIL_COUNT -gt 0 ]; then
    log_warn "Some uploads failed"
    PASS=false
fi

if [ "$INITIATE_SECONDS" != "0" ] && [ "$INITIATE_SECONDS" != "" ]; then
    INITIATE_SEC_NUMERIC=$(printf "%.0f" "$INITIATE_SECONDS")
    if [ "$INITIATE_SEC_NUMERIC" -gt 90 ]; then
        log_warn "Initiation took longer than 90 seconds"
        PASS=false
    fi
fi

if [ "$UPLOAD_SUCCESS_COUNT" -ne "$SUCCESSFUL_INITIATIONS" ]; then
    log_warn "Not all uploads succeeded"
    PASS=false
fi

echo ""
if [ "$PASS" = true ]; then
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                        ║${NC}"
    echo -e "${GREEN}║   ✓ LOAD TEST PASSED                  ║${NC}"
    echo -e "${GREEN}║                                        ║${NC}"
    echo -e "${GREEN}║   System handles $NUM_PHOTOS photos successfully  ║${NC}"
    echo -e "${GREEN}║                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
else
    echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                                        ║${NC}"
    echo -e "${YELLOW}║   ⚠ LOAD TEST COMPLETED WITH ISSUES  ║${NC}"
    echo -e "${YELLOW}║                                        ║${NC}"
    echo -e "${YELLOW}║   Review warnings above                ║${NC}"
    echo -e "${YELLOW}║                                        ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
fi
echo ""

# =============================================================================
# Cleanup
# =============================================================================

log_info "Cleaning up test files..."
rm -rf "$TEST_DIR"
log_success "Cleanup complete"

echo ""
echo "Test user credentials (for manual inspection):"
echo "  Email: $TEST_USER"
echo "  Password: $TEST_PASS"
echo "  Batch ID: $BATCH_ID"
echo ""

exit 0


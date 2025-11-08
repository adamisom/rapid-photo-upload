# 🧪 Testing Guide - All Phases

Comprehensive reference for testing RapidPhotoUpload across all implementation phases.

**Current Status**: Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅

---

## Quick Setup

### 1. Start PostgreSQL
```bash
docker-compose up -d
```

### 2. Set Environment Variables
```bash
export JWT_SECRET="your-minimum-64-character-jwt-secret-key-for-hs512"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="your-aws-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret"
export AWS_S3_BUCKET="your-bucket-name"
```

**Or load from .env:**
```bash
set -a
source .env
set +a
```

### 3. Start Backend
```bash
cd backend
./mvnw spring-boot:run
```

### 4. Verify Health
```bash
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

---

## Fast Rebuild & Test Loop

After code changes in `backend/`:

```bash
./mvnw clean compile -DskipTests && ./mvnw spring-boot:run
```

In another terminal, test immediately using the commands below.

---

# PHASE 1: Authentication

## Test: Register User

```bash
# Register and automatically export token + userId
export TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPassword123"}' | jq -r '.token') && \
export USER_ID=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPassword123"}' | jq -r '.userId') && \
echo "✅ Token: $TOKEN" && echo "✅ User ID: $USER_ID"
```

**Or simpler** (single register call):
```bash
RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPassword123"}')

export TOKEN=$(echo $RESPONSE | jq -r '.token')
export USER_ID=$(echo $RESPONSE | jq -r '.userId')

echo "✅ Token: $TOKEN"
echo "✅ User ID: $USER_ID"
```

**Expected**: 200 OK with token, userId, email

## Test: Login User

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123"
  }' | jq .
```

**Expected**: 200 OK with token

## Test: Protected Endpoint (with token)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/photos | jq .

# Expected: 200 OK (empty list initially)
# {
#   "photos": [],
#   "pageNumber": 0,
#   "pageSize": 20,
#   "totalCount": 0
# }
```

## Test: Protected Endpoint (without token)

```bash
curl http://localhost:8080/api/photos

# Expected: 401 Unauthorized
```

---

# PHASE 2: S3 Integration & Upload API

⚠️ **Requires AWS S3 bucket with CORS enabled** (see QUICK_START.md)

## Smoke Test: All Phase 2 Endpoints

### 1. Initiate Upload (Get Presigned URL)

```bash
curl -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test-photo.jpg",
    "fileSizeBytes": 102400,
    "contentType": "image/jpeg"
  }' | jq .

# Save for next steps:
export PHOTO_ID="<photoId-from-response>"
export BATCH_ID="<batchId-from-response>"
export UPLOAD_URL="<uploadUrl-from-response>"
```

**Expected**: 200 OK with presigned PUT URL

### 2. Upload File to S3

```bash
# Create test file
dd if=/dev/urandom of=/tmp/test.bin bs=1024 count=100

# Upload to presigned URL
curl -X PUT "${UPLOAD_URL}" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/tmp/test.bin

# Expected: 200 OK (empty response)
```

### 3. Complete Upload

```bash
curl -X POST http://localhost:8080/api/upload/complete/${PHOTO_ID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileSizeBytes": 102400
  }' | jq .

# Expected: 200 OK
# {"status": "success"}
```

### 4. Get Batch Status

```bash
curl -X GET http://localhost:8080/api/upload/batch/${BATCH_ID}/status \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK with batch progress
# {
#   "batchId": "...",
#   "totalCount": 1,
#   "completedCount": 1,
#   "failedCount": 0,
#   "photos": [...]
# }
```

---

# PHASE 3: Photo Query API

## Smoke Test: All Phase 3 Endpoints

### 1. List Photos (Pagination)

```bash
curl -X GET "http://localhost:8080/api/photos?page=0&pageSize=20" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK
# {
#   "photos": [
#     {
#       "id": "...",
#       "originalFilename": "test-photo.jpg",
#       "fileSizeBytes": 102400,
#       "downloadUrl": "https://s3.amazonaws.com/...",
#       "uploadedAt": "2025-11-08T..."
#     }
#   ],
#   "pageNumber": 0,
#   "pageSize": 20,
#   "totalCount": 1
# }
```

### 2. Get Single Photo

```bash
curl -X GET http://localhost:8080/api/photos/${PHOTO_ID} \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK with photo details and download URL
```

### 3. Test Download URL

```bash
# Extract downloadUrl from previous response
DOWNLOAD_URL="<from-response>"

# Test that URL works
curl -s "${DOWNLOAD_URL}" -o /tmp/downloaded.bin
ls -lh /tmp/downloaded.bin

# Expected: File downloaded successfully
```

### 4. Delete Photo

```bash
curl -X DELETE http://localhost:8080/api/photos/${PHOTO_ID} \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK
# {"status": "success"}
```

### 5. Verify Deletion

```bash
# Try to get deleted photo (should fail)
curl -X GET http://localhost:8080/api/photos/${PHOTO_ID} \
  -H "Authorization: Bearer $TOKEN"

# Expected: Error (photo not found)
```

---

## Common Test Commands

### Register & Get Token
```bash
export TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')
echo $TOKEN  # Verify token was saved
```

### Extract Values from JSON
```bash
# Get token from response
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"pass123"}' | jq -r '.token'

# Get all photo IDs
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/photos | jq '.photos[].id'
```

---

## Database Management

### Check Users
```bash
docker exec rapidphoto-postgres psql -U postgres -d rapidphoto_dev \
  -c "SELECT id, email, created_at FROM users ORDER BY created_at DESC;"
```

### Check Photos
```bash
docker exec rapidphoto-postgres psql -U postgres -d rapidphoto_dev \
  -c "SELECT id, status, original_filename FROM photos ORDER BY created_at DESC;"
```

### Check Batches
```bash
docker exec rapidphoto-postgres psql -U postgres -d rapidphoto_dev \
  -c "SELECT id, total_count, completed_count, failed_count FROM upload_batches;"
```

### Reset Single Table
```bash
docker exec rapidphoto-postgres psql -U postgres -d rapidphoto_dev \
  -c "DELETE FROM users;"
```

### Full Database Reset
```bash
docker exec rapidphoto-postgres dropdb -U postgres rapidphoto_dev
docker exec rapidphoto-postgres createdb -U postgres rapidphoto_dev
# Restart backend to recreate schema
```

---

## Testing Best Practices

- Use `jq` to format and filter JSON responses
- Test with `curl -s` (silent) to reduce noise
- Always verify `$TOKEN` is set before using it
- Save important values in variables for reuse
- Keep terminal tabs: Tab 1 (server), Tab 2 (tests), Tab 3 (database)
- Check server logs for DEBUG info when tests fail
- Create multiple test users to verify cross-user security

---

## Error Testing

### Invalid Credentials
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
# Expected: 400 Bad Request
```

### Missing Required Field
```bash
curl -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "photo.jpg"}'
# Expected: 400 Bad Request (missing fileSizeBytes)
```

### File Size Mismatch
```bash
# Initiate with claimed size of 1MB
# Upload only 100KB
# Complete with wrong size
# Expected: Error about file size mismatch
```

### Cross-User Access
```bash
# Create user1, get token1
# Create user2, get token2
# User1 uploads photo
# User2 tries to delete user1's photo with token2
# Expected: 400 (photo not found)
```

---

## Tips & Troubleshooting

**"Connection refused"**
- PostgreSQL not running: `docker-compose up -d`

**"Could not resolve placeholder"**
- Missing env var: `export JWT_SECRET=dev-key-minimum-64-chars`

**"Port 8080 already in use"**
- Kill existing process: `lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9`

**No response from curl**
- Check server is running: `curl http://localhost:8080/actuator/health`
- Check firewall/proxy

**S3 access errors**
- Verify AWS credentials: `aws s3 ls`
- Check bucket exists and CORS is enabled
- Verify environment variables are set

**Test file too large**
- Use smaller test files: `dd if=/dev/urandom of=/tmp/small.bin bs=1024 count=10`


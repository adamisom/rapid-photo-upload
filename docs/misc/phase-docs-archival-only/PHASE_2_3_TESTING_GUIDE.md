# Phase 2 & 3 Testing Guide

**Date**: November 8, 2025  
**Test Type**: Manual Integration Testing  
**Prerequisites**: Phase 1 complete, dev server running, AWS credentials configured

---

## Environment Setup

### 1. Start PostgreSQL (if not running)
```bash
docker-compose up -d postgres
# Verify connection:
psql -h localhost -U postgres -d rapidphoto_dev -c "SELECT version();"
```

### 2. Set Environment Variables
```bash
export JWT_SECRET="dev-secret-key-at-least-256-bits-long-for-testing"
export DB_PASSWORD="postgres"
export AWS_REGION="us-east-2"
export AWS_ACCESS_KEY_ID="your_access_key_here"
export AWS_SECRET_ACCESS_KEY="your_secret_access_key_here"
export AWS_S3_BUCKET="rapidphoto-test-bucket"
```

### 3. Create S3 Bucket
In AWS Console:
- Create bucket: `rapidphoto-test-bucket` (or your AWS_S3_BUCKET value)
- **IMPORTANT**: Enable CORS for the bucket
  - Add CORS Configuration:
    ```json
    [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
    ```

### 4. Start Backend
```bash
cd backend
./mvnw spring-boot:run
# Should see: "Started RapidPhotoApiApplication in X seconds"
```

### 5. Verify Health
```bash
curl -s http://localhost:8080/actuator/health | jq .
# Expected: {"status":"UP"}
```

---

## Phase 1 Verification (Prerequisite)

Before testing Phase 2 & 3, verify Phase 1 auth works:

### Test: Register User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123"
  }' | jq .

# Expected Response (200):
# {
#   "token": "eyJhbGc...",
#   "userId": "uuid-here",
#   "email": "testuser@example.com"
# }
```

**Save the token and userId** for upcoming tests:
```bash
# Set these for convenience
TOKEN="your_token_here"
USER_ID="your_user_id_here"
```

### Test: Login User
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123"
  }' | jq .

# Expected: Same response as register
```

---

## Phase 2: S3 Integration & Upload API Tests

### Test 2.1: Initiate Upload
**Endpoint**: `POST /api/upload/initiate`

```bash
curl -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "vacation-photo.jpg",
    "fileSizeBytes": 1024000,
    "contentType": "image/jpeg"
  }' | jq .

# Expected Response (200):
# {
#   "photoId": "uuid-for-photo",
#   "uploadUrl": "https://s3.amazonaws.com/...",
#   "expiresInMinutes": 30,
#   "batchId": "uuid-for-batch"
# }
```

**Save these for next steps**:
```bash
PHOTO_ID="photo_uuid_from_response"
BATCH_ID="batch_uuid_from_response"
UPLOAD_URL="presigned_url_from_response"
```

### Test 2.2: Upload File to S3 (Using Presigned URL)

**Create test file**:
```bash
# Create a small test image
dd if=/dev/urandom of=/tmp/test-image.bin bs=1024 count=100
# This creates a 100KB random file (note: not a valid image, but works for testing)
```

**Upload to presigned URL**:
```bash
curl -X PUT "${UPLOAD_URL}" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/tmp/test-image.bin \
  -v

# Expected: 200 OK (with ETag header in response)
# Save the ETag if needed:
# ETAG="value-from-response-header"
```

**Verify in S3**:
```bash
# List objects in bucket (using AWS CLI)
aws s3 ls s3://rapidphoto-test-bucket/ --recursive
# Should see: random-key-from-initiate.bin
```

### Test 2.3: Complete Upload
**Endpoint**: `POST /api/upload/complete/{photoId}`

```bash
curl -X POST http://localhost:8080/api/upload/complete/${PHOTO_ID} \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileSizeBytes": 102400
  }' | jq .

# Expected Response (200):
# {"status": "success"}
```

**Verify in database**:
```bash
psql -h localhost -U postgres -d rapidphoto_dev -c \
  "SELECT id, status, s3_key FROM photos WHERE id = '${PHOTO_ID}';"

# Expected:
# id                  | status  | s3_key
# uuid-here           | UPLOADED | user_id/timestamp_uuid_vacation-photo.jpg
```

### Test 2.4: Get Batch Status
**Endpoint**: `GET /api/upload/batch/{batchId}/status`

```bash
curl -X GET http://localhost:8080/api/upload/batch/${BATCH_ID}/status \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Expected Response (200):
# {
#   "batchId": "uuid-here",
#   "totalCount": 1,
#   "completedCount": 1,
#   "failedCount": 0,
#   "photos": [
#     {
#       "id": "photo_uuid",
#       "originalFilename": "vacation-photo.jpg",
#       "status": "UPLOADED",
#       "errorMessage": null,
#       "updatedAt": "2025-11-08T17:30:00"
#     }
#   ]
# }
```

### Test 2.5: Fail Upload (Simulate Failure)
**Endpoint**: `POST /api/upload/failed/{photoId}`

First, initiate another upload:
```bash
curl -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "failed-photo.jpg",
    "fileSizeBytes": 2048000,
    "contentType": "image/jpeg"
  }' | jq .

# Save new PHOTO_ID_2 for this test
PHOTO_ID_2="new_photo_id"
```

**Report failure**:
```bash
curl -X POST http://localhost:8080/api/upload/failed/${PHOTO_ID_2} \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "errorMessage": "Network timeout during upload"
  }' | jq .

# Expected Response (200):
# {"status": "success"}
```

**Verify failure recorded**:
```bash
curl -X GET http://localhost:8080/api/upload/batch/${BATCH_ID}/status \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Expected: failedCount should be 1
```

### Test 2.6: Invalid Upload Requests

**Missing required field**:
```bash
curl -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "photo.jpg"
    # Missing fileSizeBytes and contentType
  }'

# Expected Response (400): Validation error
```

**Unauthorized request (no token)**:
```bash
curl -X POST http://localhost:8080/api/upload/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "photo.jpg",
    "fileSizeBytes": 1024000,
    "contentType": "image/jpeg"
  }'

# Expected Response (401): Unauthorized
```

---

## Phase 3: Photo Query API Tests

### Test 3.1: List Photos (Pagination)
**Endpoint**: `GET /api/photos`

```bash
curl -X GET "http://localhost:8080/api/photos?page=0&pageSize=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Expected Response (200):
# {
#   "photos": [
#     {
#       "id": "photo_uuid",
#       "originalFilename": "vacation-photo.jpg",
#       "fileSizeBytes": 102400,
#       "downloadUrl": "https://s3.amazonaws.com/...",
#       "uploadedAt": "2025-11-08T17:30:00"
#     }
#   ],
#   "pageNumber": 0,
#   "pageSize": 10,
#   "totalCount": 1
# }
```

**Verify downloadUrl works**:
```bash
# Extract downloadUrl from response and test it
DOWNLOAD_URL="url-from-response"

curl -X GET "${DOWNLOAD_URL}" -o /tmp/downloaded-file.bin -v
# Expected: 200 OK with file content
```

### Test 3.2: Get Single Photo
**Endpoint**: `GET /api/photos/{photoId}`

```bash
curl -X GET http://localhost:8080/api/photos/${PHOTO_ID} \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Expected Response (200):
# {
#   "id": "photo_uuid",
#   "originalFilename": "vacation-photo.jpg",
#   "fileSizeBytes": 102400,
#   "downloadUrl": "https://s3.amazonaws.com/...",
#   "uploadedAt": "2025-11-08T17:30:00"
# }
```

### Test 3.3: Delete Photo
**Endpoint**: `DELETE /api/photos/{photoId}`

```bash
curl -X DELETE http://localhost:8080/api/photos/${PHOTO_ID} \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Expected Response (200):
# {"status": "success"}
```

**Verify deletion**:
```bash
# Try to get the photo again
curl -X GET http://localhost:8080/api/photos/${PHOTO_ID} \
  -H "Authorization: Bearer ${TOKEN}"

# Expected: 400 or 404 (Photo not found)
```

**Verify S3 deletion**:
```bash
aws s3 ls s3://rapidphoto-test-bucket/ --recursive
# The deleted file should no longer be listed
```

### Test 3.4: Pagination Tests

**Create multiple photos for pagination testing**:
```bash
# Initiate and complete 25 uploads to test pagination
for i in {1..25}; do
  RESPONSE=$(curl -s -X POST http://localhost:8080/api/upload/initiate \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"filename\": \"photo-${i}.jpg\",
      \"fileSizeBytes\": $((1024 * (i + 1))),
      \"contentType\": \"image/jpeg\"
    }")
  
  PHOTO_ID=$(echo $RESPONSE | jq -r '.photoId')
  UPLOAD_URL=$(echo $RESPONSE | jq -r '.uploadUrl')
  
  # Create dummy file and upload
  dd if=/dev/urandom of=/tmp/test-${i}.bin bs=1024 count=$((i+1)) 2>/dev/null
  curl -s -X PUT "${UPLOAD_URL}" --data-binary @/tmp/test-${i}.bin > /dev/null
  
  # Complete upload
  curl -s -X POST http://localhost:8080/api/upload/complete/${PHOTO_ID} \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"fileSizeBytes": '$((1024 * (i + 1)))'}'
  
  echo "Completed photo ${i}"
done
```

**Test page 0 (default 20 items)**:
```bash
curl -X GET "http://localhost:8080/api/photos?page=0&pageSize=20" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.totalCount'

# Expected: 25
```

**Test page 1 (items 20-24)**:
```bash
curl -X GET "http://localhost:8080/api/photos?page=1&pageSize=20" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.photos | length'

# Expected: 5 (remaining items)
```

**Test custom page size**:
```bash
curl -X GET "http://localhost:8080/api/photos?page=0&pageSize=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.photos | length'

# Expected: 5
```

### Test 3.5: Cross-User Security

**Create second user**:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "otheruser@example.com",
    "password": "OtherPassword123"
  }' | jq .

TOKEN_USER2="token-from-response"
```

**Verify user 1 can't see user 2's photos**:
```bash
curl -X GET "http://localhost:8080/api/photos" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.photos'

# Should only show photos from USER_ID (testuser@example.com)
```

**Verify user 2 can't delete user 1's photos**:
```bash
curl -X DELETE http://localhost:8080/api/photos/${PHOTO_ID} \
  -H "Authorization: Bearer ${TOKEN_USER2}"

# Expected: 400 (Photo not found - security check)
```

---

## Error Scenario Testing

### Test: Verify File Size Mismatch Detection
```bash
# Initiate upload claiming 1MB
curl -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "mismatch-photo.jpg",
    "fileSizeBytes": 1048576,
    "contentType": "image/jpeg"
  }' | jq .

PHOTO_ID_MISMATCH="photo_id_here"
UPLOAD_URL_MISMATCH="upload_url_here"

# Upload only 100KB
dd if=/dev/urandom of=/tmp/small.bin bs=1024 count=100
curl -s -X PUT "${UPLOAD_URL_MISMATCH}" --data-binary @/tmp/small.bin

# Try to complete with wrong size
curl -X POST http://localhost:8080/api/upload/complete/${PHOTO_ID_MISMATCH} \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileSizeBytes": 102400
  }' | jq .

# Expected: Error response about file size mismatch
# Photo status should be FAILED
```

### Test: Verify File Not Found in S3
```bash
# Initiate upload
curl -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "never-uploaded.jpg",
    "fileSizeBytes": 1024000,
    "contentType": "image/jpeg"
  }' | jq .

PHOTO_ID_NOTFOUND="photo_id_here"

# Try to complete WITHOUT uploading to S3
curl -X POST http://localhost:8080/api/upload/complete/${PHOTO_ID_NOTFOUND} \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileSizeBytes": 1024000
  }' | jq .

# Expected: Error response about file not found in S3
# Photo status should be FAILED
```

---

## Database Verification

### Check all tables created correctly
```bash
psql -h localhost -U postgres -d rapidphoto_dev -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
"

# Expected tables: photos, upload_batches, users
```

### Check photo data
```bash
psql -h localhost -U postgres -d rapidphoto_dev -c "
  SELECT id, user_id, status, original_filename, file_size_bytes 
  FROM photos 
  ORDER BY created_at DESC 
  LIMIT 10;
"
```

### Check batch data
```bash
psql -h localhost -U postgres -d rapidphoto_dev -c "
  SELECT id, user_id, total_count, completed_count, failed_count 
  FROM upload_batches 
  ORDER BY created_at DESC;
"
```

---

## Performance Notes

- **Presigned URLs**: Default 30-minute expiration
- **Download URLs**: Default 1-hour expiration
- **Pagination**: Default 20 items per page
- **S3 Operations**: Should be < 100ms for presigned URL generation
- **Database Queries**: Indexed on user_id and batch_id

---

## Checklist: All Tests Should Pass ✅

### Phase 2 Tests
- [ ] Test 2.1: Initiate upload returns presigned URL
- [ ] Test 2.2: File upload to S3 succeeds
- [ ] Test 2.3: Complete upload updates photo status
- [ ] Test 2.4: Batch status shows accurate counts
- [ ] Test 2.5: Fail upload records error
- [ ] Test 2.6: Invalid requests return 400
- [ ] Test 2.6b: Unauthorized requests return 401

### Phase 3 Tests
- [ ] Test 3.1: List photos with pagination works
- [ ] Test 3.1b: Download URLs are valid
- [ ] Test 3.2: Get single photo works
- [ ] Test 3.3: Delete photo removes from S3 and DB
- [ ] Test 3.4: Pagination works correctly
- [ ] Test 3.5: Cross-user security validated

### Error Scenarios
- [ ] File size mismatch detection works
- [ ] File not found in S3 detection works

### Database
- [ ] All tables created
- [ ] Photo and batch records correct

---

## Troubleshooting

### Issue: "Unable to locate a Java Runtime"
**Solution**: Ensure Java 17+ is installed
```bash
java -version
```

### Issue: S3 connection error
**Solution**: Verify AWS credentials and bucket exists
```bash
aws s3 ls --profile default
```

### Issue: CORS error when uploading to presigned URL
**Solution**: Ensure S3 bucket CORS is configured (see Setup step 3)

### Issue: "User not authenticated"
**Solution**: Ensure TOKEN is valid and not expired
```bash
# Get new token
curl -X POST http://localhost:8080/api/auth/login ...
```

### Issue: "Photo not found" when deleting
**Solution**: Verify photoId belongs to current user

---

## Next Steps After Testing

1. ✅ All Phase 2 & 3 tests pass
2. Document any bugs found
3. Fix bugs if critical
4. Commit test results
5. Consider Phase 4+ (mobile/web client)



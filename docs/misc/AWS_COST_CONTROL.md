# AWS Cost Control - Implementation & Testing

## Overview

Prevent runaway AWS bills with hard limits enforced server-side:

| Limit Type | Value | Error Message |
|------------|-------|---------------|
| **Max Users** | 50 total users | "Can't register more users at this time" |
| **Max Photos** | 1,500 total photos | "You've reached your image limit" |
| **Max Storage** | 500 MB total | "You've reached your image limit" |
| **Max File Size** | 100 MB per file | "Image too large (max 100 MB)" |

All limits are checked **before** any AWS costs are incurred (presigned URLs aren't even generated if limits are hit).

---

## Implementation Details

### Backend Architecture

#### 1. LimitsService.java
Centralized service for all limit checks:

```java
// backend/src/main/java/com/rapid/infrastructure/service/LimitsService.java
@Service
public class LimitsService {
    private static final int MAX_USERS = 50;
    private static final int MAX_PHOTOS = 1500;
    private static final long MAX_TOTAL_BYTES = 500L * 1024 * 1024; // 500 MB
    private static final long MAX_FILE_BYTES = 100L * 1024 * 1024;  // 100 MB
    
    public void checkUserLimit() throws LimitExceededException;
    public void checkPhotoLimit() throws LimitExceededException;
    public void checkStorageLimit() throws LimitExceededException;
    public void checkFileSizeLimit(long bytes) throws LimitExceededException;
}
```

#### 2. LimitExceededException.java
Custom exception with limit type:

```java
public class LimitExceededException extends RuntimeException {
    private final String limitType;
    
    public LimitExceededException(String message, String limitType) {
        super(message);
        this.limitType = limitType;
    }
}
```

#### 3. GlobalExceptionHandler.java
Returns HTTP 429 (Too Many Requests):

```java
@ExceptionHandler(LimitExceededException.class)
public ResponseEntity<?> handleLimitExceeded(LimitExceededException ex) {
    return ResponseEntity.status(429)
        .body(Map.of("error", ex.getMessage(), "type", ex.getLimitType()));
}
```

#### 4. AuthService.java
Check user limit before registration:

```java
public AuthResponse register(RegisterRequest request) {
    limitsService.checkUserLimit();  // Check limit first
    // ... rest of registration logic
}
```

#### 5. UploadCommandService.java
Check all limits before upload:

```java
public InitiateUploadResponse initiateUpload(String userId, InitiateUploadRequest request) {
    limitsService.checkFileSizeLimit(request.getFileSizeBytes());  // Immediate check
    limitsService.checkPhotoLimit();                                // Count check
    limitsService.checkStorageLimit();                              // Storage check
    // ... rest of upload logic
}
```

#### 6. PhotoRepository.java
Query for total storage:

```java
@Query("SELECT SUM(p.fileSizeBytes) FROM Photo p")
Long sumFileSizeBytes();
```

---

## Testing Guide

### 1. Test File Size Limit (100 MB)

**Create a 101 MB test file:**
```bash
cd /Users/adamisom/Desktop/rapid-photo-upload
dd if=/dev/zero of=test-101mb.bin bs=1m count=101
```

**Try to upload it via web UI:**
- Should immediately fail with: **"Image too large (max 100 MB)"**
- HTTP 429 response

### 2. Test User Limit (50 users)

**Create test script:**
```bash
#!/bin/bash
# Create 51 users to test limit

for i in {1..51}; do
  echo "Creating user $i..."
  curl -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"testuser${i}@example.com\",\"password\":\"password123\"}"
  echo ""
done
```

**Expected:**
- Users 1-50: Success (201 Created)
- User 51: **"Can't register more users at this time"** (429)

### 3. Test Photo Limit (1,500 photos)

**Use load test script modified:**
```bash
# Run load-test.sh 15 times (100 photos × 15 = 1,500)
for i in {1..15}; do
  echo "Batch $i of 15..."
  ./scripts/load-test.sh
done

# Try one more upload
curl -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","fileSizeBytes":50000,"contentType":"image/jpeg"}'
```

**Expected:**
- First 1,500: Success
- Upload 1,501: **"You've reached your image limit"** (429)

### 4. Test Storage Limit (500 MB)

**Calculate current storage:**
```sql
-- Connect to PostgreSQL
docker exec -it rapid-photo-upload-postgres-1 psql -U rapid -d rapid

-- Check total storage
SELECT 
  COUNT(*) as photo_count,
  SUM(file_size_bytes) as total_bytes,
  ROUND(SUM(file_size_bytes) / 1024.0 / 1024.0, 2) as total_mb
FROM photos;
```

**Upload until 500 MB reached:**
```bash
# Use the 12 large pexels_* files (1-3MB each)
# Upload repeatedly until ~500 MB reached
```

**Expected:**
- Uploads succeed until total reaches 500 MB
- Next upload: **"You've reached your image limit"** (429)

### 5. Manual Testing via Web UI

**Test 100 MB file limit:**
1. Download a large image (> 100 MB) or create one:
   ```bash
   # Create 101 MB test image
   convert -size 10000x10000 xc:white test-large.jpg
   ```
2. Try to upload via web UI
3. Should see error: **"Image too large (max 100 MB)"**

**Test photo/storage limits:**
1. Use `100-test-images/` folder
2. Upload batches of 100 until limit hit
3. Should see error: **"You've reached your image limit"**

---

## Frontend Error Handling (TODO)

The frontend (web & mobile) needs to handle HTTP 429 responses:

```typescript
// Example error handling
try {
  await uploadService.initiateUpload(file);
} catch (error) {
  if (error.response?.status === 429) {
    const limitType = error.response.data.limitType;
    const message = error.response.data.error.message;
    
    // Display user-friendly error
    if (limitType === 'FILE_SIZE') {
      alert('Image too large (max 100 MB)');
    } else if (limitType === 'USER_LIMIT') {
      alert("Can't register more users at this time");
    } else {
      alert("You've reached your image limit");
    }
  }
}
```

---

## Monitoring & Maintenance

### Check Current Usage

```sql
-- User count
SELECT COUNT(*) FROM users;

-- Photo count
SELECT COUNT(*) FROM photos;

-- Storage usage
SELECT 
  SUM(file_size_bytes) / 1024.0 / 1024.0 as storage_mb,
  500 - (SUM(file_size_bytes) / 1024.0 / 1024.0) as remaining_mb
FROM photos;
```

### Reset Limits for Testing

**Clear all users:**
```sql
TRUNCATE users CASCADE;
```

**Clear all photos:**
```bash
./backend/scripts/delete-all-photos.sh
```

**Reset database completely:**
```bash
docker-compose down -v
docker-compose up -d
cd backend
mvn spring-boot:run
```

### Production Adjustments

To change limits, edit `LimitsService.java`:

```java
private static final int MAX_USERS = 50;        // Change here
private static final int MAX_PHOTOS = 1500;     // Change here
private static final long MAX_TOTAL_BYTES = 500L * 1024 * 1024;  // Change here
private static final long MAX_FILE_BYTES = 100L * 1024 * 1024;   // Change here
```

Then rebuild:
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

---

## Status

**Completed:**
- ✅ Backend limits implemented
- ✅ Exception handling with HTTP 429
- ✅ README.md updated with prominent table
- ✅ Testing guide created

**TODO:**
- ⏳ Add frontend error handling (web + mobile)
- ⏳ Test all 4 limit types
- ⏳ Display usage stats in UI (optional)


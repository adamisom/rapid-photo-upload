# 🧪 Testing Guide - All Phases

Comprehensive reference for testing RapidPhotoUpload across all implementation phases.

**Current Status**: All Phases Complete ✅ (Backend + Web + Mobile + Load Testing + Documentation)

---

## 📚 **Quick Links to Documentation**

Before testing, review these focused guides:
- **[ARCHITECTURE_DETAILS.md](ARCHITECTURE_DETAILS.md)** - DDD, CQRS, VSA patterns explained
- **[TECHNICAL_WRITEUP.md](TECHNICAL_WRITEUP.md)** - Design decisions and system architecture
- **[AI_TOOLS_USED.md](AI_TOOLS_USED.md)** - Development process and bugs fixed

---

## Quick Setup

### 1. Start PostgreSQL
```bash
docker-compose up -d
```

### 2. Set Environment Variables
```bash
export JWT_SECRET="your-minimum-64-character-jwt-secret-key-for-hs512"
export AWS_REGION="us-east-2"  # Must match your S3 bucket's region
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

**Or simpler** (pipe directly to jq):
```bash
export TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPassword123"}' | jq -r '.token')

echo "✅ Token: $TOKEN"
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
# All-in-one: Fetch and export PHOTO_ID, BATCH_ID, UPLOAD_URL
RESPONSE=$(curl -s -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test-photo.jpg","fileSizeBytes":102400,"contentType":"image/jpeg"}') && \
export PHOTO_ID=$(echo $RESPONSE | jq -r '.photoId') && \
export BATCH_ID=$(echo $RESPONSE | jq -r '.batchId') && \
export UPLOAD_URL=$(echo $RESPONSE | jq -r '.uploadUrl') && \
echo "✅ PHOTO_ID: $PHOTO_ID" && \
echo "✅ BATCH_ID: $BATCH_ID" && \
echo "✅ UPLOAD_URL: $UPLOAD_URL"
```

**Expected**: 200 OK with presigned PUT URL and all 3 variables exported

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

---

# PHASE 4: Web Frontend (React UI)

## Quick Frontend Smoke Test (5 minutes)

### 1. Start Frontend Dev Server
```bash
cd web
npm install  # if not done yet
npm run dev
```

**Expected**: Vite ready at `http://localhost:5173`

### 2. Test Registration
1. Open http://localhost:5173 → should redirect to /login
2. Click "Sign up" → RegisterPage
3. Fill form:
   - Email: `test@example.com`
   - Password: `TestPass123`
   - Confirm: `TestPass123`
4. Submit → should redirect to /upload
5. Check browser localStorage: should have `token`, `userId`, `email`

### 3. Test Login
1. Click "Sign Out" in header
2. Should redirect to /login
3. Fill login form with credentials from step 2
4. Submit → should redirect to /upload

### 4. Test Upload Flow
1. On /upload page:
   - Drag test image files, or
   - Click drop zone to browse
2. Select 2-3 image files from `100-test-images/` folder
3. See file list with progress bars
4. Click "Start Upload"
5. Watch progress (byte-based % with ETA)
6. Expected: All files complete with success banner

### 5. Test Photo Tagging (NEW)
1. Go to http://localhost:5173/gallery
2. Select a photo
3. Add tags:
   - Type tag name (max 50 chars)
   - See autocomplete suggestions from your existing tags
   - Click "+" or press Enter
   - Max 3 tags per photo
4. Remove tags:
   - Click ✕ on any tag badge
5. Test validation:
   - Try adding 4th tag → See inline error
   - Try empty tag → See inline error

### 6. Test Upload Features
1. **Batch History**: Upload files → See "Last Batch" section appear
2. **Retry Failed**: Stop backend mid-upload → Click retry button on failed files
3. **Remove All**: Select 10 files → Click "Remove All" button
4. **Concurrency Tip**: Select 6+ files → See tip above "Start Upload" button

### 7. Verify Quality
```bash
npm run type-check  # Should pass
npm run lint        # Should pass
npm run build       # Should build successfully
```

---

# PHASE 5: Photo Gallery (Web)

## Quick Gallery Smoke Test (3 minutes)

### 1. Upload Photos First
1. Go to http://localhost:5173/upload
2. Select and upload 2-3 photos to backend
3. Wait for completion

### 2. Test Gallery Page
1. Click "Gallery" in header navigation
2. Should see photo grid (responsive 2-3 columns)
3. Photos display thumbnails
4. See filename, file size, and tags below each photo

### 3. Test Photo Actions
1. **Download**: Click photo → Opens in new tab
2. **Tagging**: 
   - Add up to 3 tags per photo
   - Autocomplete suggests existing tags
   - Inline validation errors
3. **Delete**: Click delete button → Shows confirmation dialog
   - Click "Cancel" → Dialog closes, photo remains
   - Click "Delete" → Photo deleted, list updates
4. **Pagination**: If > 20 photos, test Previous/Next buttons

### 4. Test Error Handling
1. Stop backend: `Ctrl+C` in backend terminal
2. Refresh gallery: Should show error message
3. Start backend again
4. Click refresh (pull-down) → Photos load

### 5. Verify Quality
```bash
npm run type-check  # Should pass
npm run lint        # Should pass
npm run build       # Should build successfully
npm test            # Run unit tests
```

---

# PHASE 6: React Native Mobile

## Prerequisites for Mobile Testing

1. **Expo Go app** on iPhone (download from App Store)
2. **Backend running**: `cd backend && mvn spring-boot:run`
3. **Mac & iPhone on same WiFi** (or use tunnel mode)

---

## Quick Mobile Smoke Test (5 minutes with Expo Go)

### Step 1: Setup Environment

**Option A: Same WiFi (Recommended)**
```bash
# Find your Mac's IP address
ifconfig | grep "inet " | grep -v 127.0.0.1

cd mobile

# Create .env file
cat > .env << EOF
EXPO_PUBLIC_API_BASE_URL=http://YOUR_MAC_IP:8080
EOF
# Replace YOUR_MAC_IP with actual IP (e.g., 192.168.1.100)
```

**Option B: Tunnel Mode (Works anywhere)**
```bash
cd mobile
npm run start:tunnel
# No .env needed - creates public tunnel
```

### Step 2: Start Dev Server
```bash
cd mobile
npm run start:go
# Expo Go QR code will appear in terminal
```

### Step 3: Scan QR Code on iPhone
1. Open **Expo Go** app on iPhone
2. Tap **Scan QR code**
3. Point camera at terminal QR code
4. App loads automatically! 🎉

### Step 4: Test Authentication Flow
1. **Register**: 
   - Tap "Create Account"
   - Fill: email, password, confirm password
   - Tap "Register" → Should go to Gallery tab
   
2. **Login** (different session):
   - Kill app (swipe up)
   - Reopen and restart dev server
   - Tap "Login"
   - Use credentials from step 1
   - Submit → Should go to Gallery

### Step 5: Test Upload Flow
1. Tap **Upload** tab
2. Tap **"Select Photos"** button
3. Choose 2-3 photos from camera roll
4. See list of files with size
5. Tap **"Upload All"**
6. Watch progress bars (individual + total)
7. Status changes: uploading → completed ✓

### Step 6: Test Gallery
1. Tap **Gallery** tab
2. Should see uploaded photos in 2-column grid
3. Tap photo → Opens in browser/viewer
4. Tap delete → Shows confirmation
   - "Cancel" → Dialog closes
   - "Delete" → Photo removed, list updates
5. If > 20 photos → Test pagination (Previous/Next)

### Step 7: Test Profile & Logout
1. Tap **Profile** tab
2. See user email with avatar initial
3. Tap **"Logout"** button
4. Confirmation dialog → Tap "Logout"
5. Should redirect to login screen ✓

### Step 8: Verify Quality
```bash
cd mobile
npm run lint    # Should pass (0 issues)
```

---

## Alternative Testing Methods

### Method 2: Tunnel Mode (No WiFi needed)
```bash
cd mobile
npm run start:tunnel
# Scan QR code from terminal (works over cellular)
```

### Method 3: Manual URL Entry
```bash
cd mobile
npm start
# Get URL from terminal output
# In Expo Go: Tap "Explore" → "Enter URL manually"
# Paste the URL
```

---

## Troubleshooting Mobile Tests

| Issue | Solution |
|-------|----------|
| "Cannot connect to server" | Verify Mac & iPhone on same WiFi, check firewall |
| "Blank white screen" | Check terminal for errors, restart dev server |
| "API error on upload" | Verify backend is running, check `.env` API URL |
| "Photos not loading" | Backend down, check: `curl http://localhost:8080/actuator/health` |
| "QR code won't scan" | Use Method 2 (tunnel mode) or Method 3 (manual URL) |
| "App keeps reloading" | Run `npm run lint` to check for TS errors |

---

# PHASE 7: Load Testing & Production Readiness

## Automated Load Test Script

Test system performance with 100 concurrent uploads:

```bash
# Clean database first
./backend/scripts/delete-all-photos.sh

# Run load test (100 photos × 2MB)
./scripts/load-test.sh

# Custom load test
./scripts/load-test.sh 50 1    # 50 photos × 1MB
./scripts/load-test.sh 200 5   # 200 photos × 5MB
```

**Requirements**:
- `jq` installed: `brew install jq`
- Backend running on `localhost:8080`
- PostgreSQL and S3 configured

**What it tests**:
- 10 concurrent upload initiations (100 presigned URLs in <90s)
- Parallel S3 uploads (10 at a time)
- Database integrity (batch status, photo records)
- End-to-end upload flow
- Atomic batch creation (no race conditions)

**Expected Results**:
- ✅ All 100 photos uploaded successfully
- ✅ Batch status shows correct counts
- ✅ All files exist in S3
- ✅ Total time: 20-40 seconds (depends on network)

---

## Pre-Deployment Checklist

Before deploying to production, run these final verification steps:

### 1. Code Quality (10 minutes)

```bash
# Backend
cd backend && ./mvnw clean test

# Web Frontend
cd web && npm run lint && npm run type-check && npm run build

# Mobile
cd mobile && npm run lint
```

**Expected**: All passing ✅ (0 errors/warnings)

### 2. Manual Integration Tests (15 minutes)

#### Backend Health
```bash
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

#### Web Frontend Testing
1. Register new account → Should redirect to upload
2. Upload 3 photos → Should show progress & success
3. Gallery → Should display thumbnails
4. Delete photo → Should remove from list
5. Logout → Should redirect to login

#### Mobile Testing (Expo Go)
1. Start dev server: `cd mobile && npm run start:go`
2. Scan QR code on iPhone
3. Register → Upload → Gallery → Delete → Logout
4. All should work smoothly 📱

### 3. Security Verification (5 minutes)

```bash
# Verify JWT_SECRET is set and secure (min 64 chars)
echo $JWT_SECRET | wc -c  # Should be > 64

# Verify S3 credentials
aws s3 ls  # Should list your buckets

# Verify database is running
docker-compose ps  # Should show postgres UP
```

### 4. Performance Baseline (5 minutes)

```bash
# Test response times
time curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"perf@test.com","password":"TestPass123"}' | jq .

# Expected: < 500ms
```

### 5. End-to-End Upload Test (10 minutes)

1. **Register**: Create test account
2. **Upload 5 photos**: Monitor upload speed
3. **Verify database**: Check photos table has 5 records
4. **Check S3**: Verify files are in bucket
5. **Download**: Click photo in gallery to verify download URL works
6. **Delete**: Remove a photo, verify it's gone

---

## Production Deployment Steps

### 1. Database Migration

```bash
# Export current database
pg_dump -h localhost -U postgres rapidphoto_dev > backup.sql

# On production server:
# Create fresh database
createdb -U postgres rapidphoto

# Import schema (backend will auto-create on startup)
```

### 2. Environment Configuration

Create `.env` on production server:
```bash
JWT_SECRET="production-secret-key-minimum-64-chars-long-12345"
AWS_REGION="us-east-2"
AWS_ACCESS_KEY_ID="your-production-key"
AWS_SECRET_ACCESS_KEY="your-production-secret"
AWS_S3_BUCKET="your-production-bucket"
SPRING_DATASOURCE_URL="jdbc:postgresql://prod-db:5432/rapidphoto"
SPRING_DATASOURCE_USERNAME="postgres"
SPRING_DATASOURCE_PASSWORD="secure-password"
```

### 3. Backend Deployment

```bash
cd backend
./mvnw clean package
# Deploy JAR to server
scp target/rapidphoto-api.jar user@prod-server:/app/
ssh user@prod-server "java -jar /app/rapidphoto-api.jar"
```

### 4. Web Frontend Deployment

```bash
cd web
npm run build
# Deploy dist folder to CDN or web server
scp -r dist/* user@cdn:/var/www/html/
```

### 5. Mobile App Deployment

```bash
# Build for iOS App Store
cd mobile
eas build --platform ios

# Build for Google Play Store
eas build --platform android

# Follow Expo/EAS documentation for app store submission
```

---

## Post-Deployment Verification

### Day 1 Checklist

- [ ] Backend is responding: `curl https://api.yourdomain.com/actuator/health`
- [ ] Web frontend loads: `https://yourdomain.com`
- [ ] Can register new account
- [ ] Can upload photos
- [ ] Photos appear in gallery
- [ ] Can download photos
- [ ] Can delete photos
- [ ] Mobile app works (if built)
- [ ] Check server logs for errors

### Ongoing Monitoring

- Monitor API response times (target < 200ms)
- Monitor upload success rate (target > 99%)
- Monitor database connection pool
- Set up error tracking (Sentry/DataDog)
- Regular backups (daily)
- Monitor S3 costs and quota

---

## Common Production Issues & Fixes

**Issue**: "Cannot connect to backend"
- **Fix**: Verify backend is running, check firewall/security groups, verify DNS

**Issue**: "Upload fails with 500 error"
- **Fix**: Check server logs, verify S3 credentials, verify database connectivity

**Issue**: "Photos not loading in gallery"
- **Fix**: Verify S3 bucket CORS, check download URLs, verify presigned URL hasn't expired

**Issue**: "High memory usage"
- **Fix**: Increase heap size, monitor for file upload leaks, check database queries

---

## Full Production Readiness Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Backend | ✅ Ready | All tests pass, error handling comprehensive |
| Web | ✅ Ready | Vite optimized, 0 linting issues |
| Mobile | ✅ Ready | Works on Expo Go, ready for app store build |
| Database | ✅ Ready | Indexed, backed up, scalable |
| S3 | ✅ Ready | CORS configured, presigned URLs working |
| Security | ✅ Ready | JWT auth, https-ready, secrets managed |
| Docs | ✅ Ready | Comprehensive guides included |

**RapidPhotoUpload is production-ready!** 🚀

See `PHASE_7_PRODUCTION_GUIDE.md` for detailed deployment & scaling strategies.

---


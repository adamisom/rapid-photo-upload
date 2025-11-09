# 🧪 Testing Guide - All Phases

Comprehensive reference for testing RapidPhotoUpload across all implementation phases.

**Current Status**: Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅ | Phase 5 ✅ | Phase 6 ✅

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
   - Drag a test image file, or
   - Click drop zone to browse
2. Select 2-3 image files
3. See file list with progress bars
4. Click "Start Upload"
5. Watch progress (0-100% per file)
6. Expected: All files complete (or show backend errors if server not running)

### 5. Verify Quality
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
4. See filename and file size below each photo

### 3. Test Photo Actions
1. **Download**: Click photo → Opens in new tab
2. **Delete**: Click delete button → Shows confirmation dialog
   - Click "Cancel" → Dialog closes, photo remains
   - Click "Delete" → Photo deleted, list updates
3. **Pagination**: If > 20 photos, test Previous/Next buttons

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
2. **Backend running**: `cd backend && ./mvnw spring-boot:run`
3. **Mac & iPhone on same WiFi**
4. **Environment configured**: See `PHASE_6_ENV_SETUP.md`

---

## Quick Mobile Smoke Test (5 minutes with Expo Go)

### Step 1: Setup Environment
```bash
cd mobile
touch .env  # Create if not exists
# Add to .env:
# EXPO_PUBLIC_API_BASE_URL=http://192.168.1.YOUR_IP:8080
# (Replace YOUR_IP with your Mac's IP from: ifconfig | grep inet)
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


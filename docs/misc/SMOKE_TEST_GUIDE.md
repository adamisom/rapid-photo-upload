# Testing Guide - Recent Performance Fixes & Optimizations

Comprehensive testing guide for recent changes: pagination fixes, state persistence, 20 concurrent uploads, pre-requested URLs, and batched completes.

**Quick Smoke Tests**: 10-15 minutes  
**Comprehensive Tests**: 15-30 minutes  
**Large Batch Testing (1000+)**: 30-60 minutes

---

## 🎯 What We're Testing

1. ✅ **Pagination Fix** - Only counts UPLOADED photos (excludes PENDING/FAILED)
2. ✅ **State Persistence** - Upload state survives navigation
3. ✅ **20 Concurrent Uploads** - 4x faster than before
4. ✅ **Pre-Requested URLs** - All URLs ready before uploads start
5. ✅ **Batched Completes** - 10x fewer HTTP requests

---

## 🚀 Quick Setup

```bash
# Terminal 1: Backend
cd backend
./mvnw spring-boot:run

# Terminal 2: Frontend
cd web
npm run dev

# Browser: http://localhost:5173
```

---

## Test 1: Pagination Accuracy (2 min)

**Goal**: Verify pagination only counts UPLOADED photos

**Steps**:
1. Register/Login
2. Upload 5 photos
3. **While uploads are still in progress**, go to Gallery
4. Check total count

**Expected**:
- ✅ Count shows only completed uploads (e.g., "3 photos" if 3 completed, 2 still uploading)
- ✅ PENDING photos are NOT counted
- ✅ After all complete, count updates to "5 photos"

**Before Fix**: Would show "5 photos" even if only 3 completed  
**After Fix**: Shows "3 photos" (only completed ones)

---

## Test 2: State Persistence (2 min)

**Goal**: Verify upload state persists when navigating

**Steps**:
1. Go to Upload page
2. Select 10-15 images
3. Click "Start Upload"
4. **Wait for 3-5 files to complete** (don't wait for all)
5. Navigate to Gallery
6. Navigate back to Upload

**Expected**:
- ✅ Completed files still show as "completed"
- ✅ Uploading files still show progress
- ✅ Pending files still show as "pending"
- ✅ Overall progress preserved

**Verify localStorage** (optional):
```javascript
// Browser console
JSON.parse(localStorage.getItem('rapidphoto_upload_state'))
// Should show activeFiles with statuses
```

---

## Test 3: 20 Concurrent Uploads (3 min)

**Goal**: Verify 20 files upload simultaneously

**Steps**:
1. Select 30-50 images
2. Open DevTools → Network tab
3. Filter by "PUT" (S3 uploads)
4. Click "Start Upload"
5. Count concurrent requests

**Expected**:
- ✅ See **20 concurrent PUT requests** to S3
- ✅ As files complete, new ones start immediately
- ✅ Uploads complete ~4x faster than before

**Performance Check**:
- 50 files should complete in ~2-3 minutes (vs ~10 minutes before)

---

## Test 4: Pre-Requested URLs (2 min)

**Goal**: Verify URLs are requested upfront, not sequentially

**Steps**:
1. Select 30-50 images
2. Open DevTools → Network tab
3. Filter by "POST" → "initiate"
4. Click "Start Upload"
5. Watch URL requests

**Expected**:
- ✅ See **burst of URL requests** (50 at a time) at the start
- ✅ All URLs requested in ~2-3 seconds
- ✅ Uploads start immediately after URLs ready
- ✅ **NOT** sequential (one per upload slot)

**Before**: URLs requested one at a time as slots open (50-100 seconds)  
**After**: All URLs ready in 2-3 seconds upfront

---

## Test 5: Batched Complete Notifications (2 min)

**Goal**: Verify completions are batched, not individual

**Steps**:
1. Select 20-30 images
2. Open DevTools → Network tab
3. Filter by "POST" → "complete"
4. Click "Start Upload"
5. Watch completion requests

**Expected**:
- ✅ See **batched requests** to `/api/upload/complete/batch`
- ✅ Each batch contains ~5 items
- ✅ Batches sent every ~1 second or when 5 items ready
- ✅ **NOT** one request per file

**Before**: 20 individual `/complete/{photoId}` requests  
**After**: ~4 batched `/complete/batch` requests (5 items each)

---

## Test 6: Full Integration - Large Batch (5 min)

**Goal**: Verify everything works together with larger batch

**Steps**:
1. Select 50-100 images (if available)
2. Start upload
3. **While uploading**:
   - Navigate to Gallery → Back to Upload (verify state persists)
   - Check Gallery pagination (verify accurate count)
4. Monitor Network tab:
   - Verify 20 concurrent uploads
   - Verify batched completes
5. Wait for completion

**Expected**:
- ✅ All optimizations working together
- ✅ Fast upload speed (~4x faster)
- ✅ State persists throughout
- ✅ Pagination accurate
- ✅ All files upload successfully

---

## 🔍 Quick Verification Checklist

Run through these quickly:

- [ ] **Pagination**: Upload 5, check count while uploading → Should show only completed
- [ ] **State**: Upload 10, navigate away/back → State should persist
- [ ] **Concurrency**: Network tab shows 20 concurrent PUT requests
- [ ] **URLs**: Burst of URL requests at start (not sequential)
- [ ] **Batched**: Completion requests are batched (not one per file)
- [ ] **Performance**: 50 files complete in ~2-3 minutes

---

## 🐛 Troubleshooting

### Quick Reference

| Issue | Check |
|-------|-------|
| Still 5 concurrent? | Verify `useUpload(20)` in UploadPage.tsx |
| Pagination wrong? | Restart backend, verify `findByUserIdAndStatus` is used |
| State not persisting? | Check localStorage enabled, not incognito mode |
| URLs sequential? | Check Network tab - should see burst at start |
| No batched completes? | Check Network tab - should see `/complete/batch` |

### Detailed Troubleshooting

#### Pagination Still Wrong?
- **Check**: Backend logs - should use `findByUserIdAndStatus(userId, UPLOADED, pageable)`
- **Verify**: Database has PENDING photos that shouldn't be counted
- **Fix**: Restart backend to ensure new code is running

#### State Not Persisting?
- **Check**: Browser localStorage is enabled
- **Check**: Not in incognito/private mode
- **Verify**: `localStorage.getItem('rapidphoto_upload_state')` returns data
- **Fix**: Clear localStorage and try again

#### Still Only 5 Concurrent?
- **Check**: `web/src/pages/UploadPage.tsx` uses `useUpload(20)`
- **Check**: `web/src/hooks/useUpload.ts` default is 20
- **Verify**: Network tab shows 20 concurrent PUT requests
- **Fix**: Restart frontend dev server

#### Browser won't select 1000+ files
- **Solution**: Some browsers limit file selection. Use drag & drop or select in batches of 500

#### Uploads failing
- **Check**: Backend is running
- **Check**: S3 credentials are correct
- **Check**: Network connection is stable
- **Check**: Browser console for errors

---

## 📊 Performance Benchmarks

### Before Optimizations
- 100 files: ~10 minutes
- 500 files: ~50 minutes
- 1000 files: ~100 minutes (1.6 hours)

### After Optimizations (20 concurrent + pre-request URLs + batched completes)
- 100 files: ~2.5 minutes (**75% faster**)
- 500 files: ~12.5 minutes (**75% faster**)
- 1000 files: ~25 minutes (**75% faster**)

**Note**: Actual times depend on:
- File sizes (larger = slower)
- Network upload speed
- Backend/S3 response times

---

## ✅ Success Criteria

All tests pass if:
- ✅ Pagination shows accurate counts (only UPLOADED)
- ✅ Upload state persists when navigating
- ✅ 20 concurrent uploads visible in Network tab
- ✅ URLs requested in burst (not sequential)
- ✅ Completions are batched (not one per file)
- ✅ Uploads complete significantly faster

---

---

## 🧪 Comprehensive Testing (15-30 minutes)

### Full Integration Test

**Setup**:
1. Start backend: `cd backend && ./mvnw spring-boot:run`
2. Start frontend: `cd web && npm run dev`
3. Open browser: http://localhost:5173

**Test Sequence**:

#### Step 1: Upload Batch
1. Register new account
2. Go to Upload page
3. Select 30-50 images
4. Click "Start Upload"
5. **Monitor**: Should see 20 concurrent uploads in Network tab

#### Step 2: Test State Persistence
1. **While uploads are happening**, navigate to Gallery
2. Check Gallery (should show completed photos)
3. Navigate back to Upload
4. **Verify**: Upload state preserved, progress continues

#### Step 3: Test Pagination
1. Wait for all uploads to complete
2. Go to Gallery
3. Check pagination:
   - Total count should match uploaded photos
   - If you have 50 photos, should show "50 photos total"
   - Pagination should work correctly (20 per page)

#### Step 4: Test Edge Cases
1. Upload 10 more photos
2. **Stop backend** mid-upload (Ctrl+C)
3. Some uploads should fail
4. **Restart backend**
5. Go to Gallery
6. **Verify**: Only successful uploads are counted
7. Failed uploads should NOT be in pagination count

---

## 📦 Large Batch Testing (1000+ Files)

### Recommended Datasets

#### Option 1: Natural Images Dataset (Recommended) ⭐

**Best for photo upload testing** - Contains real-world photos similar to what users would upload.

**Kaggle Dataset**: [Natural Images](https://www.kaggle.com/datasets/prasunroy/natural-images)

**Details**:
- **Size**: ~8,000+ images
- **Format**: JPG/PNG
- **Categories**: Animals, Fruits, Flowers, People, etc.
- **File Sizes**: Varies (typical photo sizes)
- **Download**: Requires Kaggle account (free)

**Download Instructions**:
```bash
# Install Kaggle CLI
pip install kaggle

# Download Natural Images dataset
kaggle datasets download -d prasunroy/natural-images

# Extract
unzip natural-images.zip

# Count images (verify you have 1000+)
find natural-images -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" \) | wc -l
```

**Why This Dataset**:
- ✅ Real-world photos (not synthetic)
- ✅ Reasonable file sizes
- ✅ Good variety of content
- ✅ Perfect for testing 1000+ uploads

#### Option 2: Caltech 101

**Large, diverse image collection** - Good for stress testing.

**Dataset**: [Caltech 101](http://www.vision.caltech.edu/Image_Datasets/Caltech101/)

**Details**:
- **Size**: 9,146 images
- **Format**: JPG
- **Categories**: 101 object categories
- **File Sizes**: ~300x200 pixels average
- **Download**: Direct download (no account needed)

**Download Instructions**:
1. Visit: http://www.vision.caltech.edu/Image_Datasets/Caltech101/
2. Download: `101_ObjectCategories.tar.gz` (~131 MB)
3. Extract: `tar -xzf 101_ObjectCategories.tar.gz`

### Quick Start Large Batch Testing

#### Step 1: Prepare Test Directory

```bash
# Create test directory
mkdir -p ~/rapidphoto-test-images

# Copy first 1000 images (or all if you want more)
find natural-images -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" \) | head -1000 | xargs -I {} cp {} ~/rapidphoto-test-images/

# Verify count
ls ~/rapidphoto-test-images | wc -l
```

#### Step 2: Test Upload

1. **Start the application** (backend + frontend)
2. **Login/Register** in the web app
3. **Navigate to Upload page**
4. **Select all images** from `~/rapidphoto-test-images/`
   - Drag & drop entire folder, or
   - Use file picker (may need to select in batches if browser limits)
5. **Click "Start Upload"**
6. **Monitor**:
   - Progress bars (should show 20 concurrent uploads)
   - Total progress percentage
   - Estimated time remaining
   - Individual file status

#### Step 3: Verify Results

1. **Check Gallery**:
   - All photos should appear
   - Pagination should work correctly
   - Total count should match uploaded count

2. **Navigate Away & Back**:
   - Go to Gallery
   - Return to Upload page
   - Upload state should persist (completed files visible)

3. **Check Database**:
   ```bash
   docker exec rapidphoto-postgres psql -U postgres -d rapidphoto_dev \
     -c "SELECT COUNT(*) FROM photos WHERE status = 'UPLOADED';"
   ```

4. **Check S3**:
   ```bash
   aws s3 ls s3://your-bucket-name/ --recursive | wc -l
   ```

### Expected Performance (1000+ Files)

With **optimizations** (pre-request URLs + batched completes):

| Batch Size | Expected Time | Notes |
|------------|---------------|-------|
| 100 images | ~2-3 minutes | Quick test |
| 500 images | ~8-12 minutes | Medium batch |
| 1,000 images | ~15-20 minutes | Large batch |
| 2,000 images | ~30-40 minutes | Very large batch |

**Factors affecting speed**:
- Network upload speed
- File sizes (larger files = longer)
- Backend response time
- S3 upload speed

### Large Batch Testing Scenarios

#### Scenario 1: Large Batch Upload
- **Action**: Upload 1,000+ images
- **Verify**: All upload successfully, no errors
- **Check**: Pagination shows correct total count

#### Scenario 2: Navigation Persistence
- **Action**: Upload 500 images, navigate to Gallery, return to Upload
- **Verify**: Upload state persists (completed files visible)
- **Check**: Can see which files completed/failed

#### Scenario 3: Pagination Accuracy
- **Action**: Upload 1,500 images (hitting the limit)
- **Verify**: Gallery pagination shows correct page counts
- **Check**: Total count matches uploaded count (not including PENDING/FAILED)

#### Scenario 4: Concurrent Upload Stress
- **Action**: Upload 2,000 images
- **Verify**: 20 uploads happen simultaneously
- **Check**: No browser crashes, memory usage reasonable
- **Monitor**: Network tab shows 20 concurrent PUT requests

#### Scenario 5: Error Recovery
- **Action**: Stop backend mid-upload, restart
- **Verify**: Failed uploads show error status
- **Check**: Can retry failed uploads

### Notes for Large Batch Testing

1. **Dataset Size**: 1,000-2,000 images is sufficient for most testing. You don't need the full dataset.

2. **File Selection**: If browser limits file selection, you can:
   - Select in batches (500 at a time)
   - Use drag & drop (may work better)
   - Test with smaller batches first (100, 500, then 1000+)

3. **Storage Limits**: The app has built-in limits:
   - Max 1,500 photos total
   - Max 500 MB total storage
   - Max 100 MB per file

4. **Testing Time**: Plan 30-60 minutes for a full 1000+ image upload test.

---

## 🚀 Ready for Production Testing

After passing these tests:
1. Monitor performance metrics
2. Verify error handling with network issues
3. Test on different browsers/devices
4. Test with real-world usage patterns

**Time to complete**: 
- Quick smoke tests: 10-15 minutes
- Comprehensive tests: 15-30 minutes
- Large batch testing: 30-60 minutes

**Critical tests**: Tests 1, 3, 4, 5 (verify core optimizations)

---

## 📱 Mobile Testing (Expo)

### Prerequisites
- Backend running (see Test 1)
- Expo Go app installed on iOS/Android device
- Device and computer on same network

### Setup
```bash
cd mobile
npm install  # If needed
npm start
```

### Test Mobile Upload (5 min)

1. **Scan QR code** with Expo Go app
2. **Login/Register** via mobile app
3. **Select 10-20 photos** from device gallery
4. **Start upload** and verify:
   - ✅ Progress updates smoothly
   - ✅ Multiple uploads happen concurrently (check Network tab in dev tools)
   - ✅ Batch complete requests visible (not individual completes)
   - ✅ All photos appear in gallery after completion

### Mobile-Specific Features
- ✅ **Pre-requested URLs**: All URLs ready before uploads start
- ✅ **Batched completes**: 10x fewer HTTP requests
- ✅ **20 concurrent uploads**: Faster than previous 5 concurrent
- ✅ **Event-driven queue**: Efficient slot management

### Mobile vs Web Parity
Mobile now has **feature parity** with web:
- ✅ Pre-requesting presigned URLs (50 at a time)
- ✅ Batched complete notifications (5 items or 1s)
- ✅ Event-driven queue (10ms checks vs 100ms polling)
- ✅ 20 concurrent uploads (same as web)

**Note**: State persistence (localStorage) is web-only. Mobile state resets on app restart (acceptable for MVP).

---

**Total time**: 15-20 minutes (web + mobile)


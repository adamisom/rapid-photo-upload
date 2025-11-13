# Smoke Test Guide - Recent Performance Fixes & Optimizations

Quick verification guide for all recent changes. **Time: 10-15 minutes**

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

## 🐛 Quick Troubleshooting

| Issue | Check |
|-------|-------|
| Still 5 concurrent? | Verify `useUpload(20)` in UploadPage.tsx |
| Pagination wrong? | Restart backend, verify `findByUserIdAndStatus` is used |
| State not persisting? | Check localStorage enabled, not incognito mode |
| URLs sequential? | Check Network tab - should see burst at start |
| No batched completes? | Check Network tab - should see `/complete/batch` |

---

## 📊 Expected Performance

| Batch Size | Time (Before) | Time (After) | Improvement |
|------------|---------------|--------------|-------------|
| 50 files | ~10 min | ~2.5 min | **75% faster** |
| 100 files | ~20 min | ~5 min | **75% faster** |
| 500 files | ~100 min | ~25 min | **75% faster** |
| 1000 files | ~200 min | ~50 min | **75% faster** |

*Note: Actual times depend on file sizes and network speed*

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

## 🚀 Ready for Production Testing

After passing these smoke tests:
1. Test with 1000+ files (see LARGE_BATCH_TESTING.md)
2. Monitor performance metrics
3. Verify error handling with network issues
4. Test on different browsers/devices

---

**Time to complete**: 10-15 minutes  
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


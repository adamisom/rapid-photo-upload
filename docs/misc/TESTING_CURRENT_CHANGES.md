# Testing Guide: Current Performance Fixes

This guide helps you test the recent performance improvements:
1. **Pagination bug fix** (filter by UPLOADED status in DB)
2. **Upload state persistence** (localStorage-based)
3. **20 concurrent uploads** (increased from 5)

---

## 🧪 Quick Test (5 minutes)

### Test 1: Pagination Accuracy

**Goal**: Verify pagination shows correct total count (excludes PENDING/FAILED photos)

**Steps**:
1. Start backend and frontend
2. Register/Login
3. Upload 5-10 photos
4. **While uploads are in progress**, go to Gallery
5. Check pagination:
   - Should show correct total count (only UPLOADED photos)
   - Should NOT count PENDING photos that are still uploading

**Expected Result**:
- Total count matches only completed uploads
- If 3 photos uploaded and 2 still uploading, count should be 3 (not 5)

**Before Fix**: Would show 5 (incorrect - counted PENDING photos)
**After Fix**: Shows 3 (correct - only UPLOADED photos)

---

### Test 2: Upload State Persistence

**Goal**: Verify upload state persists when navigating away and back

**Steps**:
1. Go to Upload page
2. Select 10-20 image files
3. Click "Start Upload"
4. **Wait for 3-5 files to complete** (don't wait for all)
5. Navigate to Gallery (click "Gallery" in header)
6. Navigate back to Upload page
7. Check upload state

**Expected Result**:
- Completed files should still show as "completed"
- Uploading files should still show as "uploading" with progress
- Pending files should still show as "pending"
- Overall progress should be preserved

**Before Fix**: All state lost, files disappeared
**After Fix**: State persists, can see which files completed/failed

**Verify localStorage**:
```javascript
// In browser console
JSON.parse(localStorage.getItem('rapidphoto_upload_state'))
// Should show activeFiles with their statuses
```

---

### Test 3: 20 Concurrent Uploads

**Goal**: Verify 20 files upload simultaneously (not 5)

**Steps**:
1. Go to Upload page
2. Select 30-50 image files (from `100-test-images/` folder)
3. Click "Start Upload"
4. Open browser DevTools → Network tab
5. Filter by "PUT" requests (S3 uploads)
6. Count concurrent uploads

**Expected Result**:
- Should see **20 concurrent PUT requests** to S3
- As files complete, new ones start immediately
- Uploads happen in batches of 20

**Before Fix**: Only 5 concurrent uploads
**After Fix**: 20 concurrent uploads (4x faster)

**Performance Check**:
- 50 files @ 5 concurrent: ~10 minutes
- 50 files @ 20 concurrent: ~2.5 minutes (4x faster)

---

## 🧪 Comprehensive Test (15-20 minutes)

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

## 🔍 Verification Checklist

### Pagination Fix
- [ ] Upload 5 photos, check Gallery count = 5
- [ ] Upload 10 more (while first 5 still uploading), check count = 5 (not 15)
- [ ] Wait for all to complete, check count = 15
- [ ] If some fail, count should exclude failed photos

### State Persistence
- [ ] Upload files, navigate to Gallery, return to Upload
- [ ] Completed files still show as completed
- [ ] Uploading files still show progress
- [ ] Can see upload history (last batch, previous batches)
- [ ] localStorage contains upload state

### 20 Concurrent Uploads
- [ ] Network tab shows 20 concurrent PUT requests
- [ ] Uploads complete faster (4x speed improvement)
- [ ] No browser crashes or memory issues
- [ ] All files upload successfully

---

## 🐛 Troubleshooting

### Pagination Still Wrong?
- **Check**: Backend logs - should use `findByUserIdAndStatus(userId, UPLOADED, pageable)`
- **Verify**: Database has PENDING photos that shouldn't be counted
- **Fix**: Restart backend to ensure new code is running

### State Not Persisting?
- **Check**: Browser localStorage is enabled
- **Check**: Not in incognito/private mode
- **Verify**: `localStorage.getItem('rapidphoto_upload_state')` returns data
- **Fix**: Clear localStorage and try again

### Still Only 5 Concurrent?
- **Check**: `web/src/pages/UploadPage.tsx` uses `useUpload(20)`
- **Check**: `web/src/hooks/useUpload.ts` default is 20
- **Verify**: Network tab shows 20 concurrent PUT requests
- **Fix**: Restart frontend dev server

---

## 📊 Performance Benchmarks

### Before Fixes
- 100 files: ~10 minutes
- 500 files: ~50 minutes
- 1000 files: ~100 minutes (1.6 hours)

### After Fixes (20 concurrent)
- 100 files: ~2.5 minutes (4x faster)
- 500 files: ~12.5 minutes (4x faster)
- 1000 files: ~25 minutes (4x faster)

**Note**: Actual times depend on:
- File sizes (larger = slower)
- Network upload speed
- Backend/S3 response times

---

## 🧪 Advanced Testing

### Test with Large Batch (100+ files)

**If you have 100+ test images**:

1. Select all 100+ images
2. Start upload
3. Monitor:
   - Network tab: 20 concurrent uploads
   - Progress: Should be faster than before
   - State: Navigate away/back, state should persist
   - Gallery: Pagination should be accurate

**Expected**: 
- Uploads complete in ~25% of previous time
- State persists throughout
- Pagination shows correct count

### Test Edge Cases

1. **Upload, close browser, reopen**:
   - State should be restored from localStorage
   - Can see which files completed

2. **Upload, navigate away, upload more**:
   - New uploads should work normally
   - Old state should be preserved

3. **Upload with failures**:
   - Some uploads fail (stop backend)
   - Gallery should only count successful uploads
   - Failed uploads should NOT be in pagination

---

## ✅ Success Criteria

All tests pass if:
- ✅ Pagination shows accurate counts (only UPLOADED photos)
- ✅ Upload state persists when navigating
- ✅ 20 concurrent uploads visible in Network tab
- ✅ Uploads complete ~4x faster than before
- ✅ No browser crashes or memory issues
- ✅ All files upload successfully

---

## 📝 Notes

- **localStorage limit**: ~5-10MB, should be fine for 1000+ files (only metadata stored)
- **Browser limits**: Some browsers limit file selection to 100-200 files
- **Network**: 20 concurrent uploads may saturate slower connections
- **Backend**: Should handle 20 concurrent URL requests easily

---

## 🚀 Next Steps

After verifying these fixes work:
1. Test with 1000+ images (see [LARGE_BATCH_TESTING.md](LARGE_BATCH_TESTING.md))
2. Implement hybrid optimization (pre-request URLs + batched completes)
3. Measure performance improvements

---

**Happy Testing!** 🎉


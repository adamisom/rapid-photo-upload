# Upload Batch History Fix - Testing Guide

## What Was Changed
Refactored `/web/src/hooks/useUpload.ts` to use a **combined state object** instead of separate `files` and `completedBatches` states. This ensures atomic state updates and eliminates the timing issue that prevented upload history from showing.

## How to Test

### Prerequisites
1. Backend API is running (with PostgreSQL and S3 configured)
2. Web app is running (`cd web && npm run dev`)
3. User is logged in

### Test Scenario 1: Single File Upload
1. Navigate to Upload page
2. Select or drag-and-drop **1 image file**
3. Click "Start Upload"
4. Wait for upload to complete
5. **Expected Results:**
   - ✅ File disappears from active upload area
   - ✅ "Last Batch" section appears with the uploaded file
   - ✅ File shows "Done" status with green checkmark
   - ✅ "Clear Last Batch" button is visible
   - ✅ "Previous Batches" section does NOT appear (only 1 batch exists)

### Test Scenario 2: Multiple Sequential Uploads
1. After Test 1, upload **another file** (different file)
2. Click "Start Upload" again
3. Wait for completion
4. **Expected Results:**
   - ✅ "Last Batch" now shows the NEW file (just uploaded)
   - ✅ "Previous Batches" section appears with the FIRST file
   - ✅ Both sections are clearly labeled
   - ✅ No duplicate files anywhere

### Test Scenario 3: Batch Upload (Multiple Files at Once)
1. Clear all batches if needed
2. Select **3-5 images** at once
3. Click "Start Upload"
4. Wait for all to complete
5. **Expected Results:**
   - ✅ All files disappear from active area
   - ✅ "Last Batch" section shows ALL uploaded files (3-5 files)
   - ✅ Each file has correct status (completed/failed)
   - ✅ Batch header shows correct count (e.g., "5 files • 5 completed, 0 failed")

### Test Scenario 4: Clear Last Batch
1. After uploading 2+ batches (so you have Last + Previous)
2. Click "Clear Last Batch" button
3. **Expected Results:**
   - ✅ Most recent batch disappears
   - ✅ Second-most-recent batch becomes the new "Last Batch"
   - ✅ If only 2 batches existed, "Previous Batches" section disappears

### Test Scenario 5: Clear All Previous
1. After uploading 3+ batches
2. Click "Clear All Previous" button
3. **Expected Results:**
   - ✅ Only "Last Batch" remains
   - ✅ "Previous Batches" section disappears
   - ✅ Last batch stays intact

### Test Scenario 6: Console Errors
1. Open browser DevTools Console (F12)
2. Perform any of the above tests
3. **Expected Results:**
   - ✅ No React errors (e.g., "Cannot read properties of undefined")
   - ✅ No "Warning: Each child in a list should have a unique key" warnings
   - ✅ No duplicate render warnings

### Test Scenario 7: React StrictMode (Development)
1. In development mode, React StrictMode runs effects twice
2. Upload a file
3. **Expected Results:**
   - ✅ File appears in "Last Batch" only ONCE (idempotency works)
   - ✅ No duplicate batches even with StrictMode

---

## What to Look For

### ✅ SUCCESS Indicators
- Upload history appears immediately after upload completes
- Files move from active area → Last Batch cleanly
- Batch counts and statistics are accurate
- No console errors or warnings
- Clear buttons work as expected
- Subsequent uploads move older batches to "Previous Batches"

### ❌ FAILURE Indicators
- Upload completes but no "Last Batch" section appears
- Files stay in active upload area after completion
- Duplicate batches appear
- Files appear in both "Last Batch" and "Previous Batches"
- Console shows errors about state updates
- React key warnings in console
- Clear buttons don't work or clear wrong batches

---

## Debugging If Issues Occur

### If History Still Doesn't Show
1. Open browser console
2. Add a log in `useUpload.ts` line 193:
   ```typescript
   setUploadState((current) => {
     console.log('🔍 Current state:', current);
     console.log('🔍 Pending files:', pendingFiles);
     const completedFilesFromBatch = current.activeFiles.filter(...)
     console.log('🔍 Completed files:', completedFilesFromBatch);
     // ...rest of code
   });
   ```
3. Upload a file and check what logs appear
4. Share the console output

### If Duplicates Appear
1. Check the browser console for this log
2. Look for the idempotency check:
   ```typescript
   current.completedBatches.some(b => b.id === newBatch.id)
   ```
3. Verify batchIds are unique

### If Clear Buttons Don't Work
1. Check console for errors when clicking
2. Verify `completedBatches` state is updating
3. Try: `console.log(uploadState.completedBatches)` in the component

---

## Testing Commands

### Start Backend
```bash
cd backend
./mvnw spring-boot:run
```

### Start Web App
```bash
cd web
npm run dev
```

### Check for TypeScript Errors
```bash
cd web
npx tsc --noEmit
```

---

## Expected File Changes

Only one file was modified:
- `/web/src/hooks/useUpload.ts` - Refactored to use combined state

No changes to:
- `/web/src/pages/UploadPage.tsx` - UI stays the same
- Any other components

---

## Report Back

After testing, please report:
1. ✅ Which test scenarios passed
2. ❌ Which test scenarios failed (if any)
3. 📋 Any console errors or warnings
4. 🐛 Any unexpected behavior

If everything works, we can mark the bug as **RESOLVED** ✅
If issues remain, we'll debug together with the console logs.


# Mobile App - Required Updates to Match Web

Mobile was built at commit `a70d156` (Phase 6.3). Since then, **30+ web commits** added major features and fixes that need to be ported to mobile.

---

## Critical Features Missing from Mobile

### 1. **Photo Tagging Feature** (Package 5) - HIGH PRIORITY
**Commits**: `26676ce`, `f3227eb`, `b6671b4`, `4ea68b3`

**Backend** (already done):
- ✅ Tags JSONB column in Photo entity
- ✅ UpdateTagsRequest DTO with validation
- ✅ PUT /api/photos/{photoId}/tags endpoint
- ✅ Max 3 tags, 50 chars each

**Mobile needs**:
- [ ] Update Photo type to include `tags: string[]`
- [ ] Update photoService to add `updateTags(photoId, tags)` method
- [ ] Add tag UI to GalleryScreen:
  - Display existing tags as pills with remove button
  - Add tag input (max 3 tags, 50 chars)
  - Autocomplete suggestions from user's existing tags
  - Inline validation errors
  - Real-time UI updates

---

### 2. **Upload Batch History** - HIGH PRIORITY
**Commits**: `37c54f9`, `6f4e196`, `e4a5625`, `6aff550`

**What changed**:
- Upload UI split into 3 sections: Active Uploads, Last Batch, Previous Batches
- Atomic state management (combined `uploadState` object)
- Batch history persists and displays completed uploads
- Clear buttons for last batch and previous batches

**Mobile needs**:
- [ ] Update useUpload hook to match web's atomic state pattern
- [ ] Add batch history UI sections to UploadScreen
- [ ] Show "Last Batch" after upload completes
- [ ] Show "Previous Batches" for older uploads
- [ ] Add clear buttons

---

### 3. **Retry Failed Uploads** - HIGH PRIORITY
**Commits**: `a044d12`

**What changed**:
- Retry button appears for failed uploads
- Status messages improved (green/red/yellow banners)
- Upload summary shows success/failure counts

**Mobile needs**:
- [ ] Add `retryFile(fileId)` to useUpload hook
- [ ] Add retry button UI to failed file items
- [ ] Update status banners (all success, all failed, mixed)

---

### 4. **Progress Improvements** - MEDIUM PRIORITY
**Commits**: `d0856f8`, `ab7f949`, `bbfdaff`

**What changed**:
- **Byte-based progress** instead of file count (accurate for mixed sizes)
- **ETA calculation** (estimated time remaining)
- Progress percentage fixed (was stuck at 0%)

**Mobile needs**:
- [ ] Update useUpload to calculate progress by bytes
- [ ] Add ETA calculation and display
- [ ] Fix progress percentage calculation

---

### 5. **UI Polish & Usability** - MEDIUM PRIORITY
**Commits**: `12fb672`, `972f494`, `f34dfbb`, `510ea02`, `c18c434`

**What changed**:
- **"Remove All" button** to clear all selected files at once
- **File summary card** showing total count and size
- **Concurrency tip** (visible for 6+ files, not 50+)
- Compact styling improvements

**Mobile needs**:
- [ ] Add "Remove All" button to UploadScreen
- [ ] Add file summary card (count + total size)
- [ ] Add concurrency tip (5 files at a time message)
- [ ] Polish styling to match web

---

### 6. **Auth Flow Fixes** - LOW PRIORITY (Mobile might already work)
**Commits**: `02cab0d`, `42c859d`, `2d3cd8e`

**What changed**:
- `refreshAuth()` method to sync AuthContext after login/register
- `isInitialized` flag to prevent redirects before localStorage loads
- Fixed register/login state bugs

**Mobile needs**:
- [ ] Check if mobile has similar auth timing issues
- [ ] Add `isInitialized` flag if needed
- [ ] Verify auth flow works correctly

---

### 7. **Formatters Utility** - LOW PRIORITY (Just created)
**Commit**: `ff59b26`

**What changed**:
- Extracted `formatFileSize` and `formatTimeRemaining` into `utils/formatters.ts`
- Added unit tests

**Mobile needs**:
- [ ] Create `src/utils/formatters.ts` with same functions
- [ ] Update UploadScreen to import from formatters
- [ ] Add tests (optional)

---

## Summary of Changes Needed

| Feature | Priority | Complexity | Impact |
|---------|----------|------------|--------|
| Photo Tagging | HIGH | High | Major feature gap |
| Batch History | HIGH | High | UX consistency |
| Retry Failed | HIGH | Medium | Error recovery |
| Progress (Bytes/ETA) | MEDIUM | Medium | Accuracy |
| UI Polish | MEDIUM | Low | Usability |
| Auth Fixes | LOW | Low | Might not be needed |
| Formatters | LOW | Low | Code quality |

---

## Implementation Order

1. **Photo Tagging** - Most visible missing feature
2. **Batch History** - Critical UX for tracking uploads
3. **Retry Failed** - Error handling
4. **Progress Improvements** - Accuracy
5. **UI Polish** - Small wins
6. **Auth/Formatters** - Nice-to-haves

---

## Estimated Effort

- **Photo Tagging**: 1-2 hours (UI + API integration + autocomplete)
- **Batch History**: 1 hour (state management + UI)
- **Retry Failed**: 30 minutes (button + logic)
- **Progress**: 30 minutes (calculation updates)
- **UI Polish**: 30 minutes (buttons + styling)

**Total**: ~4-5 hours to achieve feature parity with web

---

## Next Steps

Should I proceed with implementing these changes in order? Starting with Photo Tagging?


# Large Batch Upload Testing Guide

This guide provides evaluators with resources to test RapidPhotoUpload with 1000+ image batches.

## 🎯 Purpose

To test the application's performance and reliability with large image batches (1000+ files), demonstrating:
- **20 concurrent uploads** (recently increased from 5)
- **Pagination accuracy** (fixed to filter by UPLOADED status in database)
- **Upload state persistence** (localStorage-based state management)
- **Error handling** with large batches
- **Performance** under high concurrency

---

## 📦 Recommended Datasets

### Option 1: Natural Images Dataset (Recommended) ⭐

**Best for photo upload testing** - Contains real-world photos similar to what users would upload.

**Kaggle Dataset**: [Natural Images](https://www.kaggle.com/datasets/prasunroy/natural-images)

**Details**:
- **Size**: ~8,000+ images
- **Format**: JPG/PNG
- **Categories**: Animals, Fruits, Flowers, People, etc.
- **File Sizes**: Varies (typical photo sizes)
- **Download**: Requires Kaggle account (free)

**Download Instructions**:
1. Create free Kaggle account at https://www.kaggle.com
2. Install Kaggle CLI: `pip install kaggle`
3. Download dataset:
   ```bash
   kaggle datasets download -d prasunroy/natural-images
   unzip natural-images.zip
   ```
4. Images will be in subdirectories by category

**Why This Dataset**:
- ✅ Real-world photos (not synthetic)
- ✅ Reasonable file sizes
- ✅ Good variety of content
- ✅ Perfect for testing 1000+ uploads

---

### Option 2: Caltech 101

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
4. Images organized in category folders

**Why This Dataset**:
- ✅ Large collection (9000+ images)
- ✅ No account required
- ✅ Well-organized structure
- ⚠️ Smaller image sizes (may not test large file handling)

---

### Option 3: ImageNet Subset (Advanced)

**Massive dataset** - For extreme stress testing.

**Dataset**: [ImageNet](https://www.image-net.org/)

**Details**:
- **Size**: 1,281,167 images (full dataset)
- **Format**: JPG
- **Categories**: 1,000 categories
- **File Sizes**: Varies (high resolution)
- **Download**: Requires registration

**Download Instructions**:
1. Register at https://www.image-net.org/
2. Download ILSVRC2012 validation set (50,000 images)
3. Or download specific category subsets

**Why This Dataset**:
- ✅ Extremely large (can test 10,000+ uploads)
- ✅ High-quality images
- ⚠️ Very large download size
- ⚠️ Requires registration

**Note**: For most testing, 1,000-2,000 images is sufficient. Full ImageNet is overkill.

---

### Option 4: Kaggle - Flowers Dataset

**Focused on one category** - Good for consistent testing.

**Kaggle Dataset**: [Flowers Recognition](https://www.kaggle.com/datasets/alxmamaev/flowers-recognition)

**Details**:
- **Size**: ~4,000+ images
- **Format**: JPG
- **Categories**: 5 flower types
- **File Sizes**: Varies
- **Download**: Requires Kaggle account

**Download Instructions**:
```bash
kaggle datasets download -d alxmamaev/flowers-recognition
unzip flowers-recognition.zip
```

---

## 🚀 Quick Start Testing

### Step 1: Download Dataset

**Recommended**: Start with Natural Images Dataset (Option 1)

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

### Step 2: Prepare Test Directory

```bash
# Create test directory
mkdir -p ~/rapidphoto-test-images

# Copy first 1000 images (or all if you want more)
find natural-images -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" \) | head -1000 | xargs -I {} cp {} ~/rapidphoto-test-images/

# Verify count
ls ~/rapidphoto-test-images | wc -l
```

### Step 3: Test Upload

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

### Step 4: Verify Results

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

---

## 📊 Expected Performance

With **20 concurrent uploads**:

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

---

## 🐛 Testing Scenarios

### Scenario 1: Large Batch Upload
- **Action**: Upload 1,000+ images
- **Verify**: All upload successfully, no errors
- **Check**: Pagination shows correct total count

### Scenario 2: Navigation Persistence
- **Action**: Upload 500 images, navigate to Gallery, return to Upload
- **Verify**: Upload state persists (completed files visible)
- **Check**: Can see which files completed/failed

### Scenario 3: Pagination Accuracy
- **Action**: Upload 1,500 images (hitting the limit)
- **Verify**: Gallery pagination shows correct page counts
- **Check**: Total count matches uploaded count (not including PENDING/FAILED)

### Scenario 4: Concurrent Upload Stress
- **Action**: Upload 2,000 images
- **Verify**: 20 uploads happen simultaneously
- **Check**: No browser crashes, memory usage reasonable
- **Monitor**: Network tab shows 20 concurrent PUT requests

### Scenario 5: Error Recovery
- **Action**: Stop backend mid-upload, restart
- **Verify**: Failed uploads show error status
- **Check**: Can retry failed uploads

---

## 🔍 Troubleshooting

### "Browser won't select 1000+ files"
- **Solution**: Some browsers limit file selection. Use drag & drop or select in batches of 500

### "Uploads failing"
- **Check**: Backend is running
- **Check**: S3 credentials are correct
- **Check**: Network connection is stable
- **Check**: Browser console for errors

### "Pagination shows wrong count"
- **Verify**: Backend fix is deployed (filters by UPLOADED status in DB query)
- **Check**: Database has PENDING photos that shouldn't be counted

### "State not persisting"
- **Check**: Browser localStorage is enabled
- **Check**: Not in incognito/private mode
- **Verify**: `localStorage.getItem('rapidphoto_upload_state')` returns data

---

## 📝 Notes for Evaluators

1. **Dataset Size**: 1,000-2,000 images is sufficient for most testing. You don't need the full dataset.

2. **File Selection**: If browser limits file selection, you can:
   - Select in batches (500 at a time)
   - Use drag & drop (may work better)
   - Test with smaller batches first (100, 500, then 1000+)

3. **Performance**: Upload speed depends on:
   - Your internet upload speed
   - File sizes (larger = slower)
   - Backend/S3 response times

4. **Storage Limits**: The app has built-in limits:
   - Max 1,500 photos total
   - Max 500 MB total storage
   - Max 100 MB per file

5. **Testing Time**: Plan 30-60 minutes for a full 1000+ image upload test.

---

## 🔗 Quick Links

- **Natural Images Dataset**: https://www.kaggle.com/datasets/prasunroy/natural-images
- **Caltech 101**: http://www.vision.caltech.edu/Image_Datasets/Caltech101/
- **ImageNet**: https://www.image-net.org/
- **Kaggle CLI Docs**: https://github.com/Kaggle/kaggle-api

---

## ✅ Testing Checklist

- [ ] Downloaded 1000+ test images
- [ ] Verified images are valid (can open in image viewer)
- [ ] Started backend and frontend
- [ ] Registered/Logged in
- [ ] Selected 1000+ images for upload
- [ ] Started upload and monitored progress
- [ ] Verified 20 concurrent uploads (check Network tab)
- [ ] Verified all images uploaded successfully
- [ ] Checked Gallery pagination (correct total count)
- [ ] Tested navigation persistence (upload state persists)
- [ ] Verified database has correct count
- [ ] Verified S3 has all files

---

**Happy Testing!** 🚀

For questions or issues, refer to:
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - General testing guide
- [TECHNICAL_WRITEUP.md](TECHNICAL_WRITEUP.md) - System architecture
- [ARCHITECTURE_DETAILS.md](ARCHITECTURE_DETAILS.md) - Implementation details


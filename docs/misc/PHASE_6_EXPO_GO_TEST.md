# Phase 6: Testing RapidPhotoUpload Mobile with Expo Go

Quick guide to test the React Native app on your iPhone using Expo Go.

## Prerequisites

1. **Expo CLI installed**:
   ```bash
   npm install -g expo-cli
   ```

2. **Expo Go app on iPhone** - Download from App Store

3. **Backend running** (required for auth/upload):
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

4. **Same WiFi network** - Your Mac and iPhone must be on the same WiFi

---

## Method 1: Fast Testing with `expo start --go` (Recommended)

### Step 1: Start Development Server
```bash
cd mobile
npm install  # if first time
npm run start:go
```

**Expected output**:
```
Expo Go QR code will appear in terminal
```

### Step 2: Scan QR Code
1. Open **Expo Go app** on iPhone
2. Tap **Scan QR code**
3. Point iPhone camera at terminal QR code
4. App loads automatically! 🎉

### Step 3: Test App
- Register new account
- Login
- Upload photos from camera roll
- View gallery
- Delete photos

---

## Method 2: Tunnel Mode (Works Over Cellular)

### Step 1: Start with Tunnel
```bash
cd mobile
npm run start:tunnel
```

### Step 2: Scan QR Code
Same as Method 1 - works even without local WiFi

---

## Method 3: Manual Testing Steps

### If QR Code Doesn't Work

1. **Start server**:
   ```bash
   cd mobile
   npm start
   ```

2. **Get the localhost URL** from terminal output

3. **In Expo Go on iPhone**:
   - Tap **Explore** tab
   - Tap **Enter URL manually**
   - Paste the localhost URL
   - App loads

---

## Testing Checklist

- [ ] App starts without crashing
- [ ] **Register** - Create new account
- [ ] **Login** - Login with registered credentials
- [ ] **Upload** - Select photos from camera roll
- [ ] **Progress** - See upload progress
- [ ] **Gallery** - View uploaded photos
- [ ] **Delete** - Delete a photo
- [ ] **Logout** - Logout and return to login screen

---

## Troubleshooting

### "Cannot connect to server"
- **Check WiFi**: iPhone and Mac on same network
- **Check firewall**: Allow Node.js incoming connections
- **Restart**: Kill `npm` and try again

### "QR Code won't scan"
- Try **Method 2** (tunnel mode)
- Or manually enter URL in Expo Go

### "App crashes on startup"
- Check terminal for error messages
- Run `npm run lint` to find issues
- Clear Expo cache: `expo start --clear`

### "Cannot reach backend"
- Ensure backend is running: `http://localhost:8080/actuator/health`
- Check `EXPO_PUBLIC_API_BASE_URL` in mobile `.env` (use your Mac's IP, not localhost)

---

## Building for Testing on Device

### Export APK (Android):
```bash
cd mobile
eas build --platform android --local
```

### Export IPA (iPhone):
```bash
cd mobile
eas build --platform ios --local
```

Then sideload onto device using Xcode or TestFlight.

---

## Environment Variables

See `PHASE_6_ENV_SETUP.md` for detailed environment configuration.

---

## Performance Tips

1. **Reload fast**: Ctrl+M in Expo Go, tap "Reload"
2. **Clear cache**: `expo start --clear`
3. **Use tunnel if WiFi unstable**: `npm run start:tunnel`

---

**Happy testing!** 🚀


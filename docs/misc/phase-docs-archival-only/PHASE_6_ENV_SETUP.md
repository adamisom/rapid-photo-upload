# Phase 6: Mobile App Environment Configuration

## Setup Instructions

1. **Create `.env` file** in the `mobile/` directory:

```bash
cd mobile
touch .env
```

2. **Add the following content** to `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Configuration Options

### For Local Development (Same Machine)
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

### For Testing on iPhone via WiFi
Replace `YOUR_MAC_IP` with your Mac's IP address (get it with `ifconfig | grep inet`):

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.X:8080
```

Example:
```bash
# Get your Mac IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Output: inet 192.168.1.50 netmask 0xffffff00 broadcast 192.168.1.255

# Use that IP in .env:
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:8080
```

### For Production
```env
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

## Reloading After Changes

After updating `.env`, reload the Expo app:
- Press **Ctrl+M** in Expo Go (iOS/Android)
- Tap **Reload**

Or restart the dev server:
```bash
npm run start:go
```

---

**Note**: The `EXPO_PUBLIC_` prefix is required for variables to be accessible at runtime. Variables without this prefix are private to the build and not included in the app.


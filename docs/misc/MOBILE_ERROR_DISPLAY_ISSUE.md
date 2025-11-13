# Mobile Error Display Issue - Troubleshooting

## Problem
Login/Register errors are showing in Expo Go's error notification banner at the bottom, but NOT in the form UI (red error box) like the web version.

## Expected Behavior
Errors should display in a red error box within the form (between subtitle and input fields), matching the web UI.

## What We've Tried

1. ✅ Added `errorContainer` styled box to LoginScreen and RegisterScreen
2. ✅ Changed `console.error` to `console.log` to avoid triggering Expo error overlay
3. ✅ Improved error message extraction from Axios errors
4. ✅ Removed `useFocusEffect` that was clearing errors
5. ✅ Added debug line to show error state on screen
6. ✅ Marked errors as `isHandled` to prevent error overlay
7. ✅ Added Alert.alert() for immediate error feedback
8. ✅ Stored errors in SecureStore to survive remounts
9. ✅ Removed `finally` blocks, set loading state in catch before re-throwing
10. ❌ **Blank screen refresh still persists** - component remounts after error

## Current Code State

### LoginScreen.tsx
- Error container is rendered: `{error ? <View style={styles.errorContainer}>...</View> : null}`
- Error state is set in catch block: `setError(message)`
- Debug line added: `{__DEV__ && <Text>Debug: error={error || 'null'}</Text>}`

### authService.ts
- Errors are extracted: `error.response?.data?.message || error.message`
- Errors are marked as handled: `error.isHandled = true`

## Root Cause Identified ✅

**The error IS being set, but the component remounts immediately after, resetting state to null.**

### Evidence from logs:
```
LOG  🔴 Setting error in UI: Invalid email or password
LOG  🔴 Error set, current error state: null  ← State hasn't updated yet (async)
```

Then component remounts (long refresh), resetting `error` state back to `null`.

### Why the remount happens:
The "blank screen refresh" persists even after:
- Setting loading state in catch block before re-throwing
- Removing finally blocks
- Properly catching errors at all levels

**Possible root causes:**
1. **Expo Router error handling** - Expo Router might have its own error boundary that's catching and remounting
2. **React Native Error Boundary** - There might be an error boundary higher up in the component tree
3. **Axios interceptor** - The response interceptor might be causing issues
4. **Development mode behavior** - Expo Go in dev mode might be more aggressive about error handling
5. **Async state updates during error** - Even though we set loading before re-throw, React Native might still see the error as unhandled

## Solution Approaches (To Try Next)

### Option 1: Don't re-throw errors (Recommended)
Instead of re-throwing from AuthProvider, return error as a result:
- Change `login()` to return `{ success: boolean, error?: string, token?: string }`
- Handle errors in LoginScreen without throwing
- This prevents error propagation entirely

### Option 2: Check Expo Router error handling
- Look for `_layout.tsx` files that might have error boundaries
- Check if Expo Router has global error handling
- See if there's a way to disable error boundary for specific routes

### Option 3: Use ErrorUtils.setGlobalHandler
- Override React Native's global error handler
- Suppress expected errors (400/401) from triggering remounts
- Let unexpected errors still trigger error boundary

### Option 4: Check for error boundary in app structure
- Search for `ErrorBoundary` components
- Check `app/_layout.tsx` or root layout files
- Look for any error handling in navigation setup

### Option 5: Accept Alert.alert() as solution
- Alert works perfectly (no blank screen)
- Error also stored in SecureStore for form display
- If remount happens, error is restored after Alert dismiss
- This might be the pragmatic solution

## Next Steps to Debug

1. **Check if error state is being set:**
   - ✅ CONFIRMED: `setError(message)` is being called
   - ❌ PROBLEM: Component remounts before state update completes

2. **Prevent remount:**
   - Check for ErrorBoundary components
   - Check Expo Router error handling
   - Try wrapping error handling to prevent propagation

3. **Alternative: Use Alert.alert() temporarily:**
   - Replace `setError()` with `Alert.alert('Login Failed', message)`
   - This will work but isn't as elegant as in-form display

## Files Modified
- `mobile/src/screens/LoginScreen.tsx`
- `mobile/src/screens/RegisterScreen.tsx`
- `mobile/src/services/authService.ts`
- `mobile/src/services/api.ts`

## Test Steps
1. Start mobile app: `cd mobile && npm run start:go`
2. Scan QR code in Expo Go
3. Try to login with invalid credentials
4. Check console logs:
   - ✅ `🔴 Setting error in UI: Invalid email or password` (confirmed)
   - ❌ Component remounts immediately after (causing state reset)
   - ❌ Debug line shows `error=null` after remount

## Logs Analysis
```
LOG  🟢 handleLogin called, clearing error
LOG  🟢 About to call login()
LOG  🔐 Attempting login for: adam.r.isom@gmail.com
LOG  📡 Sending login request to: https://rapid-photo-upload-production.up.railway.app
LOG  ❌ AuthProvider caught login error, re-throwing: [Error: Invalid email or password]
LOG  🔴 CATCH BLOCK EXECUTED! Error: [Error: Invalid email or password]
LOG  🔴 Setting error in UI: Invalid email or password
LOG  🔴 Error set, current error state: null  ← React state is async, hasn't updated yet
[BLANK SCREEN REFRESH HAPPENS HERE - Component remounts]
[Error state resets to null]
[Alert.alert() shows after remount completes]
```

**Current Status:**
- ✅ Alert.alert() works and shows error immediately after remount
- ❌ Blank screen refresh still happens before Alert appears
- ❌ Error state in form doesn't persist (component remounts)
- ✅ Error is stored in SecureStore and could be restored, but Alert is sufficient

## Key Files to Check
- `mobile/app/_layout.tsx` - Check for error boundaries
- `mobile/src/context/AuthProvider.tsx` - Current error handling
- `mobile/src/screens/LoginScreen.tsx` - Current error display
- `mobile/src/services/api.ts` - Response interceptor

## Related Web Implementation
See `web/src/pages/LoginPage.tsx` for reference - error displays in:
```tsx
{error && (
  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-red-700">
    {error}
  </div>
)}
```


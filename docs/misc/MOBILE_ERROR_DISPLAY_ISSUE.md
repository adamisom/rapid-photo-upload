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

## Current Code State

### LoginScreen.tsx
- Error container is rendered: `{error ? <View style={styles.errorContainer}>...</View> : null}`
- Error state is set in catch block: `setError(message)`
- Debug line added: `{__DEV__ && <Text>Debug: error={error || 'null'}</Text>}`

### authService.ts
- Errors are extracted: `error.response?.data?.message || error.message`
- Errors are marked as handled: `error.isHandled = true`

## Next Steps to Debug

1. **Check if error state is being set:**
   - Look for debug line on screen: "Debug: error=..."
   - Check console logs: "🔴 Setting error in UI: ..."
   - If debug shows "null" after login fails, error isn't being set

2. **Check if error is being cleared:**
   - Look for any code that calls `setError(null)` after the catch block
   - Check if component is unmounting/remounting

3. **Check if error container is rendering:**
   - If debug shows error but red box doesn't appear, it's a rendering issue
   - Verify `errorContainer` styles are correct (backgroundColor, padding, etc.)
   - Check if View/Text components are imported correctly

4. **Check React Native rendering:**
   - Try wrapping error in a ScrollView or different container
   - Verify the conditional rendering `{error ? ... : null}` is working
   - Check if there's a z-index or positioning issue hiding the error box

5. **Alternative approach:**
   - Try using React Native's `Alert.alert()` as a fallback
   - Or use a toast/notification library if in-app display doesn't work

## Files Modified
- `mobile/src/screens/LoginScreen.tsx`
- `mobile/src/screens/RegisterScreen.tsx`
- `mobile/src/services/authService.ts`
- `mobile/src/services/api.ts`

## Test Steps
1. Start mobile app: `cd mobile && npm run start:go`
2. Scan QR code in Expo Go
3. Try to login with invalid credentials
4. Check:
   - Does debug line show error?
   - Does red error box appear?
   - Does notification banner still appear?

## Related Web Implementation
See `web/src/pages/LoginPage.tsx` for reference - error displays in:
```tsx
{error && (
  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-red-700">
    {error}
  </div>
)}
```


# Login/Register Form Width Issue - Debugging Log

**Date**: November 9, 2025  
**Status**: Unresolved - requires fresh approach

## Problem Description

The login and register form cards are stretching to fill the full page width instead of being a narrow centered form (target: ~450px width).

**Files Affected**:
- `web/src/pages/LoginPage.tsx`
- `web/src/pages/RegisterPage.tsx`

**Observable Behavior**:
- Form card expands to fill available width on desktop
- User screenshot shows form computed width as `228.906×38` (measuring element shows full-width rendering)
- Should be a narrow, centered card like standard authentication forms

## Current Code Structure

Both pages have this pattern:
```jsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
  <div className="mx-auto max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 m-4">
    {/* Form content */}
  </div>
</div>
```

## Attempted Fixes (All Failed)

### Attempt 1: `max-w-md` with `w-full`
```jsx
<div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
```
**Result**: Form still took full width ❌

### Attempt 2: `max-w-sm` with `w-full`
```jsx
<div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
```
**Result**: Form still took full width ❌

### Attempt 3: Fixed width `w-96`
```jsx
<div className="w-96 bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
```
**Result**: Form became narrower than desired (not 384px), padding or flex issues ❌

### Attempt 4: `mx-auto max-w-md` with `m-4`
```jsx
<div className="mx-auto max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 m-4">
```
**Result**: No change from attempt 3 ❌

## Possible Root Causes

1. **Tailwind CSS not applied**: The responsive constraint classes might not be loading
2. **CSS Specificity**: Another stylesheet might be overriding the constraints
3. **Flex Container Issue**: The `flex items-center justify-center` parent might have width implications
4. **FormInput component**: The `w-full` in FormInput inputs might be causing issues
5. **CSS Build**: The tailwind.config might not include these classes in the build

## FormInput Component Reference

```jsx
// web/src/components/FormInput.tsx
<input
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
/>
```

All inputs use `w-full` which is correct, but parent should constrain them.

## Recommendation for Next Model

1. Verify Tailwind CSS is actually loading and building properly
2. Check if there are conflicting CSS rules in `web/src/App.css` or other stylesheets
3. Try explicit pixel widths with `style={{width: '450px'}}` to test if the issue is Tailwind-specific
4. Consider if the flex container parent needs explicit width constraints
5. Review tailwind.config.js to ensure responsive classes are included
6. Check if this is a Vite dev server caching issue (may need hard refresh or restart)

## Screenshot Evidence

User provided screenshot showing form at full width with DevTools open, element measurements showing incorrect computed width.


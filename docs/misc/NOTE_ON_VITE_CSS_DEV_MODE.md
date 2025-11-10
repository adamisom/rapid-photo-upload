# Vite CSS Injection in Development Mode

## Overview

In development mode, **Vite injects CSS directly into the HTML as `<style>` tags** rather than serving separate CSS files. This is normal behavior and optimizes Hot Module Replacement (HMR) for faster development.

## Expected Behavior

### ✅ Development Mode (npm run dev)

- **No CSS files in Network tab** - This is correct!
- CSS is injected via JavaScript into `<style>` tags in the `<head>`
- Tailwind classes are processed and injected dynamically
- Faster HMR - changes appear instantly without full page reload
- View styles in **DevTools → Elements → `<head>` section** - you'll see multiple `<style>` tags with `data-vite-dev-id` attributes

### ✅ Production Build (npm run build)

- CSS is extracted into separate `.css` files
- Files are minified and optimized
- CSS files will appear in the `dist/assets/` folder
- Production builds serve `.css` files normally

## How to Verify Tailwind is Working in Dev Mode

### 1. Check `<style>` Tags in `<head>`
```html
<head>
  <!-- You should see multiple style tags like this: -->
  <style type="text/css" data-vite-dev-id="...">
    .bg-white { background-color: #fff; }
    .rounded-3xl { border-radius: 1.5rem; }
    /* ... thousands of Tailwind utility classes ... */
  </style>
</head>
```

### 2. Inspect Elements
- Right-click any element with Tailwind classes
- Select "Inspect"
- In the **Styles** panel, you should see:
  - The Tailwind classes applied (e.g., `bg-white`, `px-10`, `py-12`)
  - Their computed CSS values

### 3. Check Computed Styles
- Select an element in DevTools
- Go to **Computed** tab
- You'll see actual CSS values (e.g., `background-color: rgb(255, 255, 255)`)

## Troubleshooting

### ❌ If Styles Aren't Loading

1. **Check Console for Errors**
   - Open DevTools → Console
   - Look for PostCSS or Tailwind errors

2. **Verify `index.css` is Imported**
   ```tsx
   // In src/main.tsx
   import './index.css'  // ← Must be present
   ```

3. **Check Tailwind Directives**
   ```css
   /* In src/index.css */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

4. **Verify PostCSS Config**
   ```js
   // postcss.config.cjs (must use .cjs extension if package.json has "type": "module")
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   }
   ```

5. **Check Tailwind Config**
   ```js
   // tailwind.config.js
   export default {
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",
     ],
     // ...
   }
   ```

6. **Clear Vite Cache**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

## Configuration Files for This Project

### ✅ Current Setup (Tailwind v3 + Vite)

- **Tailwind:** v3.4.1 (stable)
- **PostCSS Config:** `postcss.config.cjs` (CommonJS format for ES modules)
- **CSS Import:** `src/index.css` with `@tailwind` directives
- **Package Type:** `"type": "module"` in `package.json`

### Why `.cjs` for PostCSS?

Since `package.json` has `"type": "module"`, all `.js` files are treated as ES modules. PostCSS requires CommonJS format (`module.exports`), so we use `.cjs` extension to explicitly mark it as CommonJS.

## Performance Notes

- **Dev mode:** CSS injection via JS is slightly slower but enables instant HMR
- **Production:** Separate CSS files are more performant and cacheable
- **Size:** Dev bundle is larger due to all Tailwind classes being available; production is tree-shaken and minimal

## References

- [Vite CSS Features](https://vitejs.dev/guide/features.html#css)
- [Tailwind CSS with Vite](https://tailwindcss.com/docs/guides/vite)
- [Vite HMR API](https://vitejs.dev/guide/api-hmr.html)


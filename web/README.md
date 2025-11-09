# RapidPhotoUpload - Web Frontend

**Status**: Phase 4 - Web Client Foundation (In Progress)

A modern React + TypeScript web application for high-volume photo uploads with real-time progress tracking.

---

## 📁 Project Structure

This is the **FRONTEND** code (separate from backend). All files here are frontend-only.

```
web/
├── src/
│   ├── types/              ← TypeScript interfaces (API response types)
│   │   └── index.ts        ← Centralized type definitions
│   │
│   ├── services/           ← API client & service functions
│   │   ├── api.ts          ← Axios configuration & interceptors
│   │   ├── authService.ts  ← Auth endpoints & token management
│   │   ├── uploadService.ts ← Upload endpoints (Phase 4.2)
│   │   └── photoService.ts ← Photo management endpoints (Phase 5)
│   │
│   ├── context/            ← React Context for global state
│   │   ├── AuthContext.tsx ← Auth state & user management
│   │   └── UploadContext.tsx ← Upload batch state (Phase 4.2)
│   │
│   ├── pages/              ← Full-page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── UploadPage.tsx
│   │   ├── GalleryPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── components/         ← Reusable UI components
│   │   ├── ProtectedRoute.tsx
│   │   ├── UploadArea.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── PhotoGrid.tsx
│   │   └── Header.tsx
│   │
│   ├── hooks/              ← Custom React hooks
│   │   ├── useUpload.ts    ← Upload logic hook
│   │   └── useBatchStatus.ts ← Batch status polling hook
│   │
│   ├── utils/              ← Utility functions
│   │   ├── validators.ts   ← Form validation
│   │   ├── formatters.ts   ← Date/size formatting
│   │   └── constants.ts    ← App-wide constants
│   │
│   ├── styles/             ← Global styles (if not using Tailwind)
│   ├── App.tsx             ← Main app component + routing
│   ├── main.tsx            ← React entry point
│   └── index.css           ← Tailwind imports + global styles
│
├── public/                 ← Static assets
├── index.html              ← HTML template
├── vite.config.ts          ← Vite build configuration
├── tailwind.config.js      ← Tailwind CSS configuration
├── postcss.config.js       ← PostCSS configuration
├── tsconfig.json           ← TypeScript configuration
└── package.json            ← Dependencies

# ⚠️ Environment Configuration (NOT committed to git)
├── .env.local              ← Local environment variables
│   # Copy template: cp env.example.web .env.local
│   # Variables:
│   #   VITE_API_BASE_URL=http://localhost:8080
│   #   VITE_MAX_CONCURRENT_UPLOADS=5
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Set Up Environment Variables

Create `.env.local` in the `web/` directory:

```bash
cat > .env.local << 'EOF'
# Backend API
VITE_API_BASE_URL=http://localhost:8080

# Upload settings
VITE_MAX_CONCURRENT_UPLOADS=5

# Polling intervals (milliseconds)
VITE_BATCH_STATUS_POLL_INTERVAL=1000

# Debug mode
VITE_ENABLE_DEBUG_MODE=true
EOF
```

**Important**: `.env.local` is gitignored - never commit secrets!

### 3. Start Development Server

```bash
npm run dev
```

**Expected output**:
```
VITE v4.x.x  ready in 123 ms

➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in your browser.

### 4. Ensure Backend is Running

In another terminal:
```bash
cd backend
./mvnw spring-boot:run
```

Backend should be at http://localhost:8080

---

## 🏗️ Architecture & Design

### Frontend-Backend Communication

```
┌─────────────────────────────────────────────┐
│  Frontend (React @ localhost:5173)          │
│                                             │
│  Pages (Login, Upload, Gallery)            │
│       ↓                                     │
│  Context (Auth, Upload state)              │
│       ↓                                     │
│  Services (authService, uploadService)     │
│       ↓                                     │
│  API Client (axios + interceptors)         │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────────┐
│  Backend (Spring Boot @ localhost:8080)     │
│  JWT Auth + S3 Presigned URLs               │
└──────────────────────────────────────────────┘
```

### Authentication Flow

```
1. User fills register/login form
   ↓
2. Form POST to /api/auth/register or /api/auth/login
   ↓
3. Backend returns JWT token
   ↓
4. Frontend stores token in localStorage
   ↓
5. All future requests include "Authorization: Bearer {token}"
   ↓
6. axios interceptor auto-injects token in headers
```

### Upload Flow (Presigned URL Strategy)

```
1. User selects multiple files
   ↓
2. For each file:
   a) POST /api/upload/initiate → get presigned URL
   b) PUT presigned URL → upload directly to S3 (no backend involvement)
   c) POST /api/upload/complete/{photoId} → notify backend
   ↓
3. Frontend polls GET /api/upload/batch/{batchId}/status every 1-2 seconds
   ↓
4. Update progress bars in real-time
```

### State Management

- **Auth State**: React Context (AuthContext)
  - Stores: user, token, isAuthenticated
  - Persisted in localStorage
  - Shared globally to all components

- **Upload State**: React Context (UploadContext - Phase 4.2)
  - Stores: batch info, file upload progress
  - NOT persisted (cleared on page refresh)

- **Component State**: useState for local UI state (forms, modals, etc.)

---

## 🛠️ Development Workflow

### Starting Fresh

```bash
# 1. Terminal 1: Backend
cd backend
export JWT_SECRET="dev-secret-key-at-least-64-characters-long"
./mvnw spring-boot:run

# 2. Terminal 2: Frontend
cd web
npm run dev
```

### Making Code Changes

**Frontend**:
```bash
# Edit files in web/src/
# Vite auto-reloads on save
# No rebuild needed
```

**Backend**:
```bash
# Edit files in backend/src/main/java/...
# Rebuild: ./mvnw clean compile
# Or: Stop server + restart
```

### Testing API Integration

Use the TESTING_GUIDE.md commands to verify backend is working:

```bash
# Test auth endpoint
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Then test frontend can reach it via UI
```

---

## 📦 Dependencies

### Core (Already Installed)
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool (fast dev server)

### API & Routing
- **axios** - HTTP client
- **react-router-dom** - Client-side routing

### Styling
- **tailwindcss** - Utility-first CSS
- **postcss** - CSS processing

### Dev Tools
- **ESLint** - Code linting (optional, add if needed)
- **Prettier** - Code formatting (optional, add if needed)

### Adding More Dependencies

```bash
# Add a new package
npm install package-name

# Add dev dependency
npm install --save-dev package-name
```

---

## 🎯 Phase 4 Checklist

### Phase 4.1: Scaffold & Auth (Current)
- [x] Initialize Vite + React + TypeScript
- [x] Install axios, react-router, tailwindcss
- [x] Set up TypeScript interfaces (types/index.ts)
- [x] Create API client with interceptors (services/api.ts)
- [x] Create auth service (services/authService.ts)
- [x] Create auth context (context/AuthContext.tsx)
- [ ] Build login page component
- [ ] Build register page component
- [ ] Create protected route wrapper
- [ ] Test: Register → Login → Access protected routes

### Phase 4.2: Upload UI (Next)
- [ ] Create upload service (services/uploadService.ts)
- [ ] Create upload context (context/UploadContext.tsx)
- [ ] Build upload page with file selection
- [ ] Build upload manager (handle S3 uploads)
- [ ] Create progress indicators
- [ ] Implement batch status polling
- [ ] Test: Upload 5-10 files → See progress

### Phase 5: Gallery (After Phase 4)
- [ ] Create photo service (services/photoService.ts)
- [ ] Build gallery page with grid layout
- [ ] Implement photo viewing
- [ ] Add delete functionality
- [ ] Test: View uploaded photos → Download → Delete

---

## 🧪 Testing

### Manual Testing (During Development)

```bash
# Test 1: Can you register?
1. Go to http://localhost:5173
2. Fill out registration form
3. Should redirect to upload page (or dashboard)
4. Check browser console for any errors

# Test 2: Can you upload?
1. Select 3 files
2. Click "Upload"
3. See progress bars update
4. All 3 should show "Complete"

# Test 3: Can you see photos?
1. Go to gallery
2. See the 3 uploaded photos
3. Click to view full-size
4. Delete one photo
```

### Debugging

```bash
# Check console in browser DevTools (F12)
# Look for errors or warning messages

# Check network tab (DevTools)
# Verify API requests are going to http://localhost:8080
# Check response status codes (200, 401, 400, etc.)

# Check localStorage
# Open DevTools → Application → Local Storage
# Should see: token, userId, email
```

---

## 🚨 Common Issues

### "Could not find VITE_API_BASE_URL"
- Create `.env.local` file in web/ directory (see above)
- Vite needs environment variables before build

### "CORS error when calling backend"
- Backend must have CORS configured
- Should already be set in Spring Security config
- If not, add to backend `SecurityConfig.java`

### "401 Unauthorized on every request"
- Token might be invalid or expired
- Check localStorage has `token` key
- Re-login to get fresh token

### "Upload stalls at 90%"
- S3 upload took too long
- Check VITE_BATCH_STATUS_POLL_INTERVAL (increase to 2000ms?)
- Check backend logs for S3 errors

---

## 📚 Reference

### Key Files for AI Agents

**Start here for understanding structure**:
- `src/types/index.ts` - All TypeScript interfaces
- `src/services/api.ts` - API client configuration
- `src/context/AuthContext.tsx` - Auth state example

**To add new features**:
1. Define types in `src/types/index.ts`
2. Create service in `src/services/` (e.g., photoService.ts)
3. Create context in `src/context/` (e.g., PhotoContext.tsx) if needed
4. Build page component in `src/pages/`
5. Use custom hooks in `src/hooks/`

### Backend API Reference

**See backend docs for complete API**:
- `docs/ARCHITECTURE.md` - Full system design
- `docs/QUICK_START.md` - How to run backend
- `docs/misc/TESTING_GUIDE.md` - Curl examples for all endpoints

**Quick API endpoints**:
```
POST   /api/auth/register         - Create account
POST   /api/auth/login            - Login, get JWT
POST   /api/upload/initiate       - Get presigned URL
POST   /api/upload/complete/{id}  - Complete upload
GET    /api/upload/batch/{id}/status - Poll progress
GET    /api/photos                - List photos
GET    /api/photos/{id}           - Get single photo
DELETE /api/photos/{id}           - Delete photo
```

---

## 🔗 Links

- Backend: http://localhost:8080
- Frontend: http://localhost:5173
- S3 Bucket: (Set in backend env vars)

---

## 📝 Notes for AI Coding Agents

**This is FRONTEND-only code**. The backend is in the `backend/` directory.

**Clear separation**:
- `backend/` = Java Spring Boot
- `web/` = React TypeScript
- `mobile/` = React Native (Phase 6)

**When building features**:
1. Frontend calls backend APIs
2. Services in `src/services/` handle HTTP requests
3. Context provides global state
4. Components render UI
5. Hooks manage logic

**Don't**:
- Import backend files into frontend
- Use Java/Spring syntax in frontend
- Put business logic in components (use hooks/services instead)

**Do**:
- Keep components small and reusable
- Put API calls in services
- Put state in context/hooks
- Keep types up-to-date in `src/types/`

---

## 📖 Further Reading

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Axios Docs](https://axios-http.com/docs/intro)
- [React Router](https://reactrouter.com)

---

**Ready to build?** Start with the login/register pages! 🚀

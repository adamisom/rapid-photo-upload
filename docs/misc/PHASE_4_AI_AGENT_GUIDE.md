# Phase 4 - AI Agent Developer Guide

**Purpose**: Quick reference for AI agents building the RapidPhotoUpload web frontend

---

## 🎯 Project Context

- **Full System**: Rapid photo uploader (web + mobile + backend)
- **This is**: Web frontend (React + TypeScript)
- **Backend**: Spring Boot Java at `http://localhost:8080`
- **Goal**: Build responsive React SPA with auth + upload + gallery

---

## 📁 Code Organization (Memorize This!)

```
web/src/
├── types/               ← ALL TypeScript interfaces (go here for types)
├── services/            ← API calls (pure functions, no React)
├── context/             ← Global state management (React Context)
├── pages/               ← Full-page components (combine everything)
├── components/          ← Reusable UI pieces (small, focused)
├── hooks/               ← Custom React logic (reusable functions)
└── utils/               ← Utilities (pure functions, no dependencies)
```

**Golden Rule**: `types/` → `services/` → `context/` → `pages/components/` → UI

---

## 🔑 Key Files You'll Use

### 1. **src/types/index.ts** - Always Check Here First
```typescript
// This is where all TypeScript interfaces live
import { AuthResponse, Photo, UploadFile } from '../types';

// If a type doesn't exist, add it here first
// ALL types in ONE file = easy to maintain
```

### 2. **src/services/api.ts** - The HTTP Client
```typescript
// NEVER create your own axios instance
// ALWAYS use this pre-configured client
import apiClient from './api';

// It auto-injects JWT token in Authorization header
// It handles 401 errors (token expired)
```

### 3. **src/services/authService.ts** - The Auth Pattern
```typescript
// This is your template for creating new services
// Follow this pattern exactly:
// 1. Pure functions (no React)
// 2. Import types from types/index.ts
// 3. Use apiClient for HTTP
// 4. Return typed responses

export const authService = {
  register: async (email: string, password: string) => { ... }
}
```

### 4. **src/context/AuthContext.tsx** - The State Pattern
```typescript
// This is your template for creating new contexts
// Follow this pattern:
// 1. Create context with createContext()
// 2. Create Provider component
// 3. Export custom hook (useAuth)
// 4. Hook uses useContext() internally

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### 5. **src/App.tsx** - The Router
```typescript
// React Router setup here
// Routes defined here
// Add new pages:
// <Route path="/new-page" element={<NewPage />} />
```

---

## 💡 Common Tasks

### Task: "Add a new service (e.g., photoService)"

1. Check what types you need in `src/types/index.ts`
   - Add them if missing

2. Create `src/services/photoService.ts`
   ```typescript
   import apiClient from './api';
   import { PhotoListResponse, Photo } from '../types';

   export const photoService = {
     getPhotos: async (page: number) => {
       const response = await apiClient.get<PhotoListResponse>('/api/photos?page=' + page);
       return response.data;
     },
   };
   ```

3. Use in a page/component:
   ```typescript
   const [photos, setPhotos] = useState<Photo[]>([]);
   
   useEffect(() => {
     photoService.getPhotos(0).then(setPhotos);
   }, []);
   ```

### Task: "Add global state (e.g., uploadContext)"

1. Create `src/context/UploadContext.tsx`
   ```typescript
   const UploadContext = createContext<UploadContextType | undefined>(undefined);

   export const UploadProvider = ({ children }) => {
     const [files, setFiles] = useState<UploadFile[]>([]);
     
     const value: UploadContextType = {
       files,
       addFile: (file) => { ... },
     };
     
     return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
   };

   export const useUpload = () => {
     const context = useContext(UploadContext);
     if (!context) throw new Error('useUpload must be used within UploadProvider');
     return context;
   };
   ```

2. Add provider to `App.tsx`:
   ```typescript
   <AuthProvider>
     <UploadProvider>
       <Router>
         ...
       </Router>
     </UploadProvider>
   </AuthProvider>
   ```

3. Use in components:
   ```typescript
   const { files, addFile } = useUpload();
   ```

### Task: "Build a new page (e.g., LoginPage)"

1. Create `src/pages/LoginPage.tsx`:
   ```typescript
   import { useAuth } from '../context/AuthContext';
   import { useNavigate } from 'react-router-dom';

   export default function LoginPage() {
     const { login } = useAuth();
     const navigate = useNavigate();
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');

     const handleSubmit = async (e) => {
       e.preventDefault();
       try {
         await login(email, password);
         navigate('/upload');
       } catch (error) {
         // Handle error
       }
     };

     return (
       <form onSubmit={handleSubmit}>
         <input value={email} onChange={(e) => setEmail(e.target.value)} />
         <input value={password} onChange={(e) => setPassword(e.target.value)} />
         <button type="submit">Login</button>
       </form>
     );
   }
   ```

2. Add route to `App.tsx`:
   ```typescript
   <Route path="/login" element={<LoginPage />} />
   ```

### Task: "Build a reusable component"

1. Create `src/components/ProgressBar.tsx`:
   ```typescript
   interface ProgressBarProps {
     progress: number;  // 0-100
     label?: string;
   }

   export default function ProgressBar({ progress, label }: ProgressBarProps) {
     return (
       <div className="w-full bg-gray-200 rounded-full">
         <div
           className="bg-blue-600 rounded-full transition-all"
           style={{ width: `${progress}%` }}
         />
         {label && <span>{label}</span>}
       </div>
     );
   }
   ```

2. Use in pages:
   ```typescript
   <ProgressBar progress={75} label="Uploading..." />
   ```

---

## 🔗 API Integration Flow

```
Component calls useAuth/useUpload
         ↓
Context manages state
         ↓
Service function (e.g., authService.login)
         ↓
apiClient.post/get (axios)
         ↓
Backend API @ localhost:8080
         ↓
Response → Service → Context → Component renders
```

---

## ✅ Checklist for New Code

Before submitting code, verify:

- [ ] All types added to `src/types/index.ts`?
- [ ] Services use `apiClient` (not new axios)?
- [ ] Services are pure functions (no React)?
- [ ] Context exported custom hook?
- [ ] Components use hooks/context (not direct API calls)?
- [ ] Tailwind classes used for styling?
- [ ] Error handling present?
- [ ] Loading states handled?
- [ ] TypeScript types all present (no `any`)?

---

## 🚨 Common Mistakes to Avoid

❌ **DON'T**:
```typescript
// Creating new axios instance
import axios from 'axios';
const api = axios.create(...);  // WRONG!

// API calls in components
const [data, setData] = useState();
useEffect(() => {
  fetch('/api/photos').then(setData);  // WRONG!
}, []);

// No types
const response: any = await ...  // WRONG!

// State logic in components
const [batch, setBatch] = useState();
const [files, setFiles] = useState();
const [progress, setProgress] = useState();
// Instead: use context!
```

✅ **DO**:
```typescript
// Use the configured api client
import apiClient from './api';

// Put API calls in services
export const photoService = {
  getPhotos: async () => { ... }
};

// Use types from src/types/index.ts
const photos: Photo[] = await photoService.getPhotos();

// Complex state? Use context
const { batch, files, progress } = useUpload();
```

---

## 📚 Reference

### Backend API Endpoints (See docs/TESTING_GUIDE.md)

```
POST   /api/auth/register         (email, password)
POST   /api/auth/login            (email, password)
POST   /api/upload/initiate       (filename, fileSizeBytes, contentType)
POST   /api/upload/complete/{id}  (fileSizeBytes)
GET    /api/upload/batch/{id}/status
GET    /api/photos                (?page, ?pageSize)
DELETE /api/photos/{id}
```

### Environment Variables (web/.env.local)

```
VITE_API_BASE_URL=http://localhost:8080
VITE_MAX_CONCURRENT_UPLOADS=5
VITE_BATCH_STATUS_POLL_INTERVAL=1000
```

### npm Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run type-check       # Check TypeScript
npm run lint             # Linting
```

---

## 🎯 Current Phase Goals

**Phase 4.1**: Auth pages
- [ ] LoginPage.tsx
- [ ] RegisterPage.tsx  
- [ ] ProtectedRoute.tsx
- [ ] Header.tsx with logout
- [ ] Form validation

**Phase 4.2**: Upload UI
- [ ] UploadService
- [ ] UploadContext
- [ ] UploadPage with drag-drop
- [ ] Progress tracking
- [ ] S3 upload logic

**Phase 5**: Gallery
- [ ] PhotoService
- [ ] GalleryPage
- [ ] Photo viewing
- [ ] Delete functionality

---

## 🤝 Communication

When AI agent needs help:

**Good prompt**:
- "Build LoginPage.tsx in src/pages/"
- "Use useAuth() from context for login"
- "Validate email with regex"
- "Show error message on failure"

**Bad prompt**:
- "Build auth" (too vague)
- "Fix the bug" (no context)
- "Make it better" (no requirements)

---

## 📖 Documentation

- `web/README.md` - Frontend architecture
- `docs/ARCHITECTURE.md` - Full system design
- `docs/TESTING_GUIDE.md` - Backend API examples with curl
- `docs/QUICK_START.md` - How to run everything

---

## 🎉 You're Ready!

Bookmark this guide and reference it while building. Follow the patterns established in:
- `src/services/authService.ts` (service pattern)
- `src/context/AuthContext.tsx` (context pattern)
- `src/types/index.ts` (type pattern)

Happy coding! 🚀


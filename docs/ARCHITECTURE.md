# RapidPhotoUpload - Architecture Guide

**Status**: Phases 1-7 Complete (MVP Production Ready) | Documentation Current as of: November 13, 2025

---

## 📚 **RECOMMENDED READING FOR EVALUATORS**

Before diving into this comprehensive architecture guide, we strongly recommend reading these focused documents:

### 🎯 **[ARCHITECTURE_DETAILS.md](misc/ARCHITECTURE_DETAILS.md)** - Architectural Patterns Explained
**Read this for:** DDD, CQRS, and Vertical Slice Architecture deep-dive
- **Domain-Driven Design (DDD)**: Rich domain entities (User, Photo, UploadBatch) with JavaDoc
- **CQRS Pattern**: Command vs Query services separation explained
- **Vertical Slice Architecture**: Feature-based organization (auth/, upload/, photos/)
- **Bounded Contexts**: Independent feature domains
- **Concurrency Handling**: Atomic operations with `ON CONFLICT DO NOTHING`
- **Metadata Storage Strategy**: Why records persist indefinitely
- **Frontend Architecture**: Context, Hooks, Services pattern
- **5-Minute Quick Reference**: How to identify patterns in code

### 🚀 **[TECHNICAL_WRITEUP.md](misc/TECHNICAL_WRITEUP.md)** - Design Decisions & Trade-offs
**Read this for:** High-level system design and "why" behind decisions
- **Concurrency Strategy**: Presigned URLs + atomic operations explained
- **Asynchronous Design**: Non-blocking I/O, HTTP polling vs WebSockets
- **Cloud Storage**: S3 integration, CORS, security, cost analysis
- **Division of Logic**: Backend vs Frontend vs S3 responsibilities
- **Visual Diagrams**: Upload flow (5 steps), system architecture
- **Performance Results**: Load test metrics (100 photos × 2MB)

### 🤖 **[AI_TOOLS_USED.md](misc/AI_TOOLS_USED.md)** - Human-AI Collaboration Story
**Read this for:** How this project was built with AI assistance
- **Development Process**: 6 phases from planning to documentation
- **Bugs Fixed**: 5 critical bugs discovered through human testing
- **Decision Split**: What human decided vs how AI implemented
- **Code Metrics**: 34 backend files, ~2000 web lines, ~2500 mobile lines
- **Strengths**: AI rapid prototyping vs human requirements/testing
- **Time Savings**: 20-30 hours collaboration vs 2-3 weeks manual work

---

## 1. System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  Web Frontend Layer (React + TypeScript + Vite)                   │
│  @ http://localhost:5173                                          │
│  ├─ Auth: Login/Register pages                                    │
│  ├─ Upload: Drag-drop, progress tracking, batch management       │
│  ├─ Gallery: Paginated grid, download, delete                    │
│  └─ State: React Context (Auth, Upload), Custom Hooks           │
│                                                                    │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  Mobile Frontend Layer (React Native + Expo)                      │
│  @ Tested with Expo Go on iPhone                                  │
│  ├─ Auth: Login/Register screens                                  │
│  ├─ Upload: Photo picker, progress, batch management             │
│  ├─ Gallery: Paginated grid, download, delete                    │
│  └─ State: React Context (Auth, Upload), Custom Hooks, Secure    │
│     Storage (expo-secure-store), FileSystem                      │
│                                                                    │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Backend Layer (Spring Boot 3.4 @ localhost:8080)             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ API Controllers                                          │  │
│  │ - AuthController: /api/auth/*                           │  │
│  │ - UploadController: /api/upload/*                       │  │
│  │ - PhotoController: /api/photos/*                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────┼────────────────────────────────────┐   │
│  │                    ▼                                    │   │
│  │  Service Layer (CQRS Pattern)                          │   │
│  │  ┌────────────────────┐      ┌──────────────────────┐  │   │
│  │  │ Command Services   │      │ Query Services       │  │   │
│  │  │ - UploadCommand    │      │ - UploadQuery        │  │   │
│  │  │ - PhotoCommand     │      │ - PhotoQuery         │  │   │
│  │  │ - AuthService      │      │ - User lookups       │  │   │
│  │  └────────────────────┘      └──────────────────────┘  │   │
│  │         │                              │                │   │
│  │         │                              │                │   │
│  │  ┌──────┴──────────────────────────────┴─────────┐     │   │
│  │  │ Repository Layer (Spring Data JPA)           │     │   │
│  │  │ - UserRepository                             │     │   │
│  │  │ - PhotoRepository                            │     │   │
│  │  │ - UploadBatchRepository                       │     │   │
│  │  └──────────────┬───────────────────────────────┘     │   │
│  │                 │                                     │   │
│  └─────────────────┼─────────────────────────────────────┘   │
│                    │                                          │
└────────┬───────────┼───────────────────────────────────────────┘
         │           │
         │ JDBC      │
         ▼           │
    ┌─────────────┐  │
    │             │  │
    │ PostgreSQL  │  │
    │ (localhost) │  │
    │             │  │
    └─────────────┘  │
                     │
         ┌───────────┘
         │ AWS SDK
         ▼
    ┌──────────────┐
    │              │
    │ AWS S3       │ (presigned URLs)
    │ Bucket       │
    │ rapidphoto-* │
    │              │
    └──────────────┘
```

---

## 2. Data Flow: Upload Workflow

### Upload Workflow - Presigned URL Strategy

```
1. INITIATE UPLOAD
   Client                          Backend                      S3
     │                               │                          │
     ├─ POST /api/upload/initiate ──>│                          │
     │   {filename, fileSize, type}  │                          │
     │                               ├─ Verify user (JWT)       │
     │                               ├─ Create Photo record     │
     │                               │  (status: PENDING)       │
     │                               │                          │
     │                               ├─ Generate S3 key:       │
     │                               │  {userId}/{ts}_{uuid}    │
     │                               │  _{filename}             │
     │                               │                          │
     │                               ├─ Generate presigned URL  │
     │                               │  (30 min expiry)  ──────>│
     │                               │                          │
     │<─ InitiateUploadResponse ─────┤                          │
     │   {photoId, uploadUrl,        │                          │
     │    batchId}                   │                          │

2. DIRECT S3 UPLOAD
   Client                      S3
     │                         │
     ├─ PUT {uploadUrl} ───────>│
     │   {file binary}         │
     │                         ├─ Store file
     │<─ 200 OK + ETag ────────┤
     │

3. COMPLETE UPLOAD
   Client                          Backend                      DB
     │                               │                          │
     ├─ POST /api/upload/complete ──>│                          │
     │   /photoId                    │                          │
     │   {fileSizeBytes}             │                          │
     │                               ├─ Verify user            │
     │                               ├─ Verify file in S3      │
     │                               ├─ Verify file size       │
     │                               │                          │
     │                               ├─ Update Photo status    │
     │                               │  (PENDING → UPLOADED)    │
     │                               ├─ Increment batch counts  │
     │<─ {"status":"success"} ───────┤                          │

4. POLL BATCH STATUS
   Client                          Backend                      DB
     │                               │                          │
     ├─ GET /api/upload/batch/id ───>│                          │
     │  /status                      │                          │
     │                               ├─ Query batch record ────>│
     │                               │<─ {total, completed,     │
     │                               │    failed, photos[]}     │
     │<─ BatchStatusResponse ────────┤                          │
     │   {batchId, totalCount,       │                          │
     │    completedCount,             │                          │
     │    failedCount, photos}       │                          │
```

---

## 3. API Endpoints Reference

### Authentication API

| Method | Endpoint | Request | Response | Auth |
|--------|----------|---------|----------|------|
| POST | `/api/auth/register` | `{email, password}` | `{token, userId, email}` | None |
| POST | `/api/auth/login` | `{email, password}` | `{token, userId, email}` | None |

**Example**:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

# Response:
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

---

### Upload API

| Method | Endpoint | Request | Response | Auth | Purpose |
|--------|----------|---------|----------|------|---------|
| POST | `/api/upload/initiate` | `{filename, fileSizeBytes, contentType, [batchId]}` | `{photoId, uploadUrl, expiresInMinutes, batchId}` | JWT | Get presigned PUT URL |
| POST | `/api/upload/complete/{photoId}` | `{fileSizeBytes, [eTag]}` | `{"status":"success"}` | JWT | Confirm S3 upload |
| POST | `/api/upload/failed/{photoId}` | `{errorMessage}` | `{"status":"success"}` | JWT | Report failure |
| GET | `/api/upload/batch/{batchId}/status` | (query only) | `BatchStatusResponse` | JWT | Poll progress |

**BatchStatusResponse**:
```json
{
  "batchId": "uuid",
  "totalCount": 100,
  "completedCount": 45,
  "failedCount": 2,
  "photos": [
    {
      "id": "uuid",
      "originalFilename": "photo.jpg",
      "status": "UPLOADED",
      "errorMessage": null,
      "updatedAt": "2025-11-08T17:30:00Z"
    }
  ]
}
```

---

### Photo API

| Method | Endpoint | Request | Response | Auth | Purpose |
|--------|----------|---------|----------|------|---------|
| GET | `/api/photos` | `?page=0&pageSize=20` | `PhotoListResponse` | JWT | List user's photos |
| GET | `/api/photos/{photoId}` | (path only) | `PhotoDto` | JWT | Get single photo |
| DELETE | `/api/photos/{photoId}` | (path only) | `{"status":"success"}` | JWT | Delete photo + S3 file |

**PhotoListResponse**:
```json
{
  "photos": [
    {
      "id": "uuid",
      "originalFilename": "vacation.jpg",
      "fileSizeBytes": 2048000,
      "downloadUrl": "https://s3.amazonaws.com/...",
      "uploadedAt": "2025-11-08T17:30:00Z"
    }
  ],
  "pageNumber": 0,
  "pageSize": 20,
  "totalCount": 150
}
```

---

## 4. Security Model

### Authentication Flow

1. **Register / Login**: Client sends credentials → Backend validates → Issues JWT token
2. **Token Storage**: Client stores token in memory/localStorage (frontend choice)
3. **Authenticated Requests**: All requests include `Authorization: Bearer {token}` header
4. **Token Validation**: Backend intercepts requests via `JwtAuthenticationFilter`
5. **User Context**: Extracted user ID available in `SecurityContextHolder`

### Authorization & Data Isolation

**Per-User Isolation**:
- All endpoints verify `userId` from JWT token
- Photos/batches fetched only if they belong to authenticated user
- Database queries filter by `user_id`
- Cross-user access attempts return 400/404 (not 403)

**Example** (UploadCommandService):
```java
public InitiateUploadResponse initiateUpload(String userId, InitiateUploadRequest request) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));
    // ... rest of logic uses this verified user
}
```

### JWT Token Details

- **Algorithm**: HS512
- **Secret**: `${JWT_SECRET}` (256+ bits recommended)
- **Expiry**: 24 hours (86400000 ms)
- **Claims**: `subject` (userId), `email`, `iat`, `exp`

---

## 5. Database Schema

### Tables & Relationships

```sql
users
├─ id (UUID, PK)
├─ email (VARCHAR, unique)
├─ password_hash (VARCHAR)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
   ↓
   └─ 1:N → upload_batches
   └─ 1:N → photos

upload_batches
├─ id (UUID, PK)
├─ user_id (UUID, FK → users)
├─ total_count (INT)
├─ completed_count (INT)
├─ failed_count (INT)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
   ↓
   └─ 1:N → photos

photos
├─ id (UUID, PK)
├─ user_id (UUID, FK → users, INDEXED)
├─ batch_id (UUID, FK → upload_batches, INDEXED)
├─ s3_key (VARCHAR)
├─ original_filename (VARCHAR)
├─ file_size_bytes (BIGINT)
├─ status (ENUM: PENDING, UPLOADING, UPLOADED, FAILED)
├─ error_message (VARCHAR, nullable)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

### Key Indexes

- `photos.user_id` - Fast per-user queries
- `photos.batch_id` - Fast batch status queries
- `upload_batches.user_id` - Fast batch lookup
- `users.email` - Fast user lookup by email

---

## 6. S3 Key Naming & Organization

### S3 Key Format

```
{userId}/{timestamp}_{uuid}_{originalFilename}

Example:
550e8400-e29b-41d4/1699556400_abc-def-ghi_vacation-photo.jpg
```

### Benefits of This Scheme

- **User Isolation**: S3 prefix = userId, easy to grant per-user access
- **Uniqueness**: Timestamp + UUID prevents collisions (even if same filename uploaded multiple times)
- **Traceability**: Original filename preserved for support/debugging
- **Sorting**: Timestamp prefix allows chronological queries

### S3 Bucket Configuration

**Bucket Name**: `rapidphotoupload-adamisom` (or your custom name)

**CORS Configuration**:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Presigned URL Expiry**:
- **PUT URLs** (uploads): 30 minutes
- **GET URLs** (downloads): 1 hour

---

## 7. Configuration & Environment Variables

### Required Environment Variables

```bash
# JWT
JWT_SECRET=your-minimum-256-bit-secret-key-for-hs512-algorithm

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rapidphoto_dev
DB_USERNAME=postgres
DB_PASSWORD=postgres

# AWS S3
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=rapidphotoupload-adamisom
```

### Optional Configuration

```bash
# Upload Expiration (minutes)
s3.presigned-url-expiration-minutes=30

# Pagination
# (hardcoded in endpoints as default 20)
```

### Property Resolution Order (Spring Boot)

1. `application.properties` (base config, committed to git)
2. Environment variables (override base config)
3. Command-line args (override everything)

**Pattern**: Properties file has `${VAR_NAME}` placeholders, runtime values come from env vars.

---

## 8. Package Structure (DDD + Vertical Slice)

```
backend/src/main/java/com/rapid/
│
├── domain/                           (Domain objects, no Spring)
│   ├── User.java                    (Entity)
│   ├── Photo.java                   (Entity)
│   ├── UploadBatch.java             (Entity)
│   └── PhotoStatus.java             (Enum)
│
├── infrastructure/
│   ├── config/
│   │   └── AwsConfig.java           (S3 client bean)
│   ├── repository/                  (JPA Repositories)
│   │   ├── UserRepository.java
│   │   ├── PhotoRepository.java
│   │   └── UploadBatchRepository.java
│   ├── storage/
│   │   └── S3PresignedUrlService.java
│   └── exception/
│       ├── GlobalExceptionHandler.java
│       └── ApiError.java
│
├── security/                         (JWT & Spring Security)
│   ├── JwtTokenProvider.java
│   ├── JwtAuthenticationFilter.java
│   ├── CustomUserDetailsService.java
│   └── SecurityConfig.java
│
├── features/
│   ├── auth/
│   │   ├── controller/
│   │   │   └── AuthController.java
│   │   ├── service/
│   │   │   └── AuthService.java
│   │   └── dto/
│   │       ├── RegisterRequest.java
│   │       ├── LoginRequest.java
│   │       └── AuthResponse.java
│   │
│   ├── upload/
│   │   ├── controller/
│   │   │   └── UploadController.java
│   │   ├── service/
│   │   │   ├── UploadCommandService.java
│   │   │   └── UploadQueryService.java
│   │   └── dto/
│   │       ├── InitiateUploadRequest.java
│   │       ├── InitiateUploadResponse.java
│   │       ├── UploadCompleteRequest.java
│   │       ├── PhotoStatusDto.java
│   │       └── BatchStatusResponse.java
│   │
│   └── photos/
│       ├── controller/
│       │   └── PhotoController.java
│       ├── service/
│       │   ├── PhotoQueryService.java
│       │   └── PhotoCommandService.java
│       └── dto/
│           ├── PhotoDto.java
│           └── PhotoListResponse.java
│
└── RapidPhotoApiApplication.java    (Main Spring Boot entry point)
```

### Design Patterns Used

- **DDD (Domain-Driven Design)**: Domain objects (User, Photo, UploadBatch) contain business logic
- **CQRS (Command Query Responsibility Segregation)**:
  - Commands: `UploadCommandService`, `PhotoCommandService`, `AuthService`
  - Queries: `UploadQueryService`, `PhotoQueryService`
- **Vertical Slice Architecture**: Features organized by domain (auth, upload, photos), not by layer
- **Repository Pattern**: Abstracted database access via Spring Data JPA

---

## 9. Frontend Architecture (Phases 4-6)

### Web Frontend (Phase 4-5)

**Technology Stack**:
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **HTTP Client**: Axios with JWT interceptors
- **State Management**: React Context (Auth, Upload)
- **Testing**: Vitest + @testing-library/react

**Folder Structure**:
```
web/src/
├── types/              → Centralized TypeScript interfaces (API responses)
├── services/           → API client (Axios), auth, upload, photo services
├── context/            → React Context for auth & upload state
├── hooks/              → Custom hooks (useAuth, useUpload)
├── utils/              → Validators, helpers
├── components/         → Reusable UI (FormInput, Alert, ProgressBar)
├── pages/              → Route components (Login, Register, Upload, Gallery)
└── App.tsx             → Root with Router and providers
```

**Key Features**:
- JWT token persistence in localStorage
- S3 presigned URL uploads with progress tracking
- Concurrency control (max 20 parallel uploads)
- Gallery with pagination, download, delete
- Responsive design (mobile-first)

### Mobile Frontend (Phase 6)

**Technology Stack**:
- **Framework**: React Native + Expo
- **Language**: TypeScript
- **Routing**: Expo Router
- **HTTP Client**: Axios with JWT interceptors
- **State Management**: React Context
- **Storage**: Expo SecureStore (JWT), AsyncStorage, FileSystem
- **UI**: React Native built-ins + Expo components

**Folder Structure**:
```
mobile/
├── app/                → Expo Router file-based routing
│   ├── (auth)/        → Login/Register screens
│   └── (tabs)/        → Main navigation (Gallery, Upload, Profile)
├── src/
│   ├── types/         → TypeScript interfaces
│   ├── services/      → API, auth, upload, photo services
│   ├── context/       → React Context for auth
│   ├── hooks/         → Custom hooks (useAuth, useUpload)
│   ├── screens/       → Screen components
│   └── components/    → Reusable UI components
└── ENV_SETUP.md       → Configuration instructions
```

**Key Features**:
- Secure token storage (Expo SecureStore)
- Photo picker integration (expo-image-picker)
- Photo library access (expo-media-library)
- S3 presigned URL uploads with progress
- Gallery with pagination, download, delete

### Frontend State Management Pattern

**Auth Context**:
```
AuthContext (login, logout, user, token, loading)
 └─ useAuth() hook for easy access
    └─ Used by Protected routes & login/register pages
```

**Upload Context**:
```
UploadContext (files, addFiles, removeFile, startUpload, cancelUpload)
 └─ useUpload() hook with concurrency control
    └─ Tracks individual file progress & batch status
```

---

## 10. Production Architecture (Phase 7)

**Deployment Topology**:
```
                    DNS / CloudFlare
                          │
                    ┌─────┴─────┐
                    ▼           ▼
            Web Frontend      Mobile Frontend
        (Vercel/Netlify)   (Expo Hosting/Custom)
                    │           │
                    └─────┬─────┘
                          │ HTTPS
                          ▼
                    AWS ALB (Load Balancer)
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
    Backend 1        Backend 2        Backend N
    (EC2/ECS)        (EC2/ECS)        (EC2/ECS)
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │ JDBC
                          ▼
                    PostgreSQL RDS
              (with read replicas)
                    
    └──────────────────────────────────────>  AWS S3 (Photos)
    └──────────────────────────────────────>  CloudFront (CDN)
    └──────────────────────────────────────>  CloudWatch (Logs & Metrics)
```

**See `docs/misc/PHASE_7_PRODUCTION_GUIDE.md`** for comprehensive deployment, monitoring, and operations details.

---

## 11. Deployment Considerations

### Production Checklist

- [ ] **Secrets Management**: Never hardcode credentials, use AWS Secrets Manager or environment variables
- [ ] **CORS Configuration**: Update `localhost` origins to actual frontend domains
- [ ] **S3 Bucket**: Enable versioning, lifecycle policies, encryption
- [ ] **Database**: Configure automated backups, read replicas if needed
- [ ] **JWT Secret**: Use strong, randomly generated secret (256+ bits)
- [ ] **SSL/TLS**: Enable HTTPS on all endpoints
- [ ] **Rate Limiting**: Add rate limiting on auth endpoints
- [ ] **Monitoring**: CloudWatch logs, application performance monitoring
- [ ] **Load Balancing**: If expecting high traffic, use AWS ALB
- [ ] **Auto-scaling**: Configure EC2/ECS auto-scaling groups

### Scaling Strategy

**Current Bottlenecks** (single backend instance):
- Database connections (limit ~30)
- Memory usage (Spring Boot footprint ~300MB)
- CPU (JWT token generation, database queries)

**To Scale**:
1. **Horizontal**: Deploy multiple backend instances behind load balancer
2. **Database**: Use RDS read replicas for query-heavy loads
3. **Cache**: Add Redis for frequently accessed data (user sessions, batch status)
4. **S3**: No scaling needed (AWS S3 is infinite)

### Estimated Capacity (Single Instance)

- **Concurrent Users**: ~50
- **Simultaneous Uploads**: ~100 (limited by client parallelization)
- **Photos per User**: Unlimited (pagination handles retrieval)
- **Storage**: Limited only by S3 bucket size (can be petabytes)

---

## 12. Troubleshooting & Debugging

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/missing token | Verify token in `Authorization: Bearer {token}` header |
| 400 Bad Request | File size mismatch | Ensure `fileSizeBytes` in complete request matches actual uploaded file |
| 404 Not Found | Photo doesn't exist or wrong user | Verify `photoId` belongs to authenticated user |
| S3 403 Forbidden | Presigned URL expired | Request new presigned URL (30 min expiry) |
| S3 CORS error | CORS not configured | Add CORS policy to S3 bucket (see Configuration section) |

### Debug Logging

Backend logs to `DEBUG` level by default. Check:
```bash
# Show S3 operations
grep "S3" application.log

# Show authentication flow
grep "JwtToken" application.log

# Show database queries
grep "Hibernate" application.log
```

---

## 13. Testing the API

### Quick Smoke Test

See `TESTING_GUIDE.md` for comprehensive testing steps.

**Minimal Test** (5 minutes):
```bash
# 1. Register
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}' | jq -r '.token')

# 2. Initiate upload
RESP=$(curl -s -X POST http://localhost:8080/api/upload/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","fileSizeBytes":1024,"contentType":"image/jpeg"}')

PHOTO_ID=$(echo $RESP | jq -r '.photoId')
UPLOAD_URL=$(echo $RESP | jq -r '.uploadUrl')

# 3. Upload to S3
dd if=/dev/urandom of=/tmp/test.bin bs=1024 count=1
curl -X PUT "$UPLOAD_URL" --data-binary @/tmp/test.bin

# 4. Complete upload
curl -X POST http://localhost:8080/api/upload/complete/$PHOTO_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileSizeBytes":1024}'

# 5. List photos
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/photos | jq .
```

---

## 14. Future Enhancements

### Post-MVP Roadmap

For detailed specifications, examples, and effort estimates, see **`docs/misc/FUTURE_ENHANCEMENTS.md`**.

**Recommended Priority Order**:

1. **Load Testing** (12 hrs) - Establish performance baselines
2. **Image Compression** (16 hrs) - 80% S3 cost savings
3. **Offline Support** (54 hrs) - Major UX improvement
4. **API Documentation** (20 hrs) - Swagger/OpenAPI integration
5. **Real-Time Features** (48 hrs) - WebSocket-based notifications

**Total Investment**: ~150 hours (~4 weeks at 40 hrs/week)

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-08 | 1.0 | Initial architecture documentation for Phase 1-3 (Backend) |
| 2025-11-09 | 2.0 | Added Phases 4-7: Web frontend, mobile frontend, production architecture |

**Completeness**: 
- ✅ Backend (Phase 1-3): Fully documented
- ✅ Web Frontend (Phase 4-5): Fully documented
- ✅ Mobile Frontend (Phase 6): Fully documented
- ✅ Production (Phase 7): Documented with link to Production Guide
- ✅ Future Enhancements: Comprehensive roadmap in separate document

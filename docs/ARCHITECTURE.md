# RapidPhotoUpload - Architecture Guide

**Status**: Phase 1-3 Backend Complete | Documentation Current as of: November 8, 2025

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Frontend Layer (React Web / React Native Mobile)              │
│  - Initiates uploads                                           │
│  - Manages local file selection                                │
│  - Polls batch status                                          │
│  - Displays gallery                                            │
│                                                                 │
└──────────────────────┬──────────────────────────────────────────┘
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
AWS_REGION=us-east-1
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

## 9. Deployment Considerations

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

## 10. Troubleshooting & Debugging

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

## 11. Testing the API

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

## 12. Future Enhancements

### Potential Additions (Not Phase 1-3)

- **WebSocket Support**: Real-time progress updates instead of polling
- **Batch Uploads via Website**: Drag-and-drop multi-file upload UI
- **Photo Metadata**: EXIF data extraction, face detection
- **Image Optimization**: Automatic thumbnail generation
- **Sharing**: Share photos with other users
- **Collections**: Organize photos into albums
- **Analytics**: Upload trends, storage usage analytics

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-08 | 1.0 | Initial architecture documentation for Phase 1-3 |

**Next Update**: After Phase 4 (Web Frontend) completion, document frontend architecture and API integration patterns.



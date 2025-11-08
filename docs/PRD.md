# RapidPhotoUpload - Implementation PRD
## AI-Assisted High-Volume Photo Upload System

---

## 1. Introduction and Project Goal

### 1.1 Project Goal
Design and implement a high-performance, asynchronous photo upload system capable of reliably handling up to 100 concurrent media uploads. This project demonstrates architectural excellence, mastery of concurrency, and exceptional user experience design across both mobile and web clients.

### 1.2 Context
This system simulates a high-volume media platform (similar to Google Photos or Drive) where users upload large batches of images while expecting the application to remain fully responsive. The project focuses on handling load, providing real-time feedback, and ensuring a clean, scalable design suitable for production environments.

---

## 2. Business Functionality

### 2.1 Problem Statement
Users expect seamless, high-speed media uploads without application freezing. The system must address the architectural complexities of concurrent file handling, status tracking, and efficient storage integration to deliver a reliable, non-blocking experience.

### 2.2 Core Functional Requirements

1. **High-Volume Concurrency**: Support simultaneous uploading of up to 100 photos per user session
2. **Asynchronous UI**: Users can continue navigating and interacting while uploads are in progress
3. **Real-Time Status**: Display individual and batch upload progress with status updates (Uploading, Failed, Complete)
4. **Web Interface**: View, tag, and download previously uploaded photos
5. **Mobile Interface**: React Native application mirroring upload and viewing functionality
6. **Backend Handling**: Manage concurrent requests, store metadata, stream/store binary files in cloud object storage
7. **Authentication**: JWT-based authentication to secure access for both clients
8. **Project Scope**: Two-part project (mobile + web) with shared backend API

---

## 3. Technical Decisions (CONFIRMED)

### 3.1 Core Stack
- **Backend**: Java 17+ with Spring Boot 3.x
- **Web Frontend**: TypeScript with React 18+ (Vite for build speed)
- **Mobile**: React Native with Expo (for rapid development)
- **Cloud Storage**: AWS S3 with presigned URLs
- **Database**: PostgreSQL with Spring Data JPA
- **Auth**: JWT with Spring Security
- **Progress Updates**: HTTP polling (1-2 second intervals)

### 3.2 Key Architectural Decisions

#### Backend Architecture
- **DDD**: Domain objects (Photo, UploadJob, User) as POJOs with business logic
- **CQRS**: Separate command handlers (UploadPhotoCommand) and query services (PhotoQueryService)
- **VSA**: Feature-based packages (e.g., `com.rapid.features.upload`, `com.rapid.features.photos`)

#### Upload Strategy: Presigned URL Approach (RECOMMENDED)
**Flow**:
1. Client requests upload URL from backend
2. Backend generates S3 presigned URL (valid 15 minutes)
3. Client uploads DIRECTLY to S3 using presigned URL
4. Client notifies backend of completion
5. Backend updates metadata in PostgreSQL

**Why This Approach**:
- ✅ Offloads 200MB+ of traffic from backend (100 photos × 2MB)
- ✅ Leverages S3's multi-part upload capabilities
- ✅ Backend remains lightweight, handles only metadata
- ✅ Natural parallelization (clients control concurrency)
- ✅ Simpler Spring Boot code (no file streaming logic)

**Alternative (NOT Recommended for Speed)**:
- Upload files through Spring Boot → stream to S3
- Requires complex async multipart handling
- Backend becomes bottleneck under 100 concurrent uploads
- More prone to memory/connection issues

#### Progress Tracking Strategy
**Implementation**: HTTP polling every 1-2 seconds
- Client polls: `GET /api/upload-jobs/{batchId}/status`
- Returns: `{ completed: 45, failed: 2, total: 100, photos: [...] }`

**Why NOT WebSockets**:
- 3-5x more implementation complexity
- Requires stateful connection management
- Harder to scale/deploy (load balancer config)
- 1-2 second latency is perfectly acceptable for upload UX
- AI agents handle REST patterns much better

---

## 4. Architecture and Technical Requirements

### 4.1 Architectural Principles (Mandatory)

1. **Domain-Driven Design (DDD)**: Core concepts modeled as robust Domain Objects
2. **CQRS**: Clear separation between commands and queries
3. **Vertical Slice Architecture**: Organize around features, not layers

### 4.2 Spring Boot Implementation Guidance

#### Key Dependencies
```xml
<!-- Core -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- AWS S3 -->
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
</dependency>

<!-- JWT -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
</dependency>

<!-- Database -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
```

#### Async Configuration
```java
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(20);
        executor.setMaxPoolSize(100);
        executor.setQueueCapacity(200);
        return executor;
    }
}
```

### 4.3 Performance Benchmarks
- **Concurrency Load**: Handle 100 photos (2MB each) within 90 seconds
- **UI Responsiveness**: Mobile and web remain fluid during peak operations

---

## 5. Implementation Phases

### **Phase 1: Backend Foundation** (Effort: HIGH)
**Goal**: Get Spring Boot API running with JWT auth and basic domain model

#### Checklist
- [ ] Initialize Spring Boot project with dependencies
- [ ] Configure PostgreSQL connection and create database
- [ ] Implement domain entities:
  - [ ] `User` entity (id, email, password hash, created_at)
  - [ ] `Photo` entity (id, user_id, s3_key, original_filename, size, status, uploaded_at)
  - [ ] `UploadBatch` entity (id, user_id, total_count, completed_count, created_at)
- [ ] Create JPA repositories for each entity
- [ ] Implement JWT authentication:
  - [ ] `POST /api/auth/register` (email, password)
  - [ ] `POST /api/auth/login` → returns JWT token
  - [ ] JWT filter for protected endpoints
- [ ] Configure Spring Security with JWT
- [ ] Add basic exception handling (@ControllerAdvice)

#### Completion Tests
- [ ] Can register new user via Postman
- [ ] Can login and receive valid JWT
- [ ] Protected endpoints reject requests without token
- [ ] Database tables created automatically (check PostgreSQL)

#### Pitfalls to Avoid
- **JWT Secret**: Use strong secret key (256-bit) stored in environment variable
- **Password Hashing**: Must use BCryptPasswordEncoder (never store plain text)
- **CORS**: Configure for React dev server (http://localhost:5173)

---

### **Phase 2: S3 Integration & Upload API** (Effort: HIGH)
**Goal**: Generate presigned URLs and track upload completion

#### Checklist
- [ ] Configure AWS S3 client with credentials
- [ ] Create S3 bucket with CORS configuration
- [ ] Implement `POST /api/upload/initiate`:
  - [ ] Input: `{ filename, fileSize, contentType, batchId? }`
  - [ ] Output: `{ uploadUrl, photoId, expiresIn }`
  - [ ] Creates Photo record with status="pending"
  - [ ] Generates presigned PUT URL (15 min expiry)
- [ ] Implement `POST /api/upload/complete/{photoId}`:
  - [ ] Verifies file exists in S3
  - [ ] Updates Photo status to "complete"
  - [ ] Updates UploadBatch completed_count
- [ ] Implement `POST /api/upload/failed/{photoId}`:
  - [ ] Updates Photo status to "failed"
  - [ ] Stores error message
- [ ] Implement `GET /api/upload/batch/{batchId}/status`:
  - [ ] Returns progress summary with photo details

#### Completion Tests
- [ ] Can request presigned URL via Postman
- [ ] Can upload file to presigned URL using curl/Postman
- [ ] Photo status updates from "pending" to "complete"
- [ ] Batch status correctly reflects progress (e.g., 3/10 complete)
- [ ] Can view uploaded file in S3 console

#### Pitfalls to Avoid
- **Presigned URL Expiry**: 15 minutes is reasonable (adjust if needed)
- **S3 CORS**: Must allow PUT from your frontend origin
- **Verification**: Always verify S3 upload success (use HeadObject API)
- **Batch Creation**: Auto-create batch if batchId not provided

---

### **Phase 3: Photo Query API** (Effort: MEDIUM)
**Goal**: Retrieve and display uploaded photos

#### Checklist
- [ ] Implement `GET /api/photos`:
  - [ ] Returns paginated list of user's photos
  - [ ] Includes presigned download URLs (valid 1 hour)
  - [ ] Sort by uploaded_at descending
- [ ] Implement `GET /api/photos/{photoId}`:
  - [ ] Returns single photo with download URL
- [ ] Implement `DELETE /api/photos/{photoId}`:
  - [ ] Deletes from S3
  - [ ] Deletes from database
  - [ ] Ensures user owns photo
- [ ] (Optional) Implement `PUT /api/photos/{photoId}/tags`:
  - [ ] Add tags to photo metadata

#### Completion Tests
- [ ] Can retrieve list of photos after uploading several
- [ ] Download URLs work (can download via browser)
- [ ] Can delete photo (removed from both S3 and DB)
- [ ] Pagination works (test with 50+ photos)

#### Pitfalls to Avoid
- **Security**: Always filter by user_id (users can't see others' photos)
- **Download URLs**: Generate fresh presigned URLs on each request
- **Pagination**: Use offset/limit or cursor-based (JPA Pageable)

---

### **Phase 4: Web Client Foundation** (Effort: HIGH)
**Goal**: React app with authentication and upload UI

#### Checklist
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install dependencies (axios, react-router, tailwind/styled-components)
- [ ] Create auth context/provider for JWT management
- [ ] Implement login/register pages:
  - [ ] Forms with validation
  - [ ] Store JWT in localStorage
  - [ ] Redirect to dashboard on success
- [ ] Create protected route wrapper
- [ ] Implement upload page:
  - [ ] File input with multiple file selection
  - [ ] Display selected files with preview thumbnails
  - [ ] "Upload" button to start batch
- [ ] Implement upload manager:
  - [ ] For each file, request presigned URL from backend
  - [ ] Upload file directly to S3 using presigned URL
  - [ ] Notify backend on success/failure
  - [ ] Track progress per file (uploaded bytes if possible)
- [ ] Display upload progress:
  - [ ] Individual progress bars per photo
  - [ ] Overall batch progress
  - [ ] Status indicators (pending, uploading, complete, failed)

#### Completion Tests
- [ ] Can register and login via web UI
- [ ] Can select 10 photos and upload them
- [ ] Progress bars update in real-time
- [ ] All 10 photos show "Complete" status
- [ ] Can logout and login again

#### Pitfalls to Avoid
- **Concurrency Control**: Limit to 5-10 simultaneous S3 uploads (not 100 at once)
- **Progress Tracking**: S3 presigned URL uploads don't give native progress (need XMLHttpRequest or fetch with streams)
- **Error Handling**: Retry failed uploads automatically (max 3 attempts)
- **Memory**: Release object URLs for thumbnails to avoid leaks

---

### **Phase 5: Web Client Photo Gallery** (Effort: MEDIUM)
**Goal**: View and manage uploaded photos

#### Checklist
- [ ] Create photo gallery page
- [ ] Fetch photos from `GET /api/photos`
- [ ] Display photos in grid layout
- [ ] Clicking photo shows full-size view (using download URL)
- [ ] Add delete button per photo
- [ ] (Optional) Add tagging UI
- [ ] Implement polling for live updates:
  - [ ] Poll batch status during active uploads
  - [ ] Update UI when uploads complete

#### Completion Tests
- [ ] Can see all previously uploaded photos
- [ ] Can view full-size image
- [ ] Can delete photo (removed from gallery)
- [ ] Gallery updates automatically when new uploads complete

#### Pitfalls to Avoid
- **Polling Efficiency**: Only poll when uploads are active
- **Image Loading**: Use lazy loading for large galleries
- **Download URLs**: They expire after 1 hour (handle gracefully)

---

### **Phase 6: Mobile App (React Native + Expo)** (Effort: HIGH)
**Goal**: Mirror web app functionality on mobile

#### Checklist
- [ ] Initialize Expo project with TypeScript
- [ ] Install dependencies (axios, expo-image-picker, expo-file-system)
- [ ] Implement auth screens (login/register)
- [ ] Create upload screen:
  - [ ] Use expo-image-picker for multi-select
  - [ ] Display thumbnails of selected photos
  - [ ] Upload button
- [ ] Implement upload logic:
  - [ ] Same flow as web (request presigned URL → upload to S3)
  - [ ] Use expo-file-system for file access
  - [ ] Track progress per photo
- [ ] Create gallery screen:
  - [ ] Fetch photos from API
  - [ ] Display in grid with expo-image
  - [ ] Tap to view full-size
- [ ] Add delete functionality
- [ ] Implement background uploads (optional but recommended)

#### Completion Tests
- [ ] Can login on iOS/Android simulator
- [ ] Can select 10 photos from device
- [ ] Can upload photos with progress tracking
- [ ] Can view gallery and delete photos
- [ ] App remains responsive during uploads

#### Pitfalls to Avoid
- **File Permissions**: Request camera/storage permissions properly
- **File URIs**: Expo uses different URI formats (file://, content://)
- **Background Uploads**: Requires expo-task-manager (add if time permits)
- **Image Sizing**: Compress large images before upload (expo-image-manipulator)

---

### **Phase 7: Testing & Polish** (Effort: MEDIUM)
**Goal**: Integration tests and production readiness

#### Checklist
- [ ] Write integration test for upload flow:
  - [ ] Simulate client requesting presigned URL
  - [ ] Upload file to S3 (use test bucket)
  - [ ] Verify photo record created
  - [ ] Verify file exists in S3
- [ ] Test concurrent uploads:
  - [ ] Script to upload 100 photos simultaneously
  - [ ] Verify all complete within 90 seconds
  - [ ] Check database consistency
- [ ] Add error handling:
  - [ ] Network failures → retry logic
  - [ ] Invalid tokens → clear session
  - [ ] S3 failures → mark as failed
- [ ] Performance testing:
  - [ ] Use JMeter or k6 to simulate load
  - [ ] Monitor database connection pool
- [ ] Documentation:
  - [ ] API documentation (Swagger/OpenAPI)
  - [ ] Setup instructions (README)
  - [ ] Architecture diagram

#### Completion Tests
- [ ] Integration tests pass with 100% success rate
- [ ] Can upload 100 photos in under 90 seconds
- [ ] No memory leaks in backend (check with profiler)
- [ ] Both clients handle network failures gracefully

---

## 6. Pitfalls & Technical Considerations

### 6.1 Spring Boot Specific Pitfalls

**Multipart File Size Limits**
- Spring Boot defaults to 1MB max file size
- Must configure in `application.properties`:
```properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=100MB
```
- **However**: With presigned URLs, files don't go through Spring Boot (no limits!)

**Database Connection Pooling**
- Default pool size (10) may be insufficient
- Configure HikariCP:
```properties
spring.datasource.hikari.maximum-pool-size=30
spring.datasource.hikari.minimum-idle=10
```

**Async Method Pitfalls**
- `@Async` methods must be in separate classes (not same bean)
- Must return `CompletableFuture<T>` or `void`
- Exceptions in async methods are swallowed (use try-catch)

**JWT Token Refresh**
- Current design uses long-lived tokens (24 hours)
- Production: implement refresh token pattern (add if time permits)

### 6.2 Frontend Pitfalls

**CORS Issues**
- Backend must allow frontend origin
- Configure in Spring Boot:
```java
@CrossOrigin(origins = "http://localhost:5173")
```

**Presigned URL Upload Progress**
- `fetch()` doesn't support upload progress natively
- Must use `XMLHttpRequest` or axios with `onUploadProgress`

**State Management**
- Avoid over-engineering (Context API is sufficient)
- Don't use Redux unless absolutely necessary

**Mobile Image Compression**
- Large photos (10MB+) should be compressed before upload
- Use expo-image-manipulator or react-native-image-resizer

### 6.3 AWS/Infrastructure Pitfalls

**S3 Bucket Configuration**
- Must enable CORS on bucket
- Example CORS config:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["PUT", "POST", "GET"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

**Presigned URL Security**
- Use `PUT` method (not `POST`) for uploads
- Set short expiry (15 minutes)
- Generate unique keys (e.g., `userId/timestamp/uuid.jpg`)

**AWS Credentials**
- Never commit credentials to git
- Use environment variables or AWS credential files
- Consider IAM roles for production (EC2, ECS)

### 6.4 AI Tool Recommendations

**When to Use AI Tools**:
- ✅ Boilerplate JPA repositories and entities
- ✅ JWT configuration setup
- ✅ React component scaffolding
- ✅ TypeScript type definitions from API responses
- ✅ Test case generation

**When NOT to Use AI Tools**:
- ❌ Core architecture decisions (DDD, CQRS patterns)
- ❌ Concurrency strategy (too nuanced)
- ❌ Security configuration (high risk of errors)
- ❌ S3 presigned URL generation (needs careful review)

**Recommended Prompt Patterns for AI Agent**:
- "Generate Spring Boot entity for Photo with JPA annotations"
- "Create React component for file upload with drag-and-drop"
- "Write integration test for photo upload endpoint"
- "Generate TypeScript types from this API response JSON"

---

## 7. Project Deliverables

### 7.1 Code Repository
- Complete, functional code repository (GitHub)
- Three components: backend, web client, mobile client
- Clear README with setup instructions
- Environment variable template (.env.example)

### 7.2 Technical Writeup (1-2 pages)
Document:
- Concurrency strategy (presigned URLs + HTTP polling)
- Asynchronous design approach (Spring @Async, React state management)
- Cloud storage interaction (S3 presigned URLs, CORS config)
- Division of logic across three components
- Architecture diagram (simple boxes/arrows)

### 7.3 Demo
- Video or live presentation showing:
  - Simultaneous upload of 20+ images
  - Real-time progress indicators on web
  - Real-time progress indicators on mobile
  - Gallery view on both platforms
  - Error handling (simulate network failure)

### 7.4 AI Tool Documentation
- List of AI tools used (e.g., Cursor, GitHub Copilot)
- Example prompts that were particularly effective
- Sections of code generated by AI (with review notes)
- Impact assessment (time saved, quality improvements)

### 7.5 Test Cases and Validation Results
- Integration test results (screenshots or CI output)
- Load test results (100 photos uploaded in X seconds)
- Evidence of successful S3 storage (S3 console screenshots)
- Database consistency checks (SQL queries showing proper state)

---

## 8. Recommended Development Order

### Priority 1 (Must Have for Demo)
1. Backend: Auth + Upload API + Query API (Phases 1-3)
2. Web Client: Auth + Upload + Gallery (Phases 4-5)
3. Integration testing with 20-50 photos

### Priority 2 (Complete System)
4. Mobile App: Full feature parity (Phase 6)
5. Load testing with 100 photos
6. Documentation and writeup

### Priority 3 (Polish)
7. Error handling and retry logic
8. UI/UX improvements
9. Optional features (tagging, background uploads)

---

## 9. Success Criteria Checklist

**Functional Requirements**:
- [ ] Can upload 100 photos concurrently
- [ ] UI remains responsive during uploads
- [ ] Real-time progress tracking works
- [ ] Web interface fully functional
- [ ] Mobile interface fully functional
- [ ] Backend handles concurrent requests
- [ ] Files stored in S3
- [ ] JWT authentication working

**Architectural Requirements**:
- [ ] DDD: Domain objects clearly defined
- [ ] CQRS: Commands and queries separated
- [ ] VSA: Code organized by feature
- [ ] Clean separation of concerns
- [ ] TypeScript strict mode enabled
- [ ] Proper error handling throughout

**Performance Requirements**:
- [ ] 100 photos upload in ≤90 seconds
- [ ] UI remains fluid throughout
- [ ] No memory leaks or connection issues

**Testing Requirements**:
- [ ] Integration tests pass
- [ ] End-to-end upload flow validated
- [ ] Load testing completed successfully

---

## 10. Quick Reference: Key Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login, receive JWT

### Upload Flow
- `POST /api/upload/initiate` - Get presigned URL
- `PUT <presigned-url>` - Upload to S3 (client → S3)
- `POST /api/upload/complete/{photoId}` - Notify completion
- `POST /api/upload/failed/{photoId}` - Notify failure
- `GET /api/upload/batch/{batchId}/status` - Poll progress

### Photo Management
- `GET /api/photos` - List user's photos (paginated)
- `GET /api/photos/{photoId}` - Get single photo
- `DELETE /api/photos/{photoId}` - Delete photo

---

## Appendix: Environment Variables

```bash
# Backend (.env)
DATABASE_URL=postgresql://localhost:5432/rapidphoto
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=yourpassword
JWT_SECRET=your-256-bit-secret-key-here
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=rapidphoto-uploads

# Frontend (.env)
VITE_API_URL=http://localhost:8080
```

---

## Final Notes

This implementation prioritizes **speed of development** while maintaining architectural principles. The presigned URL approach significantly simplifies backend complexity and leverages AWS infrastructure for heavy lifting. HTTP polling provides "real-time enough" updates without WebSocket complexity.

**Key to Success**: Nail the web application first (Phases 1-5), ensure it works flawlessly with 50+ photos, then clone the logic to mobile. The mobile app is essentially the same business logic with different UI components.

**Working with AI Agent Developer**: Provide clear, isolated tasks (e.g., "implement JWT filter", "create Photo entity") rather than large multi-file tasks. Review all security and concurrency-related code manually.

Good luck! 🚀

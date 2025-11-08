# RapidPhotoUpload - Quick Start Guide

## Project Status

✅ **Phase 1: Backend Foundation** - Complete
- Spring Boot 3.4.0 backend with JWT authentication
- Domain entities (User, Photo, UploadBatch) with JPA
- Repositories and exception handling
- Auth endpoints: `/api/auth/register`, `/api/auth/login`

✅ **Phase 2: S3 Integration & Upload API** - Complete
- AWS S3 presigned URLs for client-side uploads
- Upload workflow: initiate → upload to S3 → complete
- Batch tracking with status polling
- Endpoints: `/api/upload/initiate`, `//complete`, `/status`

✅ **Phase 3: Photo Query API** - Complete
- Photo listing with pagination
- Presigned download URLs
- Photo deletion with S3 cleanup
- Endpoints: `GET/DELETE /api/photos`

**Build Status**: ✅ 34 source files, 71MB JAR, 0 compilation errors

🚀 **Next**: Run tests using TESTING_GUIDE.md

---

## Prerequisites

**System Requirements**:
- Java 17+ (check: `java -version`)
- Node.js 18+ (for web/mobile later)
- PostgreSQL 13+ running locally or Docker
- Git

**AWS Setup** (required for Phase 2+):
1. Create AWS S3 bucket: `rapidphotoupload-adamisom` (or your bucket name)
2. Enable CORS on bucket:
   - Go to AWS Console → S3 → Your Bucket → Permissions → CORS
   - Add configuration:
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
3. Export AWS credentials from local config:
   ```bash
   # If you've run 'aws configure' before, credentials are in ~/.aws/credentials
   export AWS_ACCESS_KEY_ID=$(grep 'aws_access_key_id' ~/.aws/credentials | awk '{print $NF}')
   export AWS_SECRET_ACCESS_KEY=$(grep 'aws_secret_access_key' ~/.aws/credentials | awk '{print $NF}')
   
   # Verify they're set (should not be empty)
   echo $AWS_ACCESS_KEY_ID
   echo $AWS_SECRET_ACCESS_KEY
   ```
4. Set remaining variables:
   ```bash
   export AWS_REGION=us-east-1
   export AWS_S3_BUCKET=rapidphotoupload-adamisom
   ```

---

## Project Structure

```
rapid-photo-upload/
├── backend/              ← Phase 1-3: Backend API (currently here)
├── web/                  ← Phase 4-5: React frontend (empty)
├── mobile/               ← Phase 6: React Native (empty)
├── IMPLEMENTATION_TASK_GUIDE.md  ← Detailed subtasks
├── README.md
├── QUICK_START.md        ← You are here
├── docker-compose.yml    ← PostgreSQL setup
└── env.example
```

---

## Getting Started

### 1. Start PostgreSQL

**Option A: Docker (Recommended)**
```bash
docker-compose up -d
# Database ready at localhost:5432
```

**Option B: Local Installation**
```bash
# macOS with Homebrew
brew services start postgresql

# Verify
psql --version
```

**Create Database**:
```bash
createdb rapidphoto_dev
# Or via psql:
# psql -U postgres
# # CREATE DATABASE rapidphoto_dev;
```

### 2. Build Backend

```bash
cd backend

# Using Maven wrapper (no Maven install needed)
./mvnw clean install

# Build takes ~2 minutes first run (downloading dependencies)
```

### 3. Start Backend API

```bash
# From backend/ directory
./mvnw spring-boot:run

# Expected output:
# - Started RapidPhotoApiApplication in X.XXX seconds
# - Tomcat initialized with port(s): 8080
```

Backend ready at: **http://localhost:8080**

### 4. Test Backend with Curl

```bash
# Register new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Expected response:
# {
#   "token": "eyJhbGciOiJIUzUxMiJ9...",
#   "userId": "550e8400-e29b-41d4-a716-446655440000",
#   "email": "test@example.com"
# }

# Copy the token and use for protected endpoints
TOKEN="your-token-here"

# Get photos (should be empty)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/photos
```

---

## Implementation Guide

Detailed specifications are in `IMPLEMENTATION_TASK_GUIDE.md`.

### Phase Status

| Phase | Status | Details |
|-------|--------|---------|
| 1: Backend Foundation | ✅ Complete | Auth, domain entities, repositories, exception handling |
| 2: S3 Integration | ✅ Complete | Presigned URLs, upload workflow, batch tracking |
| 3: Photo Query API | ✅ Complete | Listing, pagination, downloads, deletion |
| 4: Web Frontend | ⏳ Pending | React SPA |
| 5: Mobile App | ⏳ Pending | React Native |

**To test Phase 2 & 3**: Follow TESTING_GUIDE.md after backend is running.

---

## Environment Variables Setup

### ⚠️ Required: JWT Secret

The `JWT_SECRET` environment variable **must be set** before running the backend. It requires a minimum 64 characters (512 bits) for HS512 algorithm security.

```bash
export JWT_SECRET=$'your-minimum-64-character-jwt-secret-key-for-hs512-algorithm'
```

### Optional: Other Environment Variables

For local development, sensible defaults are provided in `application.properties`:
- Database: `localhost:5432`, user `postgres`, password `postgres`
- AWS S3: Empty (not needed until Phase 2)

To override any default:

```bash
# Database
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="rapidphoto_dev"
export DB_USERNAME="postgres"
export DB_PASSWORD="postgres"

# AWS S3 (required for Phase 2 onwards)
export AWS_REGION="us-east-1"
export AWS_S3_BUCKET="rapidphotoupload-adamisom"
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
```

### Setup Instructions

**Option A: Using .env file (Recommended for development)**

1. Copy the template:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your actual values (especially `JWT_SECRET`)

3. Load environment variables in your terminal:
   ```bash
   export $(cat .env | xargs)
   ```

4. Verify it worked:
   ```bash
   echo $JWT_SECRET
   ```

**Option B: Export in shell profile (Permanent)**

1. **Add to your shell profile** (~/.zshrc, ~/.bash_profile, etc.):
   ```bash
   export JWT_SECRET=$'your-minimum-64-character-jwt-secret-key-for-hs512-algorithm'
   ```

2. **Reload shell**:
   ```bash
   source ~/.zshrc  # or ~/.bash_profile
   ```

3. **Verify it's set**:
   ```bash
   echo $JWT_SECRET
   ```

**Note**: `.env` file is gitignored—never commit it to git!

### Design: Single Environment, Secrets from Env Vars

- `application.properties` - single config file, all environments (committed to git)
- All sensitive values come from environment variables (`${VAR_NAME}`)
- Secrets are **never** in the properties file
- Works identically for development, staging, production
- `.env` files gitignored for local development

### Spring Boot Property Resolution

Spring Boot reads properties in this order (later overrides earlier):
1. `application.properties` (base config, committed to git)
2. Environment variables (e.g., `JWT_SECRET=xxx`, `DB_PASSWORD=xxx`)
3. Command line (e.g., `-DJWT_SECRET=xxx`)

All required secrets must come from environment variables.

---

## Troubleshooting

### "Connection refused" on port 5432
- PostgreSQL not running
- Solution: `docker-compose up -d` or check local postgres

### "Could not resolve placeholder 'jwt.secret'"
- Missing `JWT_SECRET` environment variable
- Solution: Export it: `export JWT_SECRET=dev-key-minimum-32-chars`

### Port 8080 already in use
- Another app using port 8080
- Solution: Change in `application.properties` → `server.port=8081`

### Maven build fails with "Cannot resolve symbol"
- IDE caching issue
- Solution: `./mvnw clean install` and refresh IDE

### S3 access errors (Phase 2+)
- Wrong AWS credentials, bucket doesn't exist, or CORS not enabled
- Solution: Verify AWS credentials, S3 bucket exists, and CORS is configured (see Prerequisites)

---

## Development Workflow

### During Implementation

1. **Make code changes** in `backend/src/main/java/com/rapid/...`

2. **Rebuild** (Spring Boot hot reloads properties):
   ```bash
   ./mvnw clean install  # Full rebuild
   # or in IDE: Ctrl+Shift+F10 (Run)
   ```

3. **Test changes**:
   - Restart backend: `./mvnw spring-boot:run`
   - Use curl, Postman, or web client

4. **Commit regularly**:
   ```bash
   git add backend/src/...
   git commit -m "Implement JWT authentication"
   ```

### IDE Setup (Optional but Recommended)

**IntelliJ IDEA** (Community or Ultimate):
1. File → Open → rapid-photo-upload/backend
2. Select JDK 17+
3. Maven automatically recognizes pom.xml
4. Right-click pom.xml → Run Maven → Goals → `clean install`

**VS Code**:
- Extension: "Extension Pack for Java"
- Opens terminal with `./mvnw spring-boot:run`

---

## API Endpoints Quick Reference

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token

### Upload (Phase 2)
- `POST /api/upload/initiate` - Get presigned URL
- `POST /api/upload/complete/{photoId}` - Mark upload done
- `POST /api/upload/failed/{photoId}` - Report failure
- `GET /api/upload/batch/{batchId}/status` - Poll progress

### Photos (Phase 3)
- `GET /api/photos` - List user's photos (paginated)
- `GET /api/photos/{photoId}` - Get single photo
- `DELETE /api/photos/{photoId}` - Delete photo

All endpoints except `/api/auth/**` require `Authorization: Bearer {token}` header.

---

## Next Steps

### For AI Implementation

1. **Start with Task 1.3**: Create domain entities (User, Photo, UploadBatch)
   - File location: `backend/src/main/java/com/rapid/domain/`
   - Reference: `IMPLEMENTATION_TASK_GUIDE.md` Task 1.3

2. **Then 1.4**: Create JPA repositories
   - File location: `backend/src/main/java/com/rapid/infrastructure/repository/`
   - Reference: `IMPLEMENTATION_TASK_GUIDE.md` Task 1.4

3. **Then 1.5**: Implement JWT authentication
   - File location: `backend/src/main/java/com/rapid/security/`
   - Reference: `IMPLEMENTATION_TASK_GUIDE.md` Task 1.5

**Important**: Follow the exact file paths and class names from the implementation guide for consistency.

---

## Testing Commands (Postman or curl)

### Register
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123456"}'
```

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123456"}'
```

### Protected Endpoint (substitute TOKEN from login response)
```bash
TOKEN="eyJhbGciOiJIUzUxMiJ9..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/photos
```

---

## Documentation Reference

### Key Documents
- **TESTING_GUIDE.md** ← Start here to test all endpoints
- **PHASE_2_3_COMPLETE.md** - Implementation details (classes, methods, endpoints)
- **PHASE_2_3_SESSION_SUMMARY.md** - Session work summary
- **IMPLEMENTATION_TASK_GUIDE.md** - Original specifications (Phases 1-3)
- **PRD.md** - Product requirements

### External Resources
- **Spring Boot**: https://spring.io/projects/spring-boot
- **JWT + Spring Security**: https://www.baeldung.com/spring-security-authentication-and-registration
- **AWS S3 SDK**: https://docs.aws.amazon.com/sdk-for-java/

---

## Useful Commands

```bash
# View database
psql -U postgres -d rapidphoto_dev
# In psql: \dt (list tables), SELECT * FROM users;

# View logs (backend running)
tail -f backend/target/application.log

# Reset database
dropdb rapidphoto_dev && createdb rapidphoto_dev

# Kill port 8080
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

---

**Status**: Phases 1-3 complete. Backend API ready for testing.  
**Next Step**: Follow TESTING_GUIDE.md to verify all functionality works.


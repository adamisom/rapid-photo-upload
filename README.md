# RapidPhotoUpload - High-Volume Photo Upload System

A production-ready, AI-assisted monorepo featuring concurrent multi-file uploads for web and mobile platforms.

---

## 🚀 **Live Production Deployment**

**The app is deployed and running on Railway!**

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | https://rapid-photo-upload-production.up.railway.app | ✅ Live |
| **Web Frontend** | https://web-frontend-rapid-photo-upload-production.up.railway.app | ✅ Live |
| **Database** | Railway PostgreSQL | ✅ Running |
| **Storage** | AWS S3 (us-east-2) | ✅ Connected |

**Try it now:** Visit the web frontend to register, login, and upload photos!

**Tech Stack:**
- Backend: Java 17 + Spring Boot 3 + PostgreSQL
- Frontend: React 18 + TypeScript + Vite
- Mobile: React Native + Expo
- Cloud: Railway (hosting) + AWS S3 (storage)

**Deployment Guide:** See [DEPLOY.md](DEPLOY.md) for deployment commands and setup.

---

## ⚠️ **AWS Cost Control - Built-In Limits**

**To prevent runaway AWS bills, the following hard limits are enforced globally (across all users):**

| Limit Type | Value | Error Message |
|------------|-------|---------------|
| **Max Users** | 50 total users | "Can't register more users at this time" |
| **Max Photos** | **30,000 total photos** | "You've reached your image limit" |
| **Max Storage** | 500 GB total | "You've reached your image limit" |
| **Max File Size** | 1.1 GB per file | "Image too large (max 1.1 GB)" |

**⚠️ Important for Testing:** The photo limit is a **global, all-time limit** across all users. If you hit the limit during testing, use `backend/scripts/delete-all-photos.sh` to clear all photos.

These limits are checked server-side before any upload or registration occurs. See `LimitsService.java` for implementation details.

---

## 📚 **Essential Documentation**

### For Evaluators & Technical Review:

#### 🎯 **[ARCHITECTURE_DETAILS.md](docs/misc/ARCHITECTURE_DETAILS.md)** - Architectural Patterns Deep-Dive
Comprehensive explanation of DDD, CQRS, and Vertical Slice Architecture implementation.

**Contains:**
- Domain-Driven Design with rich entities (User, Photo, UploadBatch)
- CQRS separation (Command vs Query services)
- Vertical Slice Architecture (feature-based organization)
- Concurrency handling with atomic operations
- Metadata storage strategy
- 5-minute evaluator quick reference

#### 🚀 **[TECHNICAL_WRITEUP.md](docs/misc/TECHNICAL_WRITEUP.md)** - Design Decisions & System Design
High-level technical decisions, trade-offs, and "why" behind the architecture.

**Contains:**
- Concurrency strategy (presigned URLs, atomic batch creation)
- Asynchronous design (non-blocking I/O, HTTP polling)
- Cloud storage integration (S3 flow, CORS, security, cost analysis)
- Division of logic (Backend/Frontend/S3 responsibilities)
- Visual diagrams (5-step upload flow, system architecture)
- Load test results (100 photos × 2MB performance metrics)

#### 📖 **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Complete System Architecture
Full technical architecture guide with implementation details.

#### 🧪 **[SMOKE_TEST_GUIDE.md](docs/misc/SMOKE_TEST_GUIDE.md)** - Quick Verification Guide
Concise 10-15 minute smoke test guide for recent performance fixes and optimizations.

**Tests**:
- Pagination accuracy (excludes PENDING/FAILED photos)
- Upload state persistence (localStorage)
- 20 concurrent uploads (4x faster)
- Pre-requested URLs (eliminates bottleneck)
- Batched complete notifications (10x fewer requests)

#### 🤖 **[AI_TOOLS_USED.md](docs/misc/AI_TOOLS_USED.md)** - Human-AI Collaboration Story
Development process, bugs fixed, and lessons learned from AI-assisted development.

**Contains:**
- Development process across 6 phases (planning → backend → frontend → testing → docs)
- 5 critical bugs fixed through human testing (state timing, race conditions, progress calculation)
- Human decisions vs AI implementation (who decided what, how patterns were applied)
- Code quality metrics (34 backend files, ~2000 web lines, ~2500 mobile lines)
- AI strengths (rapid prototyping, pattern implementation) vs Human value-add (requirements, testing, UX)
- Time savings: 20-30 hours collaboration vs 2-3 weeks manual work

---

## Project Structure

```
rapid-photo-upload/
├── backend/              # Java Spring Boot API
│   ├── pom.xml
│   └── src/
├── web/                  # React + Vite frontend (Phase 4)
│   ├── package.json
│   └── src/
├── mobile/               # React Native + Expo (Phase 6)
│   ├── package.json
│   └── src/
├── 100-test-images/      # Test images for upload testing (small batch)
├── docs/misc/LARGE_BATCH_TESTING.md  # Guide for 1000+ image testing
├── docker-compose.yml    # PostgreSQL + services
├── .env.example          # Environment variables template
└── README.md
```

## Test Images

The `100-test-images/` folder contains sample images for testing upload functionality:
- **100 total images** for testing medium batch uploads
- **Most images**: Small ImageNet samples (50-300KB)
- **12 pexels_* files**: High-resolution photos (1-3MB each) for realistic testing

Use these images to test:
- Single file uploads
- Batch uploads (10-20 files)
- Medium session support (100 files)
- Progress tracking and time estimates

### Testing with 1000+ Images

For large batch testing (1000+ images), see **[LARGE_BATCH_TESTING.md](docs/misc/LARGE_BATCH_TESTING.md)** which provides:
- Links to free Kaggle datasets (Natural Images, Caltech 101, etc.)
- Download instructions
- Testing scenarios and expected performance
- Troubleshooting guide

**Recommended Dataset**: [Natural Images on Kaggle](https://www.kaggle.com/datasets/prasunroy/natural-images) - 8,000+ real-world photos perfect for testing.

## Quick Start

### Prerequisites

- Java 17+ with Maven
- Node.js 18+
- PostgreSQL 13+
- AWS credentials (S3 bucket)

### Backend Setup

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Backend runs at `http://localhost:8080`

### Web Frontend Setup (Phase 4)

```bash
cd web
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### Mobile Frontend Setup (Phase 6)

```bash
cd mobile
npm install
npm start
```

## Architecture Overview

- **Backend**: Java 17 + Spring Boot 3.4.x (DDD, CQRS, VSA)
- **Web**: React 18 + TypeScript + Vite
- **Mobile**: React Native + Expo + TypeScript
- **Storage**: AWS S3 with presigned URLs
- **Database**: PostgreSQL with Spring Data JPA
- **Auth**: JWT with Spring Security

## Implementation Phases

1. **Phase 1**: Backend Foundation (Auth + Domain Model)
2. **Phase 2**: S3 Integration & Upload API
3. **Phase 3**: Photo Query & Gallery API
4. **Phase 4**: Web Client (React)
5. **Phase 5**: Web Client Gallery
6. **Phase 6**: Mobile Client (React Native)
7. **Phase 7**: Testing & Polish

## Key Features

✅ **Concurrent uploads up to 100 files** - Direct-to-S3 with presigned URLs  
✅ **Real-time progress tracking** - Byte-based progress with ETA calculations  
✅ **Photo tagging** - Up to 3 tags per photo with autocomplete suggestions  
✅ **Retry failed uploads** - Graceful error handling with one-click retry  
✅ **Upload batch history** - Track and review previous upload sessions  
✅ **JWT authentication** - Secure token-based auth with Spring Security  
✅ **Responsive UI** - Works seamlessly on web and mobile  
✅ **Full CRUD for photos** - Upload, view, tag, download, and delete  
✅ **Load tested** - Verified with 100 concurrent uploads × 2MB files  

## CHANGELOG

### November 13, 2025 - Performance Optimizations

**60-70% faster uploads for large batches (1000+ files)**

#### Key Optimizations Implemented

1. **Pre-Requested Presigned URLs**
   - All URLs requested upfront in parallel batches (50 at a time)
   - Eliminates sequential bottleneck (50-100 seconds saved for 1000 files)
   - Uploads start immediately after URLs ready (~2-3 seconds)

2. **Batched Complete Notifications**
   - Batch complete requests (5 items or 1s interval) instead of individual requests
   - 10x fewer HTTP requests (100 vs 1000 for 1000 files)
   - 20-30 seconds saved per large batch

3. **Event-Driven Queue**
   - Replaced 100ms polling with 10ms event-driven checks
   - Faster slot utilization, 5-10 seconds saved

4. **20 Concurrent Uploads**
   - Increased from 5 to 20 concurrent S3 uploads
   - 4x faster upload throughput

**Performance Results:**
- 100 files: ~10 min → ~2.5 min (75% faster)
- 500 files: ~50 min → ~12.5 min (75% faster)
- 1000 files: ~100 min → ~25 min (75% faster)

**Technical Changes:**
- Backend: New `/api/upload/complete/batch` endpoint
- Frontend: Refactored `useUpload` hook with parallel URL requests
- Mobile: Full feature parity with web optimizations

## What Makes This Special?

### 🏗️ Enterprise Architecture Patterns
- **Domain-Driven Design (DDD)**: Rich domain entities with clear aggregate boundaries
- **CQRS**: Separate read/write operations for optimal performance
- **Vertical Slice Architecture**: Features organized as independent slices

### ⚡ Performance & Scalability
- **Presigned URLs**: Offload 99% of bandwidth to S3 (backend stays lightweight)
- **Atomic Operations**: `ON CONFLICT DO NOTHING` handles race conditions elegantly
- **Non-blocking I/O**: Async throughout (backend NIO, frontend parallel uploads)
- **Byte-based Progress**: Accurate progress even with mixed file sizes

### 🐛 Battle-Tested
- Fixed 5 critical bugs through extensive manual testing
- Load tested with 100 concurrent uploads (200MB total)
- Handles edge cases: partial failures, retries, stale state

### 🤖 AI-Assisted Development
- Built with Cursor IDE + Claude Sonnet 3.5
- 20-30 hours of human-AI collaboration
- Comprehensive documentation of the process  

## Environment Variables

See `.env.example` for full configuration.

```bash
# Backend
DATABASE_URL=postgresql://localhost:5432/rapidphoto_dev
JWT_SECRET=your-256-bit-secret
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-2
AWS_S3_BUCKET=rapidphotoupload-adamisom

# Web Frontend
VITE_API_URL=http://localhost:8080
```

## Documentation

- **Implementation Guide**: See `IMPLEMENTATION_TASK_GUIDE.md` for detailed Phase 1-3 tasks
- **PRD**: See `RapidPhotoUpload_Implementation_PRD.md` for full specification

## Testing

### Manual Testing (Web UI)

1. Start backend: `cd backend && mvn spring-boot:run`
2. Start web: `cd web && npm run dev`
3. Open `http://localhost:5173`
4. Register and login
5. Upload test images from `100-test-images/` folder

### Load Testing Script

Test concurrent upload performance with the automated load test:

```bash
# Run load test with 100 photos × 2MB
./scripts/load-test.sh

# Run custom load test
./scripts/load-test.sh 50 1    # 50 photos × 1MB
./scripts/load-test.sh 200 5   # 200 photos × 5MB
```

**Requirements**:
- `jq` installed: `brew install jq`
- Backend running on `localhost:8080`
- PostgreSQL and S3 configured

**What it tests**:
- Concurrent upload initiation (100 presigned URLs in <90s)
- Parallel S3 uploads (10 at a time)
- Database integrity (batch status, photo records)
- End-to-end upload flow

### Database Management

**Clean database before testing**:

```bash
# Delete all photos and batches (keeps users)
./backend/scripts/delete-all-photos.sh
```

This is useful when you want to:
- Start fresh for a new load test
- Clear test data
- Reset upload counts

### API Testing (Postman/curl)

1. Register user: `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Initiate upload: `POST /api/upload/initiate`
4. Complete upload: `POST /api/upload/complete/{photoId}`
5. Poll status: `GET /api/upload/batch/{batchId}/status`
6. List photos: `GET /api/photos`

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend Runtime | Java 17 |
| Backend Framework | Spring Boot 3.4.x |
| Web Runtime | Node.js 18+ |
| Web Framework | React 18 + TypeScript |
| Mobile Runtime | React Native |
| Mobile Framework | Expo |
| Database | PostgreSQL 13+ |
| Cloud Storage | AWS S3 |
| Authentication | JWT + Spring Security |
| Build (Backend) | Maven 3.8+ |
| Build (Web) | Vite |
| Build (Mobile) | Expo CLI |

## Development Notes

- Each project directory (`backend`, `web`, `mobile`) is independent
- Run each in its own terminal
- Backend must be running for frontend to work
- PostgreSQL must be running (use `docker-compose up` for convenience)

## Contributing

This project demonstrates enterprise-grade architectural patterns:
- **Domain-Driven Design (DDD)** for domain modeling
- **CQRS** for command/query separation  
- **Vertical Slice Architecture** for feature organization

### Code Quality Standards

✅ All services follow CQRS pattern (CommandService vs QueryService)  
✅ Domain entities have comprehensive JavaDoc  
✅ No console.logs in production code (only console.error for debugging)  
✅ All tests pass (`mvn clean install` shows 0 errors)  
✅ Load test verified with 100 concurrent uploads  

### Pull Request Guidelines

1. **Follow existing patterns**: Match the DDD/CQRS/VSA structure
2. **Add tests**: Unit tests for services, integration tests for flows
3. **Update docs**: Keep ARCHITECTURE.md in sync with code changes
4. **Security review**: Manually review any auth/security code
5. **Test concurrency**: Use `load-test.sh` to verify high-load scenarios

### AI-Assisted Development

This project was built with AI assistance (Cursor IDE + Claude Sonnet 3.5). See [AI_TOOLS_USED.md](docs/misc/AI_TOOLS_USED.md) for the full story of human-AI collaboration, including bugs fixed and lessons learned.

## License

MIT License - See LICENSE file for details.



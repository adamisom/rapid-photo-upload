# RapidPhotoUpload - High-Volume Photo Upload System

A production-ready, AI-assisted monorepo featuring concurrent multi-file uploads for web and mobile platforms.

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
├── 100-test-images/      # Test images for upload testing
├── docker-compose.yml    # PostgreSQL + services
├── .env.example          # Environment variables template
└── README.md
```

## Test Images

The `100-test-images/` folder contains sample images for testing upload functionality:
- **100 total images** for testing large batch uploads
- **Most images**: Small ImageNet samples (50-300KB)
- **12 pexels_* files**: High-resolution photos (1-3MB each) for realistic testing

Use these images to test:
- Single file uploads
- Batch uploads (10-20 files)
- Large session support (100 files)
- Progress tracking and time estimates

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

✅ Concurrent uploads up to 100 files  
✅ Real-time progress tracking  
✅ Presigned S3 URLs (offloads bandwidth)  
✅ JWT authentication  
✅ Responsive UI on web and mobile  
✅ Full CRUD for photos  

## Environment Variables

See `.env.example` for full configuration.

```bash
# Backend
DATABASE_URL=postgresql://localhost:5432/rapidphoto_dev
JWT_SECRET=your-256-bit-secret
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
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

This project is AI-assisted. All code follows architectural patterns defined in the PRD:

- Domain-Driven Design (DDD) for domain modeling
- CQRS for command/query separation
- Vertical Slice Architecture for feature organization

Review AI-generated security code manually before committing.

## License

[Your License Here]


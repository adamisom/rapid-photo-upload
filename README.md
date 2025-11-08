# RapidPhotoUpload - High-Volume Photo Upload System

A production-ready, AI-assisted monorepo featuring concurrent multi-file uploads for web and mobile platforms.

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
├── docker-compose.yml    # PostgreSQL + services
├── .env.example          # Environment variables template
└── README.md
```

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
AWS_S3_BUCKET=rapidphoto-dev

# Web Frontend
VITE_API_URL=http://localhost:8080
```

## Documentation

- **Implementation Guide**: See `IMPLEMENTATION_TASK_GUIDE.md` for detailed Phase 1-3 tasks
- **PRD**: See `RapidPhotoUpload_Implementation_PRD.md` for full specification

## Testing

### Manual Testing (Postman)

1. Register user: `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Initiate upload: `POST /api/upload/initiate`
4. Complete upload: `POST /api/upload/complete/{photoId}`
5. Poll status: `GET /api/upload/batch/{batchId}/status`
6. List photos: `GET /api/photos`

### Load Testing

Upload 100 concurrent files and verify completion within 90 seconds.

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


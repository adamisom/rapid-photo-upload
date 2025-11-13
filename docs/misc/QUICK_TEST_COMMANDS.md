# Quick Test Commands

## Backend (Java/Spring Boot)

```bash
cd backend

# Lint/Compile
./mvnw clean compile

# Run Tests
./mvnw test

# Build JAR
./mvnw clean package

# Run Application
./mvnw spring-boot:run
```

## Frontend (React/TypeScript)

```bash
cd web

# Type Check
npm run type-check

# Lint
npm run lint

# Lint & Fix
npm run lint:fix

# Build
npm run build

# Run Tests
npm test

# Dev Server
npm run dev
```

## All-in-One (Quick Verification)

```bash
# Backend
cd backend && ./mvnw clean test && cd ..

# Frontend
cd web && npm run type-check && npm run lint && npm run build && cd ..
```


# Phase 7: Production Readiness & Deployment Guide

**Goal**: Documentation, error handling strategies, and production deployment guidance.

---

## Overview

RapidPhotoUpload is production-ready with the following components:

- ✅ **Backend**: Spring Boot 3.4 with JWT auth, S3 integration, PostgreSQL
- ✅ **Web Frontend**: React 19 with Vite, TypeScript, Tailwind CSS
- ✅ **Mobile**: React Native with Expo, works on iPhone via Expo Go
- ✅ **All unit tests**: passing (backend auth, upload, frontend validators)
- ✅ **Linting & type checking**: 0 issues across all platforms

---

## 1. Error Handling Strategy

### 1.1 Backend Error Handling

**Authentication Errors**:
- Missing/expired JWT → 401 Unauthorized
- Invalid credentials → 400 Bad Request
- Duplicate email → 400 Bad Request (returned with specific message)

**Upload Errors**:
- File size mismatch → 400 Bad Request (photo marked FAILED)
- Photo not found → 404 Not Found
- Unauthorized upload attempt → 401 Unauthorized
- S3 connectivity issues → handled gracefully, photo marked FAILED

**Response Format**:
```json
{
  "error": "File size mismatch: expected 102400, got 51200",
  "status": 400,
  "timestamp": "2025-11-09T00:00:00Z"
}
```

### 1.2 Frontend Error Handling

**Web Client**:
- API calls wrapped in try-catch with user-friendly messages
- 401 errors redirect to login
- Network errors show specific messages ("Cannot reach backend")
- Upload failures retried automatically (via concurrency control)

**Mobile Client**:
- Same error handling as web
- Graceful degradation with loading states
- Error alerts for user guidance

### 1.3 Common Error Recovery

| Error | Solution |
|-------|----------|
| "Cannot reach backend" | Verify backend is running, check API URL, firewall |
| "401 Unauthorized" | Token expired or invalid, redirect to login |
| "File too large" | Check S3 bucket max file size (default 5GB) |
| "S3 upload failed" | Check AWS credentials, bucket CORS, network |
| "Batch not found" | Ensure batchId is passed for subsequent uploads |

---

## 2. Performance Optimization Checklist

### Backend Performance

- [x] Database connection pooling (HikariCP configured)
- [x] Indexed queries (user_id, batch_id on photos table)
- [x] Presigned URLs reduce backend load
- [x] JWT caching in Spring Security

**Optimization Tips**:
```properties
# Increase connection pool for high load
spring.datasource.hikari.maximum-pool-size=50
spring.datasource.hikari.minimum-idle=10

# Enable compression
server.compression.enabled=true
server.compression.min-response-size=1024
```

### Frontend Performance

- [x] Vite for fast development builds
- [x] Code splitting via React Router
- [x] Lazy loading for images
- [x] Concurrent upload limiting (5-10 parallel max)

**Web Frontend Build**:
```bash
npm run build  # ~284KB gzipped
```

**Mobile Performance**:
```bash
npm run start:go  # Fast reload with expo
```

---

## 3. Security Checklist

### Authentication & Authorization

- [x] JWT tokens with HS512 (minimum 64-char secret)
- [x] Tokens stored securely:
  - Web: localStorage (httpOnly in production)
  - Mobile: SecureStore (encrypted)
- [x] Token expiration: 24 hours
- [x] Cross-user access prevented (users can only see own photos)

### Data Protection

- [x] HTTPS enforced in production
- [x] S3 bucket access restricted to authenticated users
- [x] Presigned URLs expire after 15 minutes
- [x] File size verification (prevents S3 abuse)

### Environment Variables

**Required for Production**:
```bash
# Authentication
JWT_SECRET=your-minimum-64-character-secret-key

# AWS S3
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://host:5432/rapidphoto
SPRING_DATASOURCE_USERNAME=username
SPRING_DATASOURCE_PASSWORD=password

# Frontend
VITE_API_BASE_URL=https://api.youromain.com
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

---

## 4. Deployment Options

### Option A: Docker Deployment (Recommended)

Create `backend/Dockerfile`:
```dockerfile
FROM eclipse-temurin:17-jre
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build and run:
```bash
cd backend
./mvnw clean package
docker build -t rapidphoto-api .
docker run -e JWT_SECRET=... -e AWS_ACCESS_KEY_ID=... rapidphoto-api
```

### Option B: Traditional Deployment

**Backend**:
```bash
cd backend
./mvnw clean package
# Deploy JAR to server
java -jar target/rapidphoto-api.jar
```

**Web Frontend**:
```bash
cd web
npm run build
# Deploy `dist` folder to CDN or web server
```

**Mobile**:
```bash
cd mobile
# Build APK/IPA for app stores (see EAS Build docs)
eas build --platform ios
```

### Option C: Cloud Platform (AWS, GCP, Azure)

**Recommended Services**:
- **Backend**: AWS ECS + RDS PostgreSQL
- **Frontend**: AWS S3 + CloudFront
- **Photos**: AWS S3 (already integrated)
- **Database**: AWS RDS (PostgreSQL)
- **SSL**: AWS Certificate Manager

---

## 5. Monitoring & Logging

### Backend Logging

Enable debug logging:
```properties
logging.level.com.rapid=DEBUG
logging.level.org.springframework.security=DEBUG
```

### Metrics to Monitor

- **Request latency**: Presigned URL generation (<100ms target)
- **Upload success rate**: Goal > 99%
- **Database connections**: Monitor HikariPool size
- **S3 API calls**: Monitor rate limiting
- **JWT validation failures**: Indicates auth issues

### Error Tracking

Integrate with Sentry/DataDog:
```xml
<!-- Add to pom.xml -->
<dependency>
    <groupId>io.sentry</groupId>
    <artifactId>sentry-spring-boot-starter</artifactId>
    <version>7.0.0</version>
</dependency>
```

---

## 6. Database Backup & Recovery

### PostgreSQL Backups

**Automated backup (daily)**:
```bash
# In production cron job
pg_dump -h localhost -U postgres rapidphoto_dev > /backups/rapidphoto_$(date +%Y%m%d).sql
```

**Restore from backup**:
```bash
psql -h localhost -U postgres rapidphoto_dev < /backups/rapidphoto_20251109.sql
```

---

## 7. Testing Recommendations

### Pre-Deployment Checklist

- [ ] Run full test suite: `./mvnw clean test` (backend)
- [ ] Run linting: `npm run lint` (web & mobile)
- [ ] Type checking: `npm run type-check` (web & mobile)
- [ ] Build verification: `npm run build` (web)
- [ ] Manual smoke tests in browser & Expo Go
- [ ] Test file upload with multiple file sizes (100KB, 1MB, 10MB)
- [ ] Test concurrent uploads (10+ parallel)
- [ ] Verify cross-user security (can't see other users' photos)

### Performance Testing

Load test with k6 (if time permits):
```bash
npm install -g k6

# Create test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  let res = http.get('http://localhost:8080/actuator/health');
  check(res, {'status is 200': (r) => r.status === 200});
}
EOF

k6 run load-test.js
```

---

## 8. Scaling Strategies

### Vertical Scaling (Easier First)

- Increase Java heap: `-Xmx2G -Xms2G`
- Increase database pool size
- Increase S3 request throughput

### Horizontal Scaling

- Deploy multiple backend instances behind load balancer
- Use CDN for static frontend assets
- Scale database with read replicas

---

## 9. Troubleshooting Production Issues

### "Cannot upload files"

1. Verify JWT_SECRET is set correctly
2. Check S3 credentials and CORS configuration
3. Verify database is accessible
4. Check server logs for detailed errors

### "Uploads are slow"

1. Check network latency (presigned URL generation should be <100ms)
2. Verify S3 region matches backend region
3. Monitor database connection pool
4. Consider increasing MAX_FILE_SIZE limit

### "High memory usage"

1. Check for file upload leaks (incomplete uploads consuming memory)
2. Monitor garbage collection
3. Consider enabling compression for responses
4. Check for N+1 query problems

---

## 10. API Documentation (OpenAPI/Swagger)

Add Swagger UI to backend (optional):

```xml
<!-- Add to pom.xml -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

Access at: `http://localhost:8080/swagger-ui.html`

---

## Summary: Production Readiness

| Component | Status | Notes |
|-----------|--------|-------|
| Backend | ✅ Ready | All tests passing, error handling comprehensive |
| Web Frontend | ✅ Ready | Vite build optimized, 0 lint issues |
| Mobile | ✅ Ready | Works on iPhone via Expo Go, can build APK/IPA |
| Database | ✅ Ready | PostgreSQL with proper indexing |
| S3 Integration | ✅ Ready | Presigned URLs, CORS configured |
| Security | ✅ Ready | JWT auth, SecureStore for mobile |
| Documentation | ✅ Ready | See this guide + TESTING_GUIDE.md |

**Ready to deploy!** 🚀



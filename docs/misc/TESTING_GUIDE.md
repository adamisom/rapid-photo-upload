# 🧪 Development Testing Guide

Quick reference for testing during ongoing development.

---

## Fast Rebuild & Test Loop

After code changes in `backend/`:

```bash
./mvnw clean compile -DskipTests && ./mvnw spring-boot:run
```

In another terminal, test immediately.

---

## Common Test Commands

### Register & Get Token
```bash
export TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')
echo $TOKEN  # Verify token was saved
```

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Protected Endpoint (with token)
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/photos
```

### Test Protected Endpoint (without token → 401)
```bash
curl http://localhost:8080/api/photos
```

### Server Health
```bash
curl http://localhost:8080/actuator/health
```

---

## Database

### Reset Users
```bash
docker exec rapidphoto-postgres psql -U postgres -d rapidphoto_dev -c "DELETE FROM users;"
```

### Full Reset
```bash
docker exec rapidphoto-postgres dropdb -U postgres rapidphoto_dev
docker exec rapidphoto-postgres createdb -U postgres rapidphoto_dev
# Restart backend to recreate schema
```

### Check Database
```bash
docker exec rapidphoto-postgres psql -U postgres -d rapidphoto_dev -c "SELECT * FROM users;"
```

---

## Environment

**Required for backend:**
```bash
export JWT_SECRET="your-minimum-64-character-jwt-secret-key-for-hs512"
```

**Or load from .env:**
```bash
set -a
source .env
set +a
```

---

## Tips

- Use `jq` to extract values from JSON responses
- Test with `curl -s` (silent) to reduce noise
- Always verify `$TOKEN` is set before using it
- Keep terminal tabs organized: Tab 1 (server), Tab 2 (tests), Tab 3 (database)
- Check server logs for DEBUG info when tests fail


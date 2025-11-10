# JWT_SECRET Guide - Complete Reference

**For**: Developers working with RapidPhotoUpload backend  
**Status**: Valid for Phase 1-3 and beyond  
**Updated**: November 8, 2025

---

## Quick Facts

| Aspect | Detail |
|--------|--------|
| **What is it?** | Cryptographic secret key for signing/verifying JWT tokens |
| **Where defined?** | Environment variable: `JWT_SECRET` |
| **How long?** | Minimum 256 bits (~64 characters) for HS512 algorithm |
| **Where used?** | `/security/JwtTokenProvider.java` |
| **If forgotten?** | App won't start - `Could not resolve placeholder` error |
| **If changed?** | All existing tokens become invalid (users logged out) |
| **If leaked?** | Critical security breach - anyone can forge tokens |

---

## When JWT_SECRET is Used

### 1. Token Generation (User Login/Register)

**Flow**:
```
User registers with email + password
         ↓
Backend creates JWT token containing:
  - subject: userId
  - claim: email
  - iat: issued at timestamp
  - exp: expiration timestamp (now + 24 hours)
         ↓
Backend signs token using JWT_SECRET + HS512 algorithm
         ↓
Token returned to client
```

**Code** (JwtTokenProvider.java, line 26-34):
```java
public String generateToken(String userId, String email) {
    return Jwts.builder()
        .subject(userId)
        .claim("email", email)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
        .signWith(getSigningKey(), SignatureAlgorithm.HS512)  // ← Uses JWT_SECRET
        .compact();
}
```

### 2. Token Validation (Every Protected Request)

**Flow**:
```
Client makes request: GET /api/photos
  + Header: Authorization: Bearer {token}
         ↓
JwtAuthenticationFilter intercepts request
         ↓
Backend receives token and attempts to verify signature
         ↓
Uses JWT_SECRET to re-calculate signature
         ↓
If signatures match → Token valid ✅ (user authenticated)
If signatures don't match → Token forged ❌ (reject 401)
```

**Code** (JwtTokenProvider.java, line 45-55):
```java
public boolean validateToken(String token) {
    try {
        Jwts.parser()
            .verifyWith(getSigningKey())  // ← Uses JWT_SECRET
            .build()
            .parseSignedClaims(token);
        return true;
    } catch (JwtException | IllegalArgumentException e) {
        return false;
    }
}
```

### 3. Token Parsing (Extract User Info)

**Flow**:
```
Backend has validated token
         ↓
Extract userId and email from token claims
         ↓
Load user context for authorization checks
         ↓
Allow/deny based on user permissions
```

**Code** (JwtTokenProvider.java, line 36-43):
```java
public String getUserIdFromToken(String token) {
    Claims claims = Jwts.parser()
        .verifyWith(getSigningKey())  // ← Uses JWT_SECRET
        .build()
        .parseSignedClaims(token)
        .getPayload();
    return claims.getSubject();
}
```

---

## Scenarios: What Happens If...

### Scenario 1: JWT_SECRET is Forgotten ❌

**During Development**:
```bash
$ cd backend
$ ./mvnw spring-boot:run

[ERROR] Could not resolve placeholder 'jwt.secret' in value "${jwt.secret}"

Application failed to start with exit code 1
```

**Problem**: Spring Boot can't find the environment variable

**Solution**:
```bash
export JWT_SECRET="your-minimum-256-bit-secret-key-for-hs512-algorithm"
./mvnw spring-boot:run
# ✅ App starts successfully
```

**Better Solution** (persistent):
```bash
# Create .env file (gitignored)
echo 'export JWT_SECRET="your-secret-here"' > .env

# Load it in shell
source .env

# Verify
echo $JWT_SECRET
```

---

### Scenario 2: JWT_SECRET is Changed ⚠️

**Before Change**:
```bash
export JWT_SECRET="secret-version-1"
./mvnw spring-boot:run

# User logs in
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Response:
# {
#   "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyLWlkLTEyMzQ1Ni...",
#   "userId": "user-id-123456",
#   "email": "user@example.com"
# }

TOKEN="eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyLWlkLTEyMzQ1Ni..."

# Token works fine
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/photos
# 200 OK ✅
```

**After Changing Secret**:
```bash
export JWT_SECRET="secret-version-2"
./mvnw spring-boot:run  # Restart backend

# Try to use OLD token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/photos

# Response:
# 401 Unauthorized ❌
```

**Why This Happens**:
- Old token was signed with `secret-version-1`
- New backend only knows `secret-version-2`
- Signature verification fails:
  ```
  Expected signature: HMAC-SHA512("{token}", "secret-version-2")
  Actual signature:   HMAC-SHA512("{token}", "secret-version-1")
  Match? NO → Reject token
  ```

**User Impact**:
- ❌ All existing tokens become invalid
- ❌ Users get logged out
- ❌ Users must re-login to get new tokens
- ✅ After re-login, new tokens work fine (signed with new secret)

**Timeline for Users**:
```
10:00 AM - Backend updated with new JWT_SECRET
10:01 AM - All 1000 active users get 401 Unauthorized
10:02 AM - Users confused, see login errors
10:05 AM - Users re-login successfully
10:10 AM - All users working again with new tokens
```

---

### Scenario 3: JWT_SECRET is Leaked 🚨 (Security Breach)

**How It Could Happen**:
- Accidentally committed to GitHub
- Exposed in CloudWatch logs
- Found in old backup
- Hardcoded in frontend code
- Environment variable in screenshot

**What Attacker Can Do**:
```python
# Attacker knows JWT_SECRET
secret = "the-leaked-secret"

# Attacker can forge ANY token for ANY user
attacker_token = forge_jwt(userId="admin-user-id", secret=secret)

# Backend accepts it (signature is valid!)
curl -H "Authorization: Bearer $attacker_token" \
  http://localhost:8080/api/photos
# 200 OK - attacker now logged in as admin!
```

**Attacker Capabilities**:
- ✅ View any user's photos
- ✅ Download any user's photos
- ✅ Delete any user's photos
- ✅ Access upload batch information
- ✅ Impersonate admin user (if your app has roles)
- ✅ Continue accessing API until tokens expire (24 hours)

**Immediate Actions Required**:
1. Generate new `JWT_SECRET` immediately
2. Restart backend with new secret
3. All existing tokens invalidated
4. Users must re-login (expected and acceptable)
5. Review S3 bucket for unauthorized access
6. Check database logs for suspicious activity
7. Notify security team
8. Remove secret from GitHub (use `git filter-branch`)

**Prevention**:
- Never commit secrets to git
- Use `.gitignore` for `.env` files
- Use environment variables in CI/CD
- Rotate secrets every 90 days
- Use AWS Secrets Manager in production
- Audit who has access to secrets

---

## Security Best Practices

### Minimum Requirements

| Requirement | Details |
|-------------|---------|
| **Length** | 256+ bits (64+ characters for hex, ~43 characters for base64) |
| **Entropy** | Use cryptographically random generator, NOT made-up strings |
| **Storage** | Environment variables or secrets manager, NEVER in code |
| **Version Control** | NEVER commit to git, use .gitignore for .env |
| **Logging** | NEVER log secrets, even in debug mode |
| **Rotation** | Rotate every 90 days in production |

### Generate Secure JWT_SECRET

**Option 1: OpenSSL (Recommended)**
```bash
openssl rand -hex 32
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6...
```

**Option 2: Python**
```python
import secrets
print(secrets.token_hex(32))
```

**Option 3: Node.js**
```javascript
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
```

**DO NOT Use** ❌:
- `export JWT_SECRET="mysecretkey"` (too short, not random)
- `export JWT_SECRET="password123"` (predictable)
- `export JWT_SECRET="test"` (way too short)

---

## Environment Setup

### Development Setup

**Option A: Shell Profile** (persistent)
```bash
# Add to ~/.zshrc or ~/.bash_profile
export JWT_SECRET="your-256-bit-secret-here"

# Reload shell
source ~/.zshrc
echo $JWT_SECRET  # Verify it's set
```

**Option B: .env File** (temporary, per project)
```bash
# Create .env in project root
cat > .env << 'EOF'
JWT_SECRET=your-256-bit-secret-here
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket
EOF

# Load it
source .env
echo $JWT_SECRET
```

**Option C: Docker/CI/CD** (production)
```dockerfile
# In Dockerfile
FROM openjdk:17-slim
...
ENV JWT_SECRET=${JWT_SECRET}
...
```

```yaml
# In GitHub Actions
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

### Production Setup

**AWS Secrets Manager**:
```bash
aws secretsmanager create-secret \
  --name rapidphoto/jwt-secret \
  --secret-string "your-production-256-bit-secret"

# In application.properties:
# jwt.secret=${aws.secretsmanager.jwt-secret}
```

**Environment Variables (Recommended)**:
```bash
# In deployment (ECS, Lambda, EC2):
# Set via AWS Systems Manager Parameter Store
# Or via container environment variables
# NEVER hardcode in Dockerfile
```

---

## Common Issues & Troubleshooting

### Issue 1: "Could not resolve placeholder 'jwt.secret'"

**Cause**: Environment variable not set

**Solution**:
```bash
export JWT_SECRET="your-secret-here"
echo $JWT_SECRET  # Verify
./mvnw spring-boot:run
```

**Verify it's set**:
```bash
echo "JWT_SECRET is: $JWT_SECRET"
# Should print your secret, not empty
```

---

### Issue 2: App Starts But "401 Unauthorized" on All Requests

**Cause**: JWT_SECRET changed or token from different secret

**Solution**:
```bash
# Option 1: Use OLD secret (if users still have old tokens)
export JWT_SECRET="secret-version-1"
./mvnw spring-boot:run

# Option 2: Accept logout and ask users to re-login
export JWT_SECRET="secret-version-2"
./mvnw spring-boot:run
# Users will get 401, need to re-login
```

---

### Issue 3: Users Randomly Getting 401 Errors

**Cause**: Likely changed JWT_SECRET without notifying users

**Symptoms**:
- Works, then suddenly doesn't
- Different users affected at different times
- Restarting browser doesn't help

**Solution**:
```bash
# Check if secret was changed recently
echo "Current secret: $JWT_SECRET"

# If changed, revert or accept logout:
# Option 1: Revert to old secret (if saved)
export JWT_SECRET="old-secret"

# Option 2: Force all users to re-login
# - Notify users
# - Clear sessions
# - Done
```

---

### Issue 4: Different Results on Different Machines

**Cause**: Different JWT_SECRET on different machines

**Example**:
```bash
# Machine A (dev1)
export JWT_SECRET="secret-abc123"
TOKEN_A="eyJhbGciOiJIUzUxMiJ9..."  # Works on Machine A

# Machine B (dev2)
export JWT_SECRET="secret-def456"
# Try to use TOKEN_A on Machine B
# Result: 401 Unauthorized ❌
```

**Solution**: Sync JWT_SECRET across machines
```bash
# Use shared .env file
# OR shared CI/CD secrets
# OR shared docs with same secret for all devs
```

---

## Testing with JWT_SECRET

### Fresh Testing Session (Recommended Approach)

For each manual testing session, generate a **new JWT_SECRET**. This ensures clean state with no token pollution from previous sessions.

**Step 1: Generate Fresh Secret**
```bash
# Generate new secret for this session
export JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET for this session: $JWT_SECRET"

# This gives you a unique secret every time
# Example outputs:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
# d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9g0
```

**Benefits**:
- ✅ Clean test state every session
- ✅ No token pollution from previous tests
- ✅ Test isolation guaranteed
- ✅ Developers expect to re-login during development
- ✅ No secrets management complexity

**Full Session Flow**:
```bash
# Start of fresh testing session
export JWT_SECRET=$(openssl rand -hex 32)
./mvnw spring-boot:run

# Register test users (with new secret)
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}' | jq -r '.token')

# Run all Phase 2 & 3 smoke tests
# ... (follow TESTING_GUIDE.md)

# Done for this session
# Next session → generate new secret again
```

**Why Regenerate Each Session?**

| When | Action | Result |
|------|--------|--------|
| **Session 1** | Generate JWT_SECRET_A, run tests | Tokens signed with A ✅ |
| **Session 2** | Generate JWT_SECRET_B, run tests | Tokens signed with B ✅ (old A tokens invalid, but that's fine) |
| **Session 3** | Generate JWT_SECRET_C, run tests | Tokens signed with C ✅ (clean slate again) |

---

### Manual Testing (Persistent Secret Alternative)

If you prefer to keep the same secret across multiple sessions:

**Step 1: Set Secret Once**
```bash
export JWT_SECRET="dev-secret-minimum-64-chars-for-hs512-algorithm-security"
```

**Step 2: Start Backend**
```bash
./mvnw spring-boot:run
# Wait for: "Started RapidPhotoApiApplication"
```

**Step 3: Register User**
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq -r '.token')

echo "Token: $TOKEN"
```

**Step 4: Use Token**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/photos | jq .

# Should return: {"photos":[], "pageNumber":0, ...}
# If 401: Check if JWT_SECRET changed
```

### Automated Testing

```bash
#!/bin/bash
# Test script

set -e  # Exit on error

# Verify JWT_SECRET is set
if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET not set"
  exit 1
fi

# Start backend (background)
./mvnw spring-boot:run &
BACKEND_PID=$!
sleep 5

# Test token generation
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: Token generation failed"
  kill $BACKEND_PID
  exit 1
fi

# Test token validation
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/photos)

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: Token validation failed (HTTP $HTTP_CODE)"
  kill $BACKEND_PID
  exit 1
fi

echo "✅ JWT_SECRET tests passed!"
kill $BACKEND_PID
```

---

## JWT_SECRET Rotation Strategy

### Simple Rotation (with downtime)

```bash
# Step 1: Generate new secret
NEW_SECRET=$(openssl rand -hex 32)
echo "New secret: $NEW_SECRET"

# Step 2: Update environment
export JWT_SECRET=$NEW_SECRET

# Step 3: Restart backend
./mvnw spring-boot:run

# Result: All existing tokens invalid, users must re-login
# Downtime: ~5 minutes
# User pain: Medium (need to re-login)
```

### Zero-Downtime Rotation (advanced)

```java
// Support multiple secrets temporarily
// Verify with NEW_SECRET first, fall back to OLD_SECRET
public boolean validateToken(String token) {
    try {
        // Try new secret first
        Jwts.parser().verifyWith(getSigningKey(newSecret))...
        return true;
    } catch (JwtException e) {
        // Fall back to old secret
        try {
            Jwts.parser().verifyWith(getSigningKey(oldSecret))...
            return true;
        } catch (JwtException e2) {
            return false;
        }
    }
}

// Timeline:
// 1. Deploy code supporting both secrets
// 2. Change JWT_SECRET to new value
// 3. Old tokens still work (fall back to old secret)
// 4. New tokens use new secret
// 5. After 24 hours, all old tokens expired
// 6. Remove old secret support
// 7. Downtime: 0 minutes
```

---

## Reference Implementation

**File**: `backend/src/main/java/com/rapid/security/JwtTokenProvider.java`

```java
@Component
public class JwtTokenProvider {
    @Value("${jwt.secret}")
    private String jwtSecret;  // ← Injected from environment
    
    @Value("${jwt.expiration}")
    private long jwtExpiration;
    
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
        // Converts string to cryptographic key
    }
    
    // Used during login/register
    public String generateToken(String userId, String email) {
        return Jwts.builder()
            .subject(userId)
            .claim("email", email)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
            .signWith(getSigningKey(), SignatureAlgorithm.HS512)
            .compact();
    }
    
    // Used during protected requests
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
    
    // Used to extract user ID
    public String getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
        return claims.getSubject();
    }
}
```

---

## Quick Reference

| Question | Answer |
|----------|--------|
| What is it? | Cryptographic secret for JWT signing/verification |
| How long? | 256+ bits (~64 hex characters) |
| Where stored? | Environment variable `JWT_SECRET` |
| Where used? | JwtTokenProvider.java (signing & verification) |
| If forgotten? | App won't start → set env var → restart |
| If changed? | All existing tokens invalid → users must re-login |
| If leaked? | Security breach → rotate immediately → notify users |
| When rotate? | Every 90 days OR if suspected compromised |
| For production? | Use AWS Secrets Manager or similar |
| For development? | Use .env file (gitignored) |

---

**Last Updated**: November 8, 2025  
**Status**: Valid for Phase 1-3 and beyond  
**Related Docs**: ARCHITECTURE.md, QUICK_START.md, TESTING_GUIDE.md


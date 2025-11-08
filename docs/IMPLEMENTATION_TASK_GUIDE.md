# RapidPhotoUpload - Detailed Implementation Task Guide

## Phases 1-3: Backend Foundation, S3 Integration, Query API

---

## Phase 1: Backend Foundation

### Overview
Goal: Spring Boot API running with JWT auth and core domain model.

### Task 1.1: Project Initialization
**Effort**: 15 min | **Complexity**: Low

**Deliverable**: Spring Boot project scaffold with dependencies

**Steps**:
1. Use Spring Initializr (https://start.spring.io/) to generate project:
   - Project: Maven
   - Spring Boot: 3.2.x
   - Java: 17
   - Dependencies: Spring Web, Spring Security, Spring Data JPA, PostgreSQL Driver, Validation
2. Extract and place in `backend/` directory
3. Verify structure:
   ```
   backend/
   ├── pom.xml
   ├── src/main/java/com/rapid/...
   ├── src/main/resources/application.properties
   └── src/test/...
   ```

**Subtasks**:
- [ ] Generate project from Spring Initializr
- [ ] Verify Maven build works (`mvn clean install`)
- [ ] Start app locally to verify (`mvn spring-boot:run`)
- [ ] Test: GET http://localhost:8080/actuator/health returns 200

---

### Task 1.2: Configure Database and Spring Properties
**Effort**: 20 min | **Complexity**: Low

**Files to Create/Modify**:
- `backend/src/main/resources/application.properties`
- `backend/src/main/resources/application-dev.properties`

**Deliverable**: PostgreSQL connection configured, ready for JPA

**Implementation**:
1. Update `application.properties`:
   ```properties
   spring.application.name=rapidphoto-api
   spring.profiles.active=dev
   
   # JPA/Hibernate
   spring.jpa.hibernate.ddl-auto=update
   spring.jpa.show-sql=false
   spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
   spring.jpa.properties.hibernate.format_sql=true
   
   # Multipart
   spring.servlet.multipart.max-file-size=500MB
   spring.servlet.multipart.max-request-size=500MB
   
   # CORS (dev only, update for prod)
   server.port=8080
   ```

2. Create `application-dev.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/rapidphoto_dev
   spring.datasource.username=postgres
   spring.datasource.password=${DB_PASSWORD:postgres}
   spring.datasource.driver-class-name=org.postgresql.Driver
   
   # Connection Pool
   spring.datasource.hikari.maximum-pool-size=30
   spring.datasource.hikari.minimum-idle=10
   
   # JWT
   jwt.secret=${JWT_SECRET:dev-secret-key-change-in-production-256-bit-minimum}
   jwt.expiration=86400000
   ```

**Subtasks**:
- [ ] Create database `rapidphoto_dev` in PostgreSQL
- [ ] Verify connection: run app and check logs for "HikariPool-1 - Ready"

---

### Task 1.3: Create Domain Model (Entities)
**Effort**: 45 min | **Complexity**: Medium

**Files to Create**:
- `backend/src/main/java/com/rapid/domain/User.java`
- `backend/src/main/java/com/rapid/domain/Photo.java`
- `backend/src/main/java/com/rapid/domain/UploadBatch.java`

**Deliverable**: JPA entities with proper annotations and relationships

**Implementation Details**:

#### User.java
```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String passwordHash;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Photo> photos = new ArrayList<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<UploadBatch> batches = new ArrayList<>();
    
    // Getters, setters, constructors
}
```

#### Photo.java
```java
@Entity
@Table(name = "photos", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_batch_id", columnList = "batch_id")
})
public class Photo {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private UploadBatch batch;
    
    @Column(nullable = false)
    private String s3Key;
    
    @Column(nullable = false)
    private String originalFilename;
    
    @Column(nullable = false)
    private Long fileSizeBytes;
    
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PhotoStatus status; // PENDING, UPLOADING, UPLOADED, FAILED
    
    private String errorMessage;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    // Getters, setters, constructors
}
```

#### UploadBatch.java
```java
@Entity
@Table(name = "upload_batches", indexes = {
    @Index(name = "idx_user_id_batch", columnList = "user_id")
})
public class UploadBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false)
    private Integer totalCount;
    
    @Column(nullable = false)
    private Integer completedCount = 0;
    
    @Column(nullable = false)
    private Integer failedCount = 0;
    
    @OneToMany(mappedBy = "batch", cascade = CascadeType.ALL)
    private List<Photo> photos = new ArrayList<>();
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    // Getters, setters, constructors
}
```

#### PhotoStatus.java (Enum)
```java
public enum PhotoStatus {
    PENDING,
    UPLOADING,
    UPLOADED,
    FAILED
}
```

**Subtasks**:
- [ ] Create entities with proper JPA annotations
- [ ] Add Hibernate annotations for timestamps (`@CreationTimestamp`, `@UpdateTimestamp`)
- [ ] Run app: verify tables created in PostgreSQL (`\dt` in psql)
- [ ] Check for proper indexes on `user_id`, `batch_id`

---

### Task 1.4: Create JPA Repositories
**Effort**: 20 min | **Complexity**: Low

**Files to Create**:
- `backend/src/main/java/com/rapid/infrastructure/repository/UserRepository.java`
- `backend/src/main/java/com/rapid/infrastructure/repository/PhotoRepository.java`
- `backend/src/main/java/com/rapid/infrastructure/repository/UploadBatchRepository.java`

**Deliverable**: Spring Data JPA repositories for database queries

**Implementation**:

```java
// UserRepository.java
@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}

// PhotoRepository.java
@Repository
public interface PhotoRepository extends JpaRepository<Photo, String> {
    List<Photo> findByUserIdAndBatchIdOrderByCreatedAtDesc(String userId, String batchId);
    List<Photo> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    Page<Photo> findByUserId(String userId, Pageable pageable);
    Optional<Photo> findByIdAndUserId(String id, String userId);
}

// UploadBatchRepository.java
@Repository
public interface UploadBatchRepository extends JpaRepository<UploadBatch, String> {
    Optional<UploadBatch> findByIdAndUserId(String id, String userId);
}
```

**Subtasks**:
- [ ] Create repositories in `infrastructure/repository/` package
- [ ] Add custom query methods as needed
- [ ] Verify repositories are autowirable in tests

---

### Task 1.5: Implement JWT Authentication Service
**Effort**: 60 min | **Complexity**: High

**Files to Create**:
- `backend/src/main/java/com/rapid/security/JwtTokenProvider.java`
- `backend/src/main/java/com/rapid/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/rapid/security/SecurityConfig.java`
- `backend/src/main/java/com/rapid/security/CustomUserDetailsService.java`

**Deliverable**: JWT token generation, validation, and Spring Security filter chain

**Implementation Details**:

#### JwtTokenProvider.java
```java
@Component
public class JwtTokenProvider {
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Value("${jwt.expiration}")
    private long jwtExpiration;
    
    private final SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    
    public String generateToken(String userId, String email) {
        return Jwts.builder()
            .subject(userId)
            .claim("email", email)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
            .signWith(key, SignatureAlgorithm.HS512)
            .compact();
    }
    
    public String getUserIdFromToken(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(key)
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
    }
    
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
```

#### JwtAuthenticationFilter.java
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = extractToken(request);
            if (token != null && jwtTokenProvider.validateToken(token)) {
                String userId = jwtTokenProvider.getUserIdFromToken(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(userId);
                Authentication auth = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (Exception e) {
            // Log and continue (invalid token)
        }
        filterChain.doFilter(request, response);
    }
    
    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

#### SecurityConfig.java
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()));
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList("http://localhost:5173", "http://localhost:3000"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(Collections.singletonList("*"));
        config.setExposedHeaders(Arrays.asList("Authorization"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

#### CustomUserDetailsService.java
```java
@Service
public class CustomUserDetailsService implements UserDetailsService {
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public UserDetails loadUserByUsername(String userId) throws UsernameNotFoundException {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));
        return new org.springframework.security.core.userdetails.User(
            user.getId(),
            user.getPasswordHash(),
            Collections.emptyList()
        );
    }
}
```

**Add to pom.xml**:
```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
```

**Subtasks**:
- [ ] Add JJWT dependencies to pom.xml
- [ ] Create JWT provider with token generation/validation
- [ ] Create JWT filter for request intercepting
- [ ] Configure Spring Security (CORS, CSRF, session policy)
- [ ] Test: Generate token, validate it works

---

### Task 1.6: Implement Authentication API Endpoints
**Effort**: 45 min | **Complexity**: Medium

**Files to Create**:
- `backend/src/main/java/com/rapid/features/auth/dto/RegisterRequest.java`
- `backend/src/main/java/com/rapid/features/auth/dto/LoginRequest.java`
- `backend/src/main/java/com/rapid/features/auth/dto/AuthResponse.java`
- `backend/src/main/java/com/rapid/features/auth/controller/AuthController.java`
- `backend/src/main/java/com/rapid/features/auth/service/AuthService.java`

**Deliverable**: `/api/auth/register` and `/api/auth/login` endpoints

**Implementation**:

#### DTOs
```java
// RegisterRequest.java
public class RegisterRequest {
    @Email
    @NotBlank
    private String email;
    
    @NotBlank
    @Size(min = 8)
    private String password;
    
    // Getters, setters
}

// LoginRequest.java
public class LoginRequest {
    @Email
    private String email;
    
    @NotBlank
    private String password;
    
    // Getters, setters
}

// AuthResponse.java
public class AuthResponse {
    private String token;
    private String userId;
    private String email;
    
    // Getters, setters
}
```

#### AuthService.java
```java
@Service
public class AuthService {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user = userRepository.save(user);
        
        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }
    
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }
        
        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }
}
```

#### AuthController.java
```java
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class AuthController {
    @Autowired
    private AuthService authService;
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
```

**Subtasks**:
- [ ] Create DTO classes with validation
- [ ] Implement AuthService with registration/login logic
- [ ] Create AuthController with endpoints
- [ ] Test via curl/Postman:
  - `POST /api/auth/register` → returns JWT
  - `POST /api/auth/login` → returns JWT
  - Invalid email/password → proper error

---

### Task 1.7: Add Global Exception Handling
**Effort**: 30 min | **Complexity**: Low

**Files to Create**:
- `backend/src/main/java/com/rapid/infrastructure/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/com/rapid/infrastructure/exception/ApiError.java`

**Deliverable**: Centralized error handling for all endpoints

**Implementation**:

```java
// ApiError.java
public class ApiError {
    private LocalDateTime timestamp;
    private int status;
    private String message;
    private String path;
    
    // Getters, setters, constructors
}

// GlobalExceptionHandler.java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex,
                                                       HttpServletRequest request) {
        ApiError error = new ApiError();
        error.setTimestamp(LocalDateTime.now());
        error.setStatus(HttpStatus.BAD_REQUEST.value());
        error.setMessage(ex.getBindingResult().getFieldError().getDefaultMessage());
        error.setPath(request.getRequestURI());
        return ResponseEntity.badRequest().body(error);
    }
    
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(RuntimeException ex,
                                                   HttpServletRequest request) {
        ApiError error = new ApiError();
        error.setTimestamp(LocalDateTime.now());
        error.setStatus(HttpStatus.BAD_REQUEST.value());
        error.setMessage(ex.getMessage());
        error.setPath(request.getRequestURI());
        return ResponseEntity.badRequest().body(error);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneralException(Exception ex,
                                                   HttpServletRequest request) {
        ApiError error = new ApiError();
        error.setTimestamp(LocalDateTime.now());
        error.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
        error.setMessage("Internal server error");
        error.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

**Subtasks**:
- [ ] Create exception handler class with common exceptions
- [ ] Test: Invalid auth request → proper error response

---

### Phase 1 Completion Test
- [ ] POST `/api/auth/register` with valid credentials → 200, JWT returned
- [ ] POST `/api/auth/login` with correct credentials → 200, JWT returned
- [ ] GET `/api/photos` without token → 401 Unauthorized
- [ ] GET `/api/photos` with valid token → 200 (empty list initially)
- [ ] Check PostgreSQL: tables exist (`users`, `photos`, `upload_batches`)

---

## Phase 2: S3 Integration & Upload API

### Overview
Goal: Generate presigned URLs, track uploads, manage S3 integration.

### Task 2.1: Configure AWS S3 Client
**Effort**: 30 min | **Complexity**: Medium

**Files to Create**:
- `backend/src/main/resources/application-dev.properties` (update)
- `backend/src/main/java/com/rapid/infrastructure/config/AwsConfig.java`

**Deliverable**: S3 client bean configured and ready for use

**Implementation**:

**Add to application-dev.properties**:
```properties
# AWS
aws.region=${AWS_REGION:us-east-1}
aws.s3.bucket=${AWS_S3_BUCKET:rapidphoto-dev}
aws.accessKeyId=${AWS_ACCESS_KEY_ID}
aws.secretAccessKey=${AWS_SECRET_ACCESS_KEY}
s3.presigned-url-expiration-minutes=30
```

**AwsConfig.java**:
```java
@Configuration
public class AwsConfig {
    @Value("${aws.region}")
    private String awsRegion;
    
    @Value("${aws.accessKeyId}")
    private String accessKeyId;
    
    @Value("${aws.secretAccessKey}")
    private String secretAccessKey;
    
    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
            .region(Region.of(awsRegion))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey)
            ))
            .build();
    }
}
```

**Add to pom.xml**:
```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
    <version>2.21.0</version>
</dependency>
```

**Subtasks**:
- [ ] Add AWS SDK dependency
- [ ] Set environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- [ ] Create S3 bucket in AWS console with CORS enabled
- [ ] Test S3 connectivity: verify app starts without connection errors

---

### Task 2.2: Implement S3 Presigned URL Service
**Effort**: 45 min | **Complexity**: Medium

**Files to Create**:
- `backend/src/main/java/com/rapid/infrastructure/storage/S3PresignedUrlService.java`

**Deliverable**: Service to generate presigned PUT URLs and verify uploads

**Implementation**:

```java
@Service
public class S3PresignedUrlService {
    @Autowired
    private S3Client s3Client;
    
    @Value("${aws.s3.bucket}")
    private String bucketName;
    
    @Value("${s3.presigned-url-expiration-minutes}")
    private int expirationMinutes;
    
    public String generatePresignedPutUrl(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        
        PutObjectRequest putRequest = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(s3Key)
            .build();
        
        PutObjectPresignedRequest presignedRequest = PutObjectPresignedRequest.builder()
            .putObjectRequest(putRequest)
            .signatureDuration(Duration.ofMinutes(expirationMinutes))
            .build();
        
        PresignedPutObjectRequest presignedUrl = s3Client.presignPutObject(presignedRequest);
        return presignedUrl.url().toString();
    }
    
    public boolean verifyFileExists(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        try {
            HeadObjectRequest request = HeadObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();
            
            HeadObjectResponse response = s3Client.headObject(request);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }
    
    public long getFileSizeBytes(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        HeadObjectRequest request = HeadObjectRequest.builder()
            .bucket(bucketName)
            .key(s3Key)
            .build();
        
        HeadObjectResponse response = s3Client.headObject(request);
        return response.contentLength();
    }
    
    public void deleteFile(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        DeleteObjectRequest request = DeleteObjectRequest.builder()
            .bucket(bucketName)
            .key(s3Key)
            .build();
        
        s3Client.deleteObject(request);
    }
    
    public String generatePresignedGetUrl(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        
        GetObjectRequest getRequest = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(s3Key)
            .build();
        
        GetObjectPresignedRequest presignedRequest = GetObjectPresignedRequest.builder()
            .getObjectRequest(getRequest)
            .signatureDuration(Duration.ofHours(1))
            .build();
        
        PresignedGetObjectRequest presignedUrl = s3Client.presignGetObject(presignedRequest);
        return presignedUrl.url().toString();
    }
    
    private String generateS3Key(String userId, String filename) {
        String timestamp = System.currentTimeMillis() / 1000 + "";
        String uuid = UUID.randomUUID().toString();
        return userId + "/" + timestamp + "_" + uuid + "_" + filename;
    }
}
```

**Subtasks**:
- [ ] Create presigned URL service with PUT/GET methods
- [ ] Test URL generation (manual inspection in logs)
- [ ] Test file existence verification

---

### Task 2.3: Create Upload API DTOs and Entities Updates
**Effort**: 30 min | **Complexity**: Low

**Files to Create**:
- `backend/src/main/java/com/rapid/features/upload/dto/InitiateUploadRequest.java`
- `backend/src/main/java/com/rapid/features/upload/dto/InitiateUploadResponse.java`
- `backend/src/main/java/com/rapid/features/upload/dto/UploadCompleteRequest.java`

**Deliverable**: Type-safe DTOs for upload endpoints

**Implementation**:

```java
// InitiateUploadRequest.java
public class InitiateUploadRequest {
    @NotBlank
    private String filename;
    
    @NotNull
    private Long fileSizeBytes;
    
    @NotBlank
    private String contentType;
    
    private String batchId; // Optional; backend creates if null
    
    // Getters, setters
}

// InitiateUploadResponse.java
public class InitiateUploadResponse {
    private String photoId;
    private String uploadUrl;
    private Integer expiresInMinutes;
    private String batchId;
    
    // Getters, setters
}

// UploadCompleteRequest.java
public class UploadCompleteRequest {
    @NotNull
    private Long fileSizeBytes;
    
    // Optional ETag from S3 for verification
    private String eTag;
    
    // Getters, setters
}
```

**Subtasks**:
- [ ] Create DTOs with validation annotations
- [ ] Add to Photo entity: `s3Key` field to store generated S3 key

---

### Task 2.4: Implement Upload Service (Commands)
**Effort**: 60 min | **Complexity**: High

**Files to Create**:
- `backend/src/main/java/com/rapid/features/upload/service/UploadCommandService.java`

**Deliverable**: Business logic for upload initiation, completion, failure

**Implementation**:

```java
@Service
public class UploadCommandService {
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private UploadBatchRepository batchRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private S3PresignedUrlService s3Service;
    
    @Autowired
    private UploadBatchRepository uploadBatchRepository;
    
    @Transactional
    public InitiateUploadResponse initiateUpload(String userId, InitiateUploadRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Create or fetch batch
        UploadBatch batch;
        if (request.getBatchId() != null && !request.getBatchId().isEmpty()) {
            batch = uploadBatchRepository.findByIdAndUserId(request.getBatchId(), userId)
                .orElseThrow(() -> new RuntimeException("Batch not found"));
        } else {
            batch = new UploadBatch();
            batch.setUser(user);
            batch.setTotalCount(1); // Will be updated
            batch = uploadBatchRepository.save(batch);
        }
        
        // Create Photo record
        Photo photo = new Photo();
        photo.setUser(user);
        photo.setBatch(batch);
        photo.setOriginalFilename(request.getFilename());
        photo.setFileSizeBytes(request.getFileSizeBytes());
        photo.setStatus(PhotoStatus.PENDING);
        photo = photoRepository.save(photo);
        
        // Generate S3 key and presigned URL
        String s3Key = userId + "/" + System.currentTimeMillis() + "_" + UUID.randomUUID() + "_" + request.getFilename();
        photo.setS3Key(s3Key);
        photoRepository.save(photo);
        
        String presignedUrl = s3Service.generatePresignedPutUrl(userId, s3Key);
        
        return new InitiateUploadResponse(
            photo.getId(),
            presignedUrl,
            30,
            batch.getId()
        );
    }
    
    @Transactional
    public void completeUpload(String userId, String photoId, UploadCompleteRequest request) {
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        // Verify file exists in S3
        if (!s3Service.verifyFileExists(userId, photo.getS3Key())) {
            photo.setStatus(PhotoStatus.FAILED);
            photo.setErrorMessage("File not found in S3");
            photoRepository.save(photo);
            throw new RuntimeException("Upload verification failed");
        }
        
        // Verify file size
        long actualSize = s3Service.getFileSizeBytes(userId, photo.getS3Key());
        if (actualSize != request.getFileSizeBytes()) {
            photo.setStatus(PhotoStatus.FAILED);
            photo.setErrorMessage("File size mismatch");
            photoRepository.save(photo);
            throw new RuntimeException("File size verification failed");
        }
        
        // Update photo status
        photo.setStatus(PhotoStatus.UPLOADED);
        photoRepository.save(photo);
        
        // Update batch counts
        UploadBatch batch = photo.getBatch();
        batch.setCompletedCount(batch.getCompletedCount() + 1);
        uploadBatchRepository.save(batch);
    }
    
    @Transactional
    public void failUpload(String userId, String photoId, String errorMessage) {
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        photo.setStatus(PhotoStatus.FAILED);
        photo.setErrorMessage(errorMessage);
        photoRepository.save(photo);
        
        UploadBatch batch = photo.getBatch();
        batch.setFailedCount(batch.getFailedCount() + 1);
        uploadBatchRepository.save(batch);
    }
}
```

**Subtasks**:
- [ ] Implement service with transaction management
- [ ] Add S3 verification logic
- [ ] Test: initiate, complete, fail flow
- [ ] Verify batch counts update correctly

---

### Task 2.5: Implement Upload Query Service
**Effort**: 40 min | **Complexity**: Medium

**Files to Create**:
- `backend/src/main/java/com/rapid/features/upload/dto/BatchStatusResponse.java`
- `backend/src/main/java/com/rapid/features/upload/service/UploadQueryService.java`

**Deliverable**: Query service for batch status polling

**Implementation**:

```java
// BatchStatusResponse.java
public class BatchStatusResponse {
    private String batchId;
    private Integer totalCount;
    private Integer completedCount;
    private Integer failedCount;
    private List<PhotoStatusDto> photos;
    
    // Getters, setters
}

public class PhotoStatusDto {
    private String id;
    private String originalFilename;
    private PhotoStatus status;
    private String errorMessage;
    private LocalDateTime updatedAt;
    
    // Getters, setters
}

// UploadQueryService.java
@Service
public class UploadQueryService {
    @Autowired
    private UploadBatchRepository batchRepository;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    public BatchStatusResponse getBatchStatus(String userId, String batchId) {
        UploadBatch batch = batchRepository.findByIdAndUserId(batchId, userId)
            .orElseThrow(() -> new RuntimeException("Batch not found"));
        
        List<Photo> photos = photoRepository.findByUserIdAndBatchIdOrderByCreatedAtDesc(userId, batchId);
        
        List<PhotoStatusDto> photoDtos = photos.stream()
            .map(p -> new PhotoStatusDto(
                p.getId(),
                p.getOriginalFilename(),
                p.getStatus(),
                p.getErrorMessage(),
                p.getUpdatedAt()
            ))
            .collect(Collectors.toList());
        
        return new BatchStatusResponse(
            batch.getId(),
            batch.getTotalCount(),
            batch.getCompletedCount(),
            batch.getFailedCount(),
            photoDtos
        );
    }
}
```

**Subtasks**:
- [ ] Create status response DTOs
- [ ] Implement query service
- [ ] Test: batch status returns correct counts

---

### Task 2.6: Implement Upload API Controller
**Effort**: 40 min | **Complexity**: Medium

**Files to Create**:
- `backend/src/main/java/com/rapid/features/upload/controller/UploadController.java`

**Deliverable**: REST endpoints for upload workflow

**Implementation**:

```java
@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class UploadController {
    @Autowired
    private UploadCommandService uploadCommandService;
    
    @Autowired
    private UploadQueryService uploadQueryService;
    
    @PostMapping("/initiate")
    public ResponseEntity<?> initiateUpload(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody InitiateUploadRequest request) {
        String userId = extractUserIdFromToken(token);
        InitiateUploadResponse response = uploadCommandService.initiateUpload(userId, request);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/complete/{photoId}")
    public ResponseEntity<?> completeUpload(
            @RequestHeader("Authorization") String token,
            @PathVariable String photoId,
            @Valid @RequestBody UploadCompleteRequest request) {
        String userId = extractUserIdFromToken(token);
        uploadCommandService.completeUpload(userId, photoId, request);
        return ResponseEntity.ok(Map.of("status", "success"));
    }
    
    @PostMapping("/failed/{photoId}")
    public ResponseEntity<?> failUpload(
            @RequestHeader("Authorization") String token,
            @PathVariable String photoId,
            @RequestBody Map<String, String> request) {
        String userId = extractUserIdFromToken(token);
        String errorMessage = request.getOrDefault("errorMessage", "Unknown error");
        uploadCommandService.failUpload(userId, photoId, errorMessage);
        return ResponseEntity.ok(Map.of("status", "success"));
    }
    
    @GetMapping("/batch/{batchId}/status")
    public ResponseEntity<?> getBatchStatus(
            @RequestHeader("Authorization") String token,
            @PathVariable String batchId) {
        String userId = extractUserIdFromToken(token);
        BatchStatusResponse response = uploadQueryService.getBatchStatus(userId, batchId);
        return ResponseEntity.ok(response);
    }
    
    private String extractUserIdFromToken(String token) {
        // Extract from Authorization header; actual implementation in JwtTokenProvider
        return token.substring(7); // Placeholder; use actual JWT parsing
    }
}
```

**Subtasks**:
- [ ] Create controller with all endpoints
- [ ] Integrate JWT token extraction from request context
- [ ] Test all endpoints via Postman

---

### Phase 2 Completion Test
- [ ] POST `/api/upload/initiate` → 200, returns presigned URL
- [ ] Upload file to presigned URL → file appears in S3
- [ ] POST `/api/upload/complete/{photoId}` → 200, photo status updated
- [ ] GET `/api/upload/batch/{batchId}/status` → returns correct counts
- [ ] Verify database: photos have correct S3 keys and statuses

---

## Phase 3: Photo Query API

### Overview
Goal: Retrieve, paginate, and delete photos.

### Task 3.1: Create Photo Query DTOs
**Effort**: 25 min | **Complexity**: Low

**Files to Create**:
- `backend/src/main/java/com/rapid/features/photos/dto/PhotoDto.java`
- `backend/src/main/java/com/rapid/features/photos/dto/PhotoListResponse.java`

**Deliverable**: DTOs for photo responses

**Implementation**:

```java
// PhotoDto.java
public class PhotoDto {
    private String id;
    private String originalFilename;
    private Long fileSizeBytes;
    private String downloadUrl;
    private LocalDateTime uploadedAt;
    
    // Getters, setters
}

// PhotoListResponse.java
public class PhotoListResponse {
    private List<PhotoDto> photos;
    private Integer pageNumber;
    private Integer pageSize;
    private Long totalCount;
    
    // Getters, setters
}
```

**Subtasks**:
- [ ] Create DTOs with all fields needed for frontend

---

### Task 3.2: Implement Photo Query Service
**Effort**: 40 min | **Complexity**: Medium

**Files to Create**:
- `backend/src/main/java/com/rapid/features/photos/service/PhotoQueryService.java`

**Deliverable**: Service for retrieving photos with pagination

**Implementation**:

```java
@Service
public class PhotoQueryService {
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private S3PresignedUrlService s3Service;
    
    public PhotoListResponse getUserPhotos(String userId, int pageNumber, int pageSize) {
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
        Page<Photo> page = photoRepository.findByUserId(userId, pageable);
        
        List<PhotoDto> photoDtos = page.getContent().stream()
            .filter(p -> p.getStatus() == PhotoStatus.UPLOADED)
            .map(p -> new PhotoDto(
                p.getId(),
                p.getOriginalFilename(),
                p.getFileSizeBytes(),
                s3Service.generatePresignedGetUrl(userId, p.getS3Key()),
                p.getCreatedAt()
            ))
            .collect(Collectors.toList());
        
        return new PhotoListResponse(
            photoDtos,
            pageNumber,
            pageSize,
            page.getTotalElements()
        );
    }
    
    public PhotoDto getPhotoById(String userId, String photoId) {
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        if (photo.getStatus() != PhotoStatus.UPLOADED) {
            throw new RuntimeException("Photo not available");
        }
        
        return new PhotoDto(
            photo.getId(),
            photo.getOriginalFilename(),
            photo.getFileSizeBytes(),
            s3Service.generatePresignedGetUrl(userId, photo.getS3Key()),
            photo.getCreatedAt()
        );
    }
}
```

**Subtasks**:
- [ ] Implement pagination logic
- [ ] Generate presigned GET URLs for each photo
- [ ] Test: retrieve list of photos with pagination

---

### Task 3.3: Implement Photo Delete Service
**Effort**: 30 min | **Complexity**: Medium

**Files to Create**:
- `backend/src/main/java/com/rapid/features/photos/service/PhotoCommandService.java`

**Deliverable**: Service for deleting photos

**Implementation**:

```java
@Service
public class PhotoCommandService {
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private S3PresignedUrlService s3Service;
    
    @Transactional
    public void deletePhoto(String userId, String photoId) {
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        // Delete from S3
        s3Service.deleteFile(userId, photo.getS3Key());
        
        // Delete from database
        photoRepository.delete(photo);
    }
}
```

**Subtasks**:
- [ ] Implement delete with S3 cleanup
- [ ] Test: delete photo (verify removed from S3 and DB)

---

### Task 3.4: Implement Photo API Controller
**Effort**: 35 min | **Complexity**: Low

**Files to Create**:
- `backend/src/main/java/com/rapid/features/photos/controller/PhotoController.java`

**Deliverable**: REST endpoints for photo management

**Implementation**:

```java
@RestController
@RequestMapping("/api/photos")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class PhotoController {
    @Autowired
    private PhotoQueryService photoQueryService;
    
    @Autowired
    private PhotoCommandService photoCommandService;
    
    @GetMapping
    public ResponseEntity<?> listPhotos(
            @RequestHeader("Authorization") String token,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        String userId = extractUserIdFromToken(token);
        PhotoListResponse response = photoQueryService.getUserPhotos(userId, page, pageSize);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{photoId}")
    public ResponseEntity<?> getPhoto(
            @RequestHeader("Authorization") String token,
            @PathVariable String photoId) {
        String userId = extractUserIdFromToken(token);
        PhotoDto response = photoQueryService.getPhotoById(userId, photoId);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{photoId}")
    public ResponseEntity<?> deletePhoto(
            @RequestHeader("Authorization") String token,
            @PathVariable String photoId) {
        String userId = extractUserIdFromToken(token);
        photoCommandService.deletePhoto(userId, photoId);
        return ResponseEntity.ok(Map.of("status", "success"));
    }
}
```

**Subtasks**:
- [ ] Create controller with all endpoints
- [ ] Test all endpoints via Postman

---

### Phase 3 Completion Test
- [ ] GET `/api/photos` → returns list (empty or with uploads)
- [ ] GET `/api/photos/{photoId}` → returns single photo with download URL
- [ ] DELETE `/api/photos/{photoId}` → removes from S3 and DB
- [ ] Verify pagination works (test with multiple pages)
- [ ] Verify download URLs are valid (can access via browser)

---

## All Phases Checklist

### Phase 1 ✓
- [ ] JWT auth working
- [ ] Protected endpoints secured
- [ ] Database tables created

### Phase 2 ✓
- [ ] Presigned URLs generated
- [ ] Uploads tracked in database
- [ ] S3 verification working
- [ ] Batch status polling works

### Phase 3 ✓
- [ ] Photo listing with pagination
- [ ] Download URLs generated
- [ ] Delete functionality working

---

## Notes for AI Implementation

- Each file should follow Spring conventions (annotations, dependency injection)
- Use `@Transactional` for database operations with side effects
- Leverage Spring Security's `@PreAuthorize` where needed (add later)
- Keep DTOs separate from entities (better for API evolution)
- All endpoints should validate input with `@Valid` annotations
- Return proper HTTP status codes (201 for creation, 204 for delete, etc.)

---

## Architecture Documentation

### When to Create an Architecture Guide

**Timing**: After Phase 3 testing is complete and all endpoints are verified working.

**Best Time**: Before starting Phase 4 (Web Frontend), so frontend developers have a clear reference.

**Contents Should Cover**:
- System architecture diagram (backend, S3, database)
- Data flow for upload workflow (presigned URLs, S3, database)
- API endpoint reference (all 7 endpoints)
- Security model (JWT, per-user isolation)
- Database schema and relationships
- S3 key naming scheme and file organization
- Configuration and environment variables
- Deployment considerations

**Reference**: See `PHASE_2_3_COMPLETE.md` for detailed implementation specifics to include.

### Follow-Up Task
- **Task 3.5: Create Architecture Documentation** (Phase 4 prep)
  - Create `docs/ARCHITECTURE.md`
  - Document system design, data flows, security model
  - Include diagrams (ASCII or external tool)
  - Provide quick reference for future developers



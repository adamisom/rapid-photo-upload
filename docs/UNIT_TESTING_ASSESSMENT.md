# High-Value Unit Testing Opportunities

**Analysis Date**: November 9, 2025  
**Current Test Coverage**: 0% (no existing tests)  
**Priority**: Start with highest business value tests

---

## 🏗️ BACKEND (Java/Spring Boot) - Unit Tests

### Current Setup
- ✅ JUnit 5 (via spring-boot-starter-test)
- ✅ Mockito
- ✅ TestRestTemplate (for integration tests)

### 🔴 **TIER 1: Critical Business Logic** (Must Test)

#### 1. **AuthService** ⭐⭐⭐ - HIGH PRIORITY
**Why**: Authentication is security-critical. Bugs here = users locked out or accounts compromised.

**File**: `backend/src/test/java/com/rapid/features/auth/AuthServiceTest.java`

**Tests Needed**:
```java
class AuthServiceTest {
  
  @Test
  void testRegisterSuccess() {
    // Verify: User created, password hashed, JWT token returned
  }
  
  @Test
  void testRegisterDuplicateEmail() {
    // Verify: RuntimeException thrown when email exists
  }
  
  @Test
  void testLoginSuccess() {
    // Verify: Correct password returns token with user ID and email
  }
  
  @Test
  void testLoginWrongPassword() {
    // Verify: RuntimeException thrown on password mismatch
  }
  
  @Test
  void testLoginNonExistentUser() {
    // Verify: RuntimeException thrown when user not found
  }
  
  @Test
  void testPasswordEncodingUsed() {
    // Verify: Passwords are encoded, not stored plaintext
  }
}
```

**Mocks**: `UserRepository`, `PasswordEncoder`, `JwtTokenProvider`

**Effort**: 1.5 hours | **ROI**: 🔥🔥🔥 (Security critical)

---

#### 2. **JwtTokenProvider** ⭐⭐⭐ - HIGH PRIORITY
**Why**: JWT validation bugs = authentication bypass or token forgery.

**File**: `backend/src/test/java/com/rapid/security/JwtTokenProviderTest.java`

**Tests Needed**:
```java
class JwtTokenProviderTest {
  
  @Test
  void testGenerateTokenContainsUserIdAndEmail() {
    // Verify: Token includes subject (userId) and email claim
  }
  
  @Test
  void testGenerateTokenHasExpiration() {
    // Verify: Token includes expiration date
  }
  
  @Test
  void testGetUserIdFromToken() {
    // Verify: Can extract userId from valid token
  }
  
  @Test
  void testValidateTokenSuccess() {
    // Verify: Valid token passes validation
  }
  
  @Test
  void testValidateTokenExpired() {
    // Verify: Expired token fails validation
  }
  
  @Test
  void testValidateTokenTampered() {
    // Verify: Token with modified signature fails validation
  }
  
  @Test
  void testValidateTokenMalformed() {
    // Verify: Invalid token format fails gracefully
  }
  
  @Test
  void testValidateTokenEmpty() {
    // Verify: Empty/null token fails validation
  }
}
```

**Mocks**: None (uses real JwtTokenProvider with test configs)

**Effort**: 1.5 hours | **ROI**: 🔥🔥🔥 (Security critical)

---

#### 3. **UploadCommandService** ⭐⭐ - MEDIUM-HIGH PRIORITY
**Why**: Upload workflow is core feature. Bugs = data loss, corruption, failed uploads.

**File**: `backend/src/test/java/com/rapid/features/upload/UploadCommandServiceTest.java`

**Tests Needed**:
```java
class UploadCommandServiceTest {
  
  @Test
  void testInitiateUploadCreatesNewBatch() {
    // Verify: New batch created with totalCount=1
    // Verify: Photo record created with PENDING status
    // Verify: S3 key generated and presigned URL returned
  }
  
  @Test
  void testInitiateUploadWithExistingBatch() {
    // Verify: Reuses batch if batchId provided
    // Verify: Only new Photo created, batch not duplicated
  }
  
  @Test
  void testCompleteUploadSuccess() {
    // Verify: Photo status changed to UPLOADED
    // Verify: Batch completedCount incremented
    // Verify: No error message set
  }
  
  @Test
  void testCompleteUploadFileNotInS3() {
    // Verify: Photo status changed to FAILED
    // Verify: Error message "File not found in S3" set
    // Verify: Exception thrown
  }
  
  @Test
  void testCompleteUploadFileSizeMismatch() {
    // Verify: Photo status changed to FAILED
    // Verify: Error message "File size mismatch" set
    // Verify: Exception thrown
  }
  
  @Test
  void testFailUploadIncrementsFailedCount() {
    // Verify: Photo status changed to FAILED
    // Verify: Error message stored
    // Verify: Batch failedCount incremented
  }
  
  @Test
  void testInitiateUploadUserNotFound() {
    // Verify: RuntimeException thrown
  }
  
  @Test
  void testInitiateUploadBatchNotFound() {
    // Verify: RuntimeException thrown when batch doesn't exist for user
  }
}
```

**Mocks**: `PhotoRepository`, `UploadBatchRepository`, `UserRepository`, `S3PresignedUrlService`

**Effort**: 2 hours | **ROI**: 🔥🔥 (Core feature)

---

### 🟡 **TIER 2: Important Business Logic** (Should Test)

#### 4. **UploadQueryService** ⭐⭐
**Why**: Gallery display & batch status must be accurate.

**Tests**:
```java
@Test
void testGetBatchStatusReturnsCorrectCounts() {
  // Verify: Returns photo list with correct counts
}

@Test
void testGetBatchStatusUserScopedAccess() {
  // Verify: Cannot access other user's batches
}
```

**Effort**: 1 hour

---

#### 5. **PhotoCommandService** ⭐⭐
**Why**: Delete operation = permanent data loss if buggy.

**Tests**:
```java
@Test
void testDeletePhotoRemovesFromS3AndDB() {
  // Verify: S3 file deleted AND DB record removed
}

@Test
void testDeletePhotoUserScopedAccess() {
  // Verify: Cannot delete other user's photos
}
```

**Effort**: 1 hour

---

#### 6. **PhotoQueryService** ⭐
**Why**: Gallery display, but less critical than auth/upload.

**Tests**:
```java
@Test
void testGetUserPhotosFiltersOnlyUploaded() {
  // Verify: PENDING and FAILED photos excluded
}

@Test
void testGetUserPhotosWithPagination() {
  // Verify: Correct page returned, correct count
}
```

**Effort**: 1 hour

---

---

## 🎨 FRONTEND (React/TypeScript) - Unit Tests

### Current Setup
- ❌ No test runner (need to add Vitest)
- ❌ No testing library
- ❌ No mocking framework

### **Required Setup** (1 hour)
```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

---

### 🔴 **TIER 1: Just Refactored - Must Test**

#### 1. **validators.ts** ⭐⭐⭐ - HIGH PRIORITY
**Why**: Validation logic just centralized. Must verify it works across all pages.

**File**: `web/src/utils/__tests__/validators.test.ts`

**Tests Needed**:
```typescript
describe('validators', () => {
  describe('validateEmail', () => {
    it('returns error for empty email', () => {
      expect(validators.validateEmail('')).toBe('Email is required');
    });
    
    it('returns error for invalid email', () => {
      expect(validators.validateEmail('invalid')).toBe('Please enter a valid email address');
    });
    
    it('returns null for valid email', () => {
      expect(validators.validateEmail('test@example.com')).toBeNull();
    });
    
    it('trims whitespace', () => {
      expect(validators.validateEmail('  test@example.com  ')).toBeNull();
    });
  });
  
  describe('validatePassword', () => {
    it('returns error for empty password', () => {
      expect(validators.validatePassword('')).toBe('Password is required');
    });
    
    it('returns error for short password', () => {
      expect(validators.validatePassword('short')).toContain('at least');
    });
    
    it('returns null for 8+ char password', () => {
      expect(validators.validatePassword('ValidPass123')).toBeNull();
    });
  });
  
  describe('validatePasswordMatch', () => {
    it('returns null when passwords match', () => {
      expect(validators.validatePasswordMatch('pass', 'pass')).toBeNull();
    });
    
    it('returns error when passwords differ', () => {
      expect(validators.validatePasswordMatch('pass1', 'pass2')).toBe('Passwords do not match');
    });
  });
});
```

**Effort**: 1 hour | **ROI**: 🔥🔥🔥 (Just refactored, catching regression)

---

#### 2. **FormInput.tsx** ⭐⭐
**Why**: New component, verify rendering and error display works.

**File**: `web/src/components/__tests__/FormInput.test.tsx`

**Tests Needed**:
```typescript
describe('FormInput', () => {
  it('renders label and input', () => {
    render(
      <FormInput
        label="Email"
        type="email"
        value="test@example.com"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('test@example.com');
  });
  
  it('displays error message when provided', () => {
    render(
      <FormInput
        label="Email"
        type="email"
        value=""
        onChange={() => {}}
        error="Email is required"
      />
    );
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });
  
  it('calls onChange when input changes', async () => {
    const onChange = vi.fn();
    render(
      <FormInput
        label="Email"
        type="email"
        value=""
        onChange={onChange}
      />
    );
    
    await userEvent.type(screen.getByRole('textbox'), 'test@example.com');
    expect(onChange).toHaveBeenCalledWith('test@example.com');
  });
  
  it('disables input when disabled prop true', () => {
    render(
      <FormInput
        label="Email"
        type="email"
        value=""
        onChange={() => {}}
        disabled={true}
      />
    );
    
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
```

**Effort**: 1 hour | **ROI**: 🔥🔥 (New component verification)

---

#### 3. **Alert.tsx** ⭐
**Why**: New component, simple but important for UX.

**File**: `web/src/components/__tests__/Alert.test.tsx`

**Tests Needed**:
```typescript
describe('Alert', () => {
  it('renders error alert with correct styling', () => {
    render(<Alert type="error" message="Error occurred" />);
    
    const alert = screen.getByText('Error occurred').parentElement;
    expect(alert).toHaveClass('bg-red-50');
  });
  
  it('renders success alert with correct styling', () => {
    render(<Alert type="success" message="Success!" />);
    
    const alert = screen.getByText('Success!').parentElement;
    expect(alert).toHaveClass('bg-green-50');
  });
  
  it('renders info alert with correct styling', () => {
    render(<Alert type="info" message="Info message" />);
    
    const alert = screen.getByText('Info message').parentElement;
    expect(alert).toHaveClass('bg-blue-50');
  });
});
```

**Effort**: 0.5 hours | **ROI**: 🔥 (Simple component)

---

### 🟡 **TIER 2: Core Functionality**

#### 4. **useAuth Hook** ⭐⭐
**Why**: Authentication state management is critical.

**Tests**:
```typescript
@Test
it('provides login function that updates user state', async () => {
  // Mock authService.login
  // Verify: user set, token set, localStorage updated
});

@Test
it('provides logout function that clears state', () => {
  // Verify: user cleared, token cleared, localStorage cleared
});

@Test
it('throws error if used outside AuthProvider', () => {
  // Verify: Helpful error message
});
```

**Effort**: 1.5 hours | **ROI**: 🔥🔥 (Core hook)

---

#### 5. **uploadService.ts** ⭐⭐
**Why**: S3 integration must work correctly.

**Tests**:
```typescript
@Test
void testUploadToS3WithProgress() {
  // Mock XMLHttpRequest
  // Verify: progress callbacks fired correctly
}

@Test
void testUploadToS3Handles404() {
  // Verify: proper error handling
}
```

**Effort**: 2 hours | **ROI**: 🔥🔥 (Core upload feature)

---

#### 6. **LoginPage & RegisterPage** ⭐
**Why**: Integration tests for form workflows.

**Tests**:
```typescript
@Test
void testLoginPageValidationFlow() {
  // Verify: validation errors shown
  // Verify: validators used correctly
}

@Test
void testRegisterPagePasswordMismatchError() {
  // Verify: shows error when passwords don't match
}
```

**Effort**: 2 hours | **ROI**: 🔥 (User flows)

---

---

## 📊 IMPLEMENTATION ROADMAP

### **Phase 1: Setup** (1 hour)
1. Backend: Create test structure, add JUnit dependencies
2. Frontend: Install Vitest, @testing-library/react

### **Phase 2: Quick Wins** (4 hours) - RECOMMENDED START
1. ✅ `validators.ts` tests (1 hr) - Immediate value
2. ✅ `FormInput.tsx` tests (1 hr) - Verify refactoring
3. ✅ `Alert.tsx` tests (0.5 hr) - Simple
4. ✅ `JwtTokenProvider` tests (1.5 hrs) - Security critical

### **Phase 3: Core Backend** (5 hours)
1. `AuthService` tests (1.5 hrs)
2. `UploadCommandService` tests (2 hrs)
3. `UploadQueryService` tests (1 hr)

### **Phase 4: Core Frontend** (5 hours)
1. `useAuth` hook tests (1.5 hrs)
2. `uploadService.ts` tests (2 hrs)
3. LoginPage/RegisterPage integration (1.5 hrs)

---

## 🎯 RECOMMENDED TESTING STRATEGY

### **Immediate Priority** (8 hours for high impact)

| Test Suite | Effort | ROI | Why |
|-----------|--------|-----|-----|
| validators.ts | 1 hr | 🔥🔥🔥 | Just refactored, catch regressions |
| JwtTokenProvider | 1.5 hrs | 🔥🔥🔥 | Security critical |
| AuthService | 1.5 hrs | 🔥🔥🔥 | Auth bugs = app broken |
| UploadCommandService | 2 hrs | 🔥🔥 | Core upload flow |
| FormInput.tsx | 1 hr | 🔥🔥 | New component verification |
| uploadService.ts | 1 hr | 🔥🔥 | S3 integration |

**Total**: ~8 hours for **70% code coverage** of critical paths

---

## ✅ Next Steps

1. **This Session**: Create this assessment (DONE)
2. **Phase 5 Prep**: Add test infrastructure (Vitest setup)
3. **Quick Wins**: Start with validators + JWT tests
4. **Continuous**: Add tests for gallery feature (Phase 5)

---

## 📝 Notes

- **Backend**: Use Mockito for repository/service mocks
- **Frontend**: Use Vitest + @testing-library/react for component tests
- **Coverage Goal**: 60%+ for critical paths (auth, upload, validation)
- **CI/CD**: Add test runs to GitHub Actions once tests exist



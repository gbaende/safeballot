# SafeBallot Route Restructuring - QA Testing Guide

## 🎯 Overview

This guide covers the comprehensive QA testing strategy for SafeBallot's route restructuring, ensuring:

- **Dedicated Routes** work correctly
- **Legacy Route Redirects** preserve backward compatibility
- **Flow Separation** between registration and login is enforced
- **Component Isolation** prevents cross-contamination

## 📋 Test Categories

### 1. Route Smoke Tests (`RouteSmoke.test.js`)

**Purpose**: Verify basic routing functionality and redirects

**Coverage**:

```bash
✓ /verify-registration/:id/:slug → RegistrationFlowRouter
✓ /verify-login/:id/:slug → LoginFlowRouter
✓ /preregister/:id/:slug → redirects to registration
✓ /verify-identity/:id/:slug → redirects to registration
✓ /login/preregister/:id/:slug → redirects to login
✓ Protected admin routes require authentication
✓ Public voter routes accessible without auth
```

### 2. Registration Flow Tests (`RegistrationFlowRouter.test.jsx`)

**Purpose**: Test complete registration flow integration

**Flow**: `identity → scan → confirm → verified`

**Key Assertions**:

```bash
✓ ConfirmInfo ALWAYS appears in registration flow
✓ VerifiedScreen used for final step (not LoginVerifiedScreen)
✓ Back navigation works through all steps
✓ Data preservation through each transition
✓ Error handling with graceful fallbacks
```

### 3. Login Flow Tests (`LoginFlowRouter.test.jsx`)

**Purpose**: Test streamlined login flow integration

**Flow**: `scan → verified` (NO confirm step)

**Key Assertions**:

```bash
✓ ConfirmInfo NEVER appears in login flow
✓ VerifyIdentity NEVER appears in login flow
✓ LoginVerifiedScreen used (not VerifiedScreen)
✓ Direct scan → verified transition
✓ Voter token validation on mount
```

## 🚀 Running Tests

### Quick Commands

```bash
# Run all QA tests with comprehensive reporting
npm run test:qa

# Run individual test suites
npm run test:smoke          # Route smoke tests
npm run test:registration   # Registration flow tests
npm run test:login          # Login flow tests

# Run with coverage report
npm run test:coverage

# Run all route tests
npm run test:routes
```

### Manual Test Execution

```bash
# Individual test files
npm test -- --testPathPattern=RouteSmoke.test.js
npm test -- --testPathPattern=RegistrationFlowRouter.test.jsx
npm test -- --testPathPattern=LoginFlowRouter.test.jsx

# Watch mode for development
npm test -- --testPathPattern=__tests__ --watch
```

## 🔍 Test Architecture

### Mocking Strategy

**Component Mocks**: Each flow component is mocked to provide predictable test behavior

```javascript
// Example: MockScanID provides controlled onComplete behavior
jest.mock("../pages/Verify/ScanID", () => {
  return function MockScanID({ onComplete, onBack }) {
    return (
      <div data-testid="scan-id">
        <button onClick={() => onComplete(mockData)}>Complete</button>
      </div>
    );
  };
});
```

**Service Mocks**: API services are mocked to simulate various scenarios

```javascript
mockAuthService.generateDigitalKey.mockResolvedValue({
  data: { digital_key: "SAFE-BALLOT-ABC123" },
});
```

**LocalStorage Mocks**: Comprehensive localStorage simulation for data persistence testing

### Test Data Flow

```
Registration Flow Testing:
identity (mock user input)
→ scan (mock ID data)
→ confirm (verify data passing)
→ verified (check final state)

Login Flow Testing:
scan (mock ID data)
→ verified (verify direct transition)
```

## ✅ Validation Checklist

### Route Smoke Tests

- [ ] New routes render correct components
- [ ] Legacy routes redirect properly
- [ ] Parameters preserved in redirects
- [ ] Auth protection works for admin routes
- [ ] Public routes accessible

### Registration Flow Tests

- [ ] Complete 4-step flow works
- [ ] ConfirmInfo always appears
- [ ] Back navigation through all steps
- [ ] Data preserved through transitions
- [ ] Error handling with fallbacks
- [ ] VerifiedScreen used for completion

### Login Flow Tests

- [ ] Streamlined 2-step flow works
- [ ] ConfirmInfo never appears
- [ ] VerifyIdentity never appears
- [ ] LoginVerifiedScreen used
- [ ] Voter token validation
- [ ] Direct scan → verified transition

## 🐛 Debugging Failed Tests

### Common Issues

**Component Import Errors**:

```bash
# Check mock paths match actual component locations
# Verify component exports are correct
```

**Mock Configuration**:

```bash
# Ensure mocks are set up before component imports
# Check mock function return values match expected format
```

**Router Navigation**:

```bash
# Verify useNavigate mock is properly configured
# Check route parameter extraction
```

**LocalStorage**:

```bash
# Ensure localStorage mocks are reset between tests
# Check token/data setup in beforeEach
```

### Debug Commands

```bash
# Run with verbose output
npm test -- --testPathPattern=__tests__ --verbose

# Run single test for debugging
npm test -- --testNamePattern="specific test name"

# Check console output (uncomment console mocks in setupTests.js)
```

## 📊 Coverage Requirements

**Minimum Coverage Targets**:

- Route Components: 90%+
- Flow Logic: 95%+
- Navigation: 100%
- Error Handling: 85%+

**Coverage Report**:

```bash
npm run test:coverage
# Generates HTML report in coverage/ directory
```

## 🎯 Success Criteria

### All Tests Must Pass:

1. ✅ Route smoke tests verify basic functionality
2. ✅ Registration flow completes full 4-step process
3. ✅ Login flow completes streamlined 2-step process
4. ✅ Legacy redirects work with parameter preservation
5. ✅ Component isolation prevents cross-contamination
6. ✅ Error handling provides graceful fallbacks

### Key Assertions Verified:

- **Separation**: Login flow never shows ConfirmInfo or VerifyIdentity
- **Completeness**: Registration flow always includes all 4 steps
- **Compatibility**: Legacy URLs redirect seamlessly
- **Consistency**: Correct components used for each flow
- **Reliability**: Error states handled gracefully

## 🔧 Maintenance

### Adding New Tests

1. Follow existing mock patterns
2. Use descriptive test names
3. Group related tests in `describe` blocks
4. Include both happy path and error scenarios
5. Update this documentation

### Updating Existing Tests

1. Maintain backward compatibility
2. Update mocks when component interfaces change
3. Preserve test isolation
4. Keep coverage targets met

---

**Last Updated**: Current implementation
**Test Framework**: Jest + React Testing Library
**Total Test Files**: 3 (RouteSmoke, RegistrationFlow, LoginFlow)
**Total Assertions**: 40+ covering all critical flow paths

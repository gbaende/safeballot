# BlinkID Verification Components

This directory contains specialized BlinkID components for different authentication flows in the SafeBallot application.

## Components Overview

### RegistrationBlinkIDStep.js

**Purpose**: Handles document verification for new voter registration
**Features**:

- Full document data extraction (name, DOB, address, document images)
- Comprehensive validation and error handling
- Stores complete identity data for voter registration
- Higher quality requirements for document scanning
- Integration with registration Redux actions

**Configuration**:

- `requireFullDocument: true` - Requires complete document scan
- `extractSignature: true` - Extracts signature image
- `extractPhoto: true` - Extracts face photo
- More strict document validation

**Usage**:

```jsx
import RegistrationBlinkIDStep from "../../components/Verification/RegistrationBlinkIDStep";

<RegistrationBlinkIDStep
  onComplete={(registrationData) => {
    // Handle registration completion
  }}
  onError={(error) => {
    // Handle errors
  }}
  onBack={() => {
    // Handle back navigation
  }}
  ballotId={ballotId}
/>;
```

### LoginBlinkIDStep.js

**Purpose**: Handles quick identity verification for existing voters
**Features**:

- Minimal data extraction (just identity verification fields)
- Faster processing optimized for speed
- Streamlined UI for quick login
- Integration with login Redux actions

**Configuration**:

- `requireFullDocument: false` - Less strict requirements
- `extractSignature: false` - Skip signature for speed
- `extractPhoto: false` - Skip photo for speed
- More lenient validation settings

**Usage**:

```jsx
import LoginBlinkIDStep from "../../components/Verification/LoginBlinkIDStep";

<LoginBlinkIDStep
  onComplete={(loginData) => {
    // Handle login completion
  }}
  onError={(error) => {
    // Handle errors
  }}
  onBack={() => {
    // Handle back navigation
  }}
  ballotId={ballotId}
/>;
```

## Flow Integration

### Registration Flow

1. **IdentityVerification** → **RegistrationBlinkIDStep** → **ConfirmInfo** → **VerifiedScreen**
2. Uses `RegistrationBlinkIDStep` for comprehensive document scanning
3. Collects full identity data for voter registration
4. Requires confirmation step to verify extracted data

### Login Flow

1. **LoginBlinkIDStep** → **LoginVerifiedScreen**
2. Uses `LoginBlinkIDStep` for quick identity verification
3. Skips confirmation step for faster login
4. Only verifies identity match, doesn't re-register

## Redux Integration

### Registration Actions

- `verifyRegistrationIdentityRequest`
- `verifyRegistrationIdentitySuccess`
- `verifyRegistrationIdentityFailure`

### Login Actions

- `verifyLoginIdentityRequest`
- `verifyLoginIdentitySuccess`
- `verifyLoginIdentityFailure`

## Data Flow

### Registration Data Structure

```javascript
{
  // Complete identity data
  firstName: string,
  lastName: string,
  fullName: string,
  dateOfBirth: string,
  address: string,
  documentNumber: string,
  nationality: string,
  sex: string,

  // Document images
  faceImage: base64String,
  fullDocumentImage: base64String,
  signatureImage: base64String,

  // Metadata
  flowType: "registration",
  ballotId: string,
  timestamp: string,
  processingStatus: object
}
```

### Login Data Structure

```javascript
{
  // Minimal identity verification data
  firstName: string,
  lastName: string,
  fullName: string,
  documentNumber: string,

  // Basic verification fields
  dateOfBirth: string,
  nationality: string,

  // Metadata
  flowType: "login",
  ballotId: string,
  timestamp: string,
  processingStatus: object
}
```

## Configuration Differences

| Feature          | Registration | Login   |
| ---------------- | ------------ | ------- |
| Document Quality | High         | Medium  |
| Data Extraction  | Complete     | Minimal |
| Image Capture    | Yes          | No      |
| Processing Speed | Slower       | Faster  |
| Validation       | Strict       | Lenient |
| Error Tolerance  | Low          | High    |

## Error Handling

Both components implement comprehensive error handling:

- SDK initialization errors
- Camera access issues
- Document scanning failures
- Network connectivity problems
- Invalid document formats

Errors are propagated through the `onError` callback and logged with flow-specific prefixes for debugging.

## Environment Variables

Both components require:

```
REACT_APP_BLINKID_LICENSE_KEY=your_license_key_here
```

The BlinkID SDK engine files should be placed in `/public/resources/` directory.

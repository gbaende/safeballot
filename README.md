# SafeBallot

SafeBallot is a secure online voting platform that enables organizations to run elections of all sizes with confidence. The platform features robust identity verification, real-time monitoring, and advanced security protocols.

## Project Structure

This project consists of two main components:

1. **Backend (Go)**: A RESTful API for handling data management, authentication, and business logic
2. **Frontend (TypeScript/Express.js)**: A server-rendered web application with EJS templates

## Getting Started

### Prerequisites

- Go 1.16 or higher
- Node.js 14.x or higher
- npm 6.x or higher

### Installation

#### Backend Setup

```bash
cd safeballot/backend
go mod tidy
go run main.go
```

The Go backend will start on port 8080 by default.

#### Frontend Setup

```bash
cd safeballot/frontend
npm install
npm run dev
```

The Express.js frontend will start on port 3000 by default.

## Features

### User Authentication

- Email-based registration and login
- Multi-factor authentication options
- Advanced identity verification

### Election Management

- Create and manage ballots
- Set election parameters (duration, participants, etc.)
- Real-time monitoring of election progress

### Secure Voting

- End-to-end encryption
- TrueID™ biometric verification
- One person, one vote validation

## Security Features

- Encrypted connections (HTTPS)
- Data encryption at rest
- ID verification with facial recognition and document scanning
- Audit trails for all system actions

## Future Enhancements

- Blockchain integration for transparent vote recording
- Enhanced analytics dashboard
- Mobile application support
- International ID support for global elections

## License

This project is proprietary and not open for redistribution.

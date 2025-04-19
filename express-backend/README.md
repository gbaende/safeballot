# SafeBallot Express Backend

This is the Express.js backend for the SafeBallot application. It provides the necessary API endpoints for user authentication, ballot management, and voting functionality.

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Sequelize** - ORM for database interactions
- **JWT** - Authentication
- **bcrypt** - Password hashing

## Project Structure

```
express-backend/
├── config/           # Configuration files
├── database/         # Database connection and migration
├── middleware/       # Middleware functions
├── models/           # Database models
├── routes/           # API routes
├── .env              # Environment variables
├── .env.example      # Example environment variables
├── server.js         # Main application file
└── package.json      # Project dependencies
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh-token` - Refresh authentication token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/reset-password/request` - Request password reset
- `POST /api/auth/reset-password/confirm` - Confirm password reset

### Ballots

- `GET /api/ballots` - Get all ballots
- `GET /api/ballots/:id` - Get a ballot by ID
- `POST /api/ballots` - Create a new ballot
- `PUT /api/ballots/:id` - Update a ballot
- `DELETE /api/ballots/:id` - Delete a ballot
- `GET /api/ballots/:id/questions` - Get ballot questions
- `GET /api/ballots/:id/voters` - Get ballot voters
- `POST /api/ballots/:id/voters` - Add voters to a ballot
- `POST /api/ballots/:id/vote` - Cast a vote
- `GET /api/ballots/:id/results` - Get ballot results

### Elections

- `GET /api/elections/summary` - Get election summary
- `GET /api/elections/recent` - Get recent elections
- `GET /api/elections/upcoming` - Get upcoming elections
- `GET /api/elections/status` - Get election status
- `POST /api/elections/start` - Start election
- `POST /api/elections/end` - End election

### Users

- `GET /api/users` - Get all users (admin)
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile
- `POST /api/users/change-password` - Change user password
- `POST /api/users` - Create a new user (admin)
- `GET /api/users/:id` - Get a user by ID (admin)
- `PUT /api/users/:id` - Update a user (admin)
- `DELETE /api/users/:id` - Delete a user (admin)

## Setup and Running

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables: Copy `.env.example` to `.env` and fill in the values
4. Start the development server: `npm run dev`
5. Start the production server: `npm start`

## Database

The application uses PostgreSQL with Sequelize ORM. The models are defined in the `models` directory.

## Authentication

The application uses JWT for authentication. The tokens are stored in the user's browser localStorage and are included in API requests via the Authorization header.

## Error Handling

The application has a centralized error handling middleware in `server.js` that formats and returns appropriate error responses.

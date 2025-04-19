# Migration from Go to Express.js Backend

This document outlines the migration process from the Go backend to the new Express.js backend for the SafeBallot application.

## Overview of Changes

1. Replaced Go backend with Express.js, maintaining the same API endpoints and functionality
2. Implemented PostgreSQL database with Sequelize ORM instead of the Go database implementation
3. Maintained the same authentication flow with JWT tokens
4. Preserved all API endpoints to ensure frontend compatibility
5. Improved error handling and validation

## API Compatibility

The Express backend maintains 100% API compatibility with the Go backend, ensuring that the frontend can work with either backend without modifications:

- All endpoints follow the same URL structure
- Request and response formats are identical
- Authentication mechanism remains the same

## Advantages of Express Backend

1. **Easier Development:** JavaScript throughout the entire stack
2. **Larger Ecosystem:** More packages and libraries available
3. **Simplified Authentication:** JWT implementation is more straightforward
4. **Better Error Handling:** More consistent error responses
5. **Code Sharing:** Models can be shared between frontend and backend
6. **Easier Deployment:** Single runtime (Node.js) for both frontend and backend
7. **Improved Development Experience:** Hot reloading, easier debugging

## Migration Steps

1. **Database Migration:**

   - Create a PostgreSQL database using the provided models
   - Run the Express backend to auto-generate tables with Sequelize

2. **User Migration:**

   - Export users from the Go backend if needed
   - Import users to the new PostgreSQL database
   - Note: Passwords will need to be reset as hash algorithms may differ

3. **Data Migration:**

   - Export ballots, questions, choices, voters, and votes from Go backend
   - Import into the new PostgreSQL database

4. **Configuration:**

   - Set up environment variables in .env file
   - Ensure database connection details are correct
   - Set JWT secrets to match the previous backend

5. **Testing:**
   - Test all endpoints with existing frontend
   - Verify authentication flows
   - Test voting and results functionality

## Deployment

1. **Development Environment:**

   - Run with `npm run dev` to enable hot reloading

2. **Production Environment:**
   - Build with `npm run build` if using TypeScript
   - Run with `npm start`
   - Consider using PM2 or similar for process management

## Troubleshooting

- **Authentication Issues:** Ensure JWT_SECRET matches the previous backend
- **Database Connection:** Verify PostgreSQL connection string
- **CORS Issues:** Check FRONTEND_URL in .env file

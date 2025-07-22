# GuardianPulse API Documentation

## Overview

The GuardianPulse API provides comprehensive endpoints for the revolutionary AI-powered personal safety application. All endpoints are documented using OpenAPI 3.0 specification and are accessible through an interactive Swagger UI.

## API Documentation

### Interactive Documentation
Once the server is running, you can access the interactive API documentation at:
```
http://localhost:8080/api-docs
```

The documentation includes:
- **Interactive endpoint testing** - Test API endpoints directly from the browser
- **Complete request/response schemas** - View all request and response formats
- **Authentication examples** - Learn how to use JWT tokens for protected endpoints
- **Error handling documentation** - Understand all possible error responses

### API Endpoints

#### Health & Status
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with system metrics

#### Authentication
- `POST /api/v1/users/register` - Register a new user account
- `POST /api/v1/users/login` - Login and receive JWT token

#### User Profile (Protected)
- `GET /api/v1/users/me` - Get current user profile (requires authentication)
- `GET /api/v1/users/stats` - Get user statistics (requires authentication)

### Authentication

Protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

To get a JWT token:
1. Register a new account using `POST /api/v1/users/register`
2. Login using `POST /api/v1/users/login`
3. Use the returned token in the `Authorization` header for protected endpoints

### Example Requests

#### Register a New User
```bash
curl -X POST http://localhost:8080/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

#### Get User Profile (with authentication)
```bash
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Response Format

All API responses follow a consistent format:

#### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `500` - Internal Server Error

## Development

### Starting the Server
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Environment Variables
Required environment variables (see `.env.example`):
```
PORT=8080
NODE_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
LOG_LEVEL=info
```

### Database
The API uses PostgreSQL with Prisma ORM. Ensure your database is running and the `DATABASE_URL` environment variable is correctly set.

## Features

- **OpenAPI 3.0 Specification** - Complete API documentation
- **Interactive Swagger UI** - Test endpoints directly from the browser
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Comprehensive request validation using Zod
- **Error Handling** - Standardized error responses
- **Database Integration** - PostgreSQL with Prisma ORM
- **Health Monitoring** - System health and metrics endpoints
- **TypeScript** - Full type safety and IntelliSense support

## Security

- Passwords are hashed using bcrypt
- JWT tokens for stateless authentication
- Input validation on all endpoints
- CORS and security headers configured
- Rate limiting (planned)
- API key authentication (planned)

## Support

For questions or issues, please contact the GuardianPulse development team.

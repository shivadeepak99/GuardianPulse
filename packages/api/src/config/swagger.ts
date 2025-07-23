import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

/**
 * Swagger API Documentation Configuration
 * Generates interactive API documentation from JSDoc comments
 */

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GuardianPulse API',
      version: '1.0.0',
      description: `
Revolutionary AI-powered personal safety application API

## Features
- **REST API** - Complete CRUD operations with authentication
- **Real-time WebSocket** - Live communication using Socket.IO
- **JWT Authentication** - Secure token-based authentication
- **Interactive Documentation** - Test endpoints directly from this interface

## WebSocket Connection
Connect to WebSocket endpoint: \`ws://localhost:${config.port}\`

### Authentication
WebSocket connections require JWT authentication:
\`\`\`javascript
const socket = io('ws://localhost:${config.port}', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
\`\`\`

### Events
- **ping/pong** - Connection health check
- **status:update** - User status updates
- **location:update** - Location sharing for safety
- **emergency:alert** - Emergency alert system
- **message** - Custom messaging

For more details, see the API documentation below.
      `,
      contact: {
        name: 'GuardianPulse Team',
        email: 'api@guardianpulse.com',
        url: 'https://guardianpulse.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: 'Development server',
      },
      {
        url: 'https://api.guardianpulse.com/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            isActive: {
              type: 'boolean',
              description: 'User account status',
            },
            emailVerified: {
              type: 'boolean',
              description: 'Email verification status',
            },
            privacyLevel: {
              type: 'string',
              enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'],
              description: 'User privacy level',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last account update timestamp',
            },
          },
        },
        UserRegistration: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password (minimum 8 characters)',
            },
            firstName: {
              type: 'string',
              minLength: 1,
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              minLength: 1,
              description: 'User last name',
            },
          },
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              description: 'User password',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
            },
            message: {
              type: 'string',
              description: 'Response message',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                token: {
                  type: 'string',
                  description: 'JWT authentication token',
                },
              },
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
            },
            message: {
              type: 'string',
              description: 'Response message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Validation failed',
            },
            error: {
              type: 'string',
              example: 'VALIDATION_ERROR',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field that failed validation',
                  },
                  message: {
                    type: 'string',
                    description: 'Validation error message',
                  },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Error code',
            },
          },
        },
        GuardianInvitation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique invitation identifier',
            },
            inviterId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the user sending the invitation',
            },
            inviteeEmail: {
              type: 'string',
              format: 'email',
              description: 'Email of the person being invited',
            },
            message: {
              type: 'string',
              description: 'Optional message from the inviter',
              nullable: true,
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
              description: 'Current status of the invitation',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the invitation was created',
            },
            respondedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the invitation was responded to',
              nullable: true,
            },
            inviter: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                name: {
                  type: 'string',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
              },
            },
          },
        },
        GuardianRelationship: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique relationship identifier',
            },
            wardId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the ward (person being protected)',
            },
            guardianId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the guardian (person providing protection)',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the relationship is currently active',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of permissions granted to the guardian',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the relationship was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the relationship was last updated',
            },
            ward: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                name: {
                  type: 'string',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
              },
            },
            guardian: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                name: {
                  type: 'string',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page',
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
            },
            hasNextPage: {
              type: 'boolean',
              description: 'Whether there is a next page',
            },
            hasPreviousPage: {
              type: 'boolean',
              description: 'Whether there is a previous page',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/api/*.ts', './src/controllers/*.ts'],
};

// Generate the Swagger specification
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;

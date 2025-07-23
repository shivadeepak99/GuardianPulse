import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  nodeEnv: string;
  logLevel: string;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3BucketName: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };
  app: {
    dashboardUrl: string;
  };
}

/**
 * Application configuration
 * Loads and validates environment variables
 */
export const config: Config = {
  port: parseInt(process.env['PORT'] || '8080', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  logLevel: process.env['LOG_LEVEL'] || 'info',
  database: {
    url: process.env['DATABASE_URL'] || '',
  },
  jwt: {
    secret: process.env['JWT_SECRET'] || '',
    expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
  },
  aws: {
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || '',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || '',
    region: process.env['AWS_REGION'] || 'us-east-1',
    s3BucketName: process.env['S3_BUCKET_NAME'] || '',
  },
  twilio: {
    accountSid: process.env['TWILIO_ACCOUNT_SID'] || '',
    authToken: process.env['TWILIO_AUTH_TOKEN'] || '',
    phoneNumber: process.env['TWILIO_PHONE_NUMBER'] || '',
  },
  email: {
    host: process.env['EMAIL_HOST'] || '',
    port: parseInt(process.env['EMAIL_PORT'] || '587', 10),
    secure: process.env['EMAIL_SECURE'] === 'true', // true for 465, false for other ports
    user: process.env['EMAIL_USER'] || '',
    password: process.env['EMAIL_PASSWORD'] || '',
    from: process.env['EMAIL_FROM'] || process.env['EMAIL_USER'] || '',
  },
  app: {
    dashboardUrl: process.env['DASHBOARD_URL'] || 'http://localhost:5173',
  },
};

/**
 * Validates that all required environment variables are set
 */
export const validateConfig = (): void => {
  const requiredEnvVars = [
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'S3_BUCKET_NAME',
  ];

  // Twilio is optional for development but recommended for production
  const optionalTwilioVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Warn about missing Twilio config in production
  if (config.nodeEnv === 'production') {
    const missingTwilioVars = optionalTwilioVars.filter(envVar => !process.env[envVar]);
    if (missingTwilioVars.length > 0) {
      console.warn(
        `Warning: Missing Twilio environment variables: ${missingTwilioVars.join(', ')}. SMS alerts will be disabled.`,
      );
    }
  }

  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be a valid port number between 1 and 65535');
  }
};

export default config;

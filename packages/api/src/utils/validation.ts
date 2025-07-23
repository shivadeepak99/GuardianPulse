import { z } from 'zod';

/**
 * Validation Schemas for GuardianPulse API
 * Using Zod for runtime type validation and schema enforcement
 */

/**
 * User Registration Schema
 */
export const registerUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(3, 'Email must be at least 3 characters')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
  
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .trim()
    .optional(),
  
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .trim()
    .optional(),
  
  privacyLevel: z
    .enum(['standard', 'high', 'maximum'])
    .default('standard')
    .optional(),
});

/**
 * User Login Schema
 */
export const loginUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(1, 'Password is required'),
});

/**
 * Password Reset Request Schema
 */
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
});

/**
 * Password Reset Schema
 */
export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
});

/**
 * Update User Profile Schema
 */
export const updateUserProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .trim()
    .optional(),
  
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .trim()
    .optional(),
  
  privacyLevel: z
    .enum(['standard', 'high', 'maximum'])
    .optional(),
});

/**
 * Guardian Invitation Schema
 */
export const createGuardianInvitationSchema = z.object({
  inviteeEmail: z
    .string()
    .email('Invalid email format')
    .min(3, 'Email must be at least 3 characters')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),
  
  message: z
    .string()
    .max(500, 'Message must not exceed 500 characters')
    .trim()
    .optional(),
  
  expiresAt: z
    .string()
    .datetime('Invalid date format')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
});

/**
 * Guardian Invitation Response Schema
 */
export const respondToInvitationSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED'], {
    message: 'Status must be either ACCEPTED or DECLINED'
  }),
});

/**
 * Update Guardian Relationship Schema
 */
export const updateGuardianRelationshipSchema = z.object({
  isActive: z.boolean().optional(),
  
  permissions: z
    .array(z.string())
    .max(20, 'Maximum 20 permissions allowed')
    .optional(),
});

/**
 * Guardian Search/Filter Schema
 */
export const guardianFilterSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED']).optional(),
  
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'Page must be greater than 0')
    .default(1),
  
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .default(10),
  
  search: z
    .string()
    .max(100, 'Search term must not exceed 100 characters')
    .trim()
    .optional(),
});

/**
 * Location Schema (shared)
 */
const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
}).optional();

/**
 * Incident Schemas
 */
export const createIncidentSchema = z.object({
  type: z.enum(['SOS_TRIGGERED', 'FALL_DETECTED', 'THROWN_AWAY', 'FAKE_SHUTDOWN']),
  location: locationSchema,
  description: z.string().max(500).optional(),
});

export const manualSOSSchema = z.object({
  location: locationSchema,
  message: z.string().max(500).optional(),
});

export const thrownAwaySchema = z.object({
  confidence: z.number().min(0).max(100),
  sensorData: z.record(z.any()).optional(),
  location: locationSchema,
});

export const fakeShutdownSchema = z.object({
  location: locationSchema,
  deviceInfo: z.record(z.any()).optional(),
});

// Type exports for TypeScript inference
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type CreateGuardianInvitationInput = z.infer<typeof createGuardianInvitationSchema>;
export type RespondToInvitationInput = z.infer<typeof respondToInvitationSchema>;
export type UpdateGuardianRelationshipInput = z.infer<typeof updateGuardianRelationshipSchema>;
export type GuardianFilterInput = z.infer<typeof guardianFilterSchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type ManualSOSInput = z.infer<typeof manualSOSSchema>;
export type ThrownAwayInput = z.infer<typeof thrownAwaySchema>;
export type FakeShutdownInput = z.infer<typeof fakeShutdownSchema>;

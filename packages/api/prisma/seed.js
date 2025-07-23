const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with default configuration values...');

  // Default configuration values for fall detection and app settings
  const defaultConfigs = [
    // Fall Detection Settings
    {
      key: 'FALL_SENSITIVITY_THRESHOLD',
      value: '20',
      description: 'Acceleration threshold in m/s² for fall detection',
      category: 'fall_detection'
    },
    {
      key: 'FALL_CONFIDENCE_THRESHOLD',
      value: '0.7',
      description: 'Minimum confidence score (0-1) required for fall detection',
      category: 'fall_detection'
    },
    {
      key: 'FALL_SENSITIVITY_LOW_G',
      value: '15',
      description: 'Low sensitivity threshold for fall detection (m/s²)',
      category: 'fall_detection'
    },
    {
      key: 'FALL_SENSITIVITY_HIGH_G',
      value: '25',
      description: 'High sensitivity threshold for fall detection (m/s²)',
      category: 'fall_detection'
    },
    
    // Alert Settings
    {
      key: 'ALERT_TIMEOUT_SECONDS',
      value: '30',
      description: 'Timeout in seconds before automatic incident creation',
      category: 'alerts'
    },
    {
      key: 'SMS_RATE_LIMIT_PER_HOUR',
      value: '10',
      description: 'Maximum SMS alerts per hour per user',
      category: 'alerts'
    },
    {
      key: 'EMAIL_RATE_LIMIT_PER_HOUR',
      value: '20',
      description: 'Maximum email alerts per hour per user',
      category: 'alerts'
    },
    
    // Data Buffering Settings
    {
      key: 'REDIS_BUFFER_SIZE',
      value: '60',
      description: 'Number of data points to buffer in Redis (approximately 1 minute)',
      category: 'data_buffering'
    },
    {
      key: 'REDIS_BUFFER_TTL_SECONDS',
      value: '600',
      description: 'Time-to-live for Redis buffered data in seconds',
      category: 'data_buffering'
    },
    
    // Feature Flags
    {
      key: 'FEATURE_AUDIO_STREAMING',
      value: 'true',
      description: 'Enable/disable audio streaming feature',
      category: 'features'
    },
    {
      key: 'FEATURE_GPS_TRACKING',
      value: 'true',
      description: 'Enable/disable GPS location tracking',
      category: 'features'
    },
    {
      key: 'FEATURE_FALL_DETECTION',
      value: 'true',
      description: 'Enable/disable automatic fall detection',
      category: 'features'
    },
    {
      key: 'FEATURE_REDIS_BUFFERING',
      value: 'true',
      description: 'Enable/disable Redis data buffering',
      category: 'features'
    }
  ];

  // Upsert each configuration
  for (const config of defaultConfigs) {
    try {
      await prisma.appConfig.upsert({
        where: { key: config.key },
        update: {
          description: config.description,
          category: config.category,
          updatedAt: new Date()
        },
        create: {
          key: config.key,
          value: config.value,
          description: config.description,
          category: config.category,
          isActive: true
        }
      });
      
      console.log(`✅ Seeded config: ${config.key} = ${config.value}`);
    } catch (error) {
      console.error(`❌ Failed to seed config ${config.key}:`, error);
    }
  }

  console.log('🎉 Database seeding completed!');
  console.log(`📊 Total configurations seeded: ${defaultConfigs.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

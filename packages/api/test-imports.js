console.log('Testing module imports...');

try {
  console.log('1. Testing config import...');
  require('./dist/src/config');
  console.log('✅ Config imported successfully');
} catch (error) {
  console.error('❌ Config import failed:', error);
}

try {
  console.log('2. Testing services import...');
  require('./dist/src/services');
  console.log('✅ Services imported successfully');
} catch (error) {
  console.error('❌ Services import failed:', error);
}

try {
  console.log('3. Testing database service...');
  const { DatabaseService } = require('./dist/src/services/database.service');
  console.log('✅ DatabaseService imported successfully');
} catch (error) {
  console.error('❌ DatabaseService import failed:', error);
}

console.log('Import test completed');

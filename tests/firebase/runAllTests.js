// Run All Firebase Tests - Complete Backend Testing Suite
const admin = require('./adminApp');
const firebaseConfig = require('../../firebase.config');

console.log('\n🚀 AssignMint Firebase Backend Test Suite\n');
console.log('==========================================\n');

const credentialSource =
  admin.__assignmintCredentialSource ||
  (process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'application-default' : 'unknown');

console.log('✅ Firebase initialized with project:', firebaseConfig.projectId);
console.log(`✅ Credential source: ${credentialSource}\n`);

async function runAllTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  console.log('Running tests...\n');

  // Test 1: Connection
  console.log('═══════════════════════════════════════════\n');
  try {
    const { testConnection } = require('./testConnection');
    const success = await testConnection();
    results.tests.push({ name: 'Connection Test', passed: success });
    if (success) results.passed++;
    else results.failed++;
  } catch (error) {
    console.log('⚠️  Connection test skipped:', error.message);
    results.tests.push({ name: 'Connection Test', passed: false, error: error.message });
    results.failed++;
  }

  // Test 2: Messages
  console.log('═══════════════════════════════════════════\n');
  try {
    const { testMessages } = require('./testMessages');
    const success = await testMessages();
    results.tests.push({ name: 'Messages Test', passed: success });
    if (success) results.passed++;
    else results.failed++;
  } catch (error) {
    console.log('⚠️  Messages test skipped:', error.message);
    results.tests.push({ name: 'Messages Test', passed: false, error: error.message });
    results.failed++;
  }

  // Test 3: Tasks
  console.log('═══════════════════════════════════════════\n');
  try {
    const { testTasks } = require('./testTasks');
    const success = await testTasks();
    results.tests.push({ name: 'Tasks Test', passed: success });
    if (success) results.passed++;
    else results.failed++;
  } catch (error) {
    console.log('⚠️  Tasks test skipped:', error.message);
    results.tests.push({ name: 'Tasks Test', passed: false, error: error.message });
    results.failed++;
  }

  // Print summary
  console.log('═══════════════════════════════════════════');
  console.log('\n📊 Test Summary\n');
  console.log('Total Tests:', results.tests.length);
  console.log('Passed:', results.passed, '✅');
  console.log('Failed:', results.failed, '❌');
  console.log('');

  results.tests.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });

  console.log('\n==========================================\n');

  return results.failed === 0;
}

// Run tests
runAllTests()
  .then(success => {
    if (success) {
      console.log('🎉 All tests passed! Backend is ready.\n');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Check the output above.\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });


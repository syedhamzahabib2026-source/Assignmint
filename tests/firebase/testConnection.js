// Firebase Connection Test - Direct Testing without Simulator
const admin = require('./adminApp');

const db = admin.firestore();

async function testConnection() {
  console.log('\n🔥 Firebase Connection Test\n');
  console.log('================================\n');

  try {
    // Test 1: Check Firestore connection
    console.log('1️⃣  Testing Firestore connection...');
    const testDoc = await db.collection('_test').doc('connection').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'connected'
    });
    console.log('✅ Firestore connected successfully!\n');

    // Test 2: Read the document back
    console.log('2️⃣  Testing read operation...');
    const docSnap = await db.collection('_test').doc('connection').get();
    if (docSnap.exists) {
      console.log('✅ Read operation successful!');
      console.log('   Data:', docSnap.data(), '\n');
    }

    // Test 3: List collections
    console.log('3️⃣  Listing available collections...');
    const collections = await db.listCollections();
    console.log('✅ Available collections:');
    collections.forEach(col => console.log('   -', col.id));
    console.log('');

    // Test 4: Clean up test data
    console.log('4️⃣  Cleaning up test data...');
    await db.collection('_test').doc('connection').delete();
    console.log('✅ Cleanup successful!\n');

    console.log('================================');
    console.log('🎉 All tests passed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testConnection()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testConnection };


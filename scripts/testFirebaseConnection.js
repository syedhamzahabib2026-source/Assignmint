// Test Firebase connection script
const auth = require('@react-native-firebase/auth').default;
const firestore = require('@react-native-firebase/firestore').default;

console.log('🔍 Testing Firebase Connection...\n');

async function testConnection() {
  try {
    // Test Firestore connection
    console.log('1️⃣ Testing Firestore connection...');
    const snapshot = await firestore().collection('tasks').limit(1).get();
    console.log('✅ Firestore connected! Found', snapshot.size, 'task(s)');

    // Test Auth initialization
    console.log('\n2️⃣ Testing Firebase Auth...');
    const currentUser = auth().currentUser;
    console.log('✅ Firebase Auth initialized!');
    console.log('   Current user:', currentUser ? currentUser.email : 'None (not signed in)');

    console.log('\n🎉 All Firebase services connected successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Firebase connection failed:');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });


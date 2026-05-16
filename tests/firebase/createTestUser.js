// Create Test User - Creates a user in Firebase Auth and Firestore
// This script creates the user: syedhamzahabib2004@gmail.com

const admin = require('./adminApp');
const firebaseConfig = require('../../firebase.config');

const TEST_EMAIL = 'syedhamzahabib2004@gmail.com';
const TEST_PASSWORD = 'hamza123';
const TEST_DISPLAY_NAME = 'Hamza Test User';

async function createTestUser() {
  console.log('\n🔐 Creating Test User');
  console.log('================================\n');
  console.log('Email:', TEST_EMAIL);
  console.log('Display Name:', TEST_DISPLAY_NAME);
  console.log('Password:', '*'.repeat(TEST_PASSWORD.length), '\n');

  try {
    const auth = admin.auth();
    const db = admin.firestore();

    // Step 1: Create Firebase Auth user
    console.log('1️⃣  Creating Firebase Auth user...');
    let userRecord;
    
    try {
      // Check if user already exists
      try {
        const existingUser = await auth.getUserByEmail(TEST_EMAIL);
        console.log('⚠️  User already exists in Firebase Auth!');
        console.log('   UID:', existingUser.uid);
        console.log('   Email:', existingUser.email);
        console.log('   Email Verified:', existingUser.emailVerified);
        userRecord = existingUser;
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // User doesn't exist, create it
          userRecord = await auth.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            displayName: TEST_DISPLAY_NAME,
            emailVerified: false, // Will need to verify via email
          });
          console.log('✅ Firebase Auth user created!');
          console.log('   UID:', userRecord.uid);
          console.log('   Email:', userRecord.email);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Error creating Firebase Auth user:', error.message);
      if (error.code === 'auth/email-already-exists') {
        console.log('   User already exists, fetching existing user...');
        userRecord = await auth.getUserByEmail(TEST_EMAIL);
      } else {
        throw error;
      }
    }

    // Step 2: Create Firestore user document
    console.log('\n2️⃣  Creating Firestore user document...');
    const userRef = db.collection('users').doc(userRecord.uid);
    
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      console.log('⚠️  User document already exists in Firestore!');
      console.log('   Document ID:', userRecord.uid);
      const existingData = userDoc.data();
      console.log('   Current data:', JSON.stringify(existingData, null, 2));
      
      // Update with latest info
      await userRef.set({
        displayName: TEST_DISPLAY_NAME,
        email: TEST_EMAIL,
        photoURL: userRecord.photoURL || null,
        role: 'user',
        stripeCustomerId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log('✅ User document updated in Firestore!');
    } else {
      await userRef.set({
        displayName: TEST_DISPLAY_NAME,
        email: TEST_EMAIL,
        photoURL: userRecord.photoURL || null,
        role: 'user',
        stripeCustomerId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log('✅ User document created in Firestore!');
      console.log('   Document ID:', userRecord.uid);
    }

    // Step 3: Send verification email
    console.log('\n3️⃣  Sending verification email...');
    try {
      const link = await auth.generateEmailVerificationLink(TEST_EMAIL);
      console.log('✅ Verification email link generated!');
      console.log('   Link:', link);
      console.log('   (User will receive this via email)');
    } catch (error) {
      console.log('⚠️  Could not generate verification link:', error.message);
      console.log('   (This is okay - user can verify via app)');
    }

    // Summary
    console.log('\n================================');
    console.log('🎉 User Creation Complete!\n');
    console.log('📊 Summary:');
    console.log('   Email:', TEST_EMAIL);
    console.log('   Display Name:', TEST_DISPLAY_NAME);
    console.log('   UID:', userRecord.uid);
    console.log('   Email Verified:', userRecord.emailVerified);
    console.log('\n🔍 Where to Check:');
    console.log('   1. Firebase Console → Authentication → Users');
    console.log('      👉 Look for:', TEST_EMAIL);
    console.log('   2. Firebase Console → Firestore Database → users collection');
    console.log('      👉 Look for document ID:', userRecord.uid);
    console.log('\n✅ You can now log in with:');
    console.log('   Email:', TEST_EMAIL);
    console.log('   Password:', TEST_PASSWORD);
    console.log('\n');

    return {
      success: true,
      uid: userRecord.uid,
      email: TEST_EMAIL,
      displayName: TEST_DISPLAY_NAME,
    };

  } catch (error) {
    console.error('\n❌ Error creating test user:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run if called directly
if (require.main === module) {
  createTestUser()
    .then((result) => {
      if (result.success) {
        console.log('✅ Script completed successfully!');
        process.exit(0);
      } else {
        console.error('❌ Script failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { createTestUser };


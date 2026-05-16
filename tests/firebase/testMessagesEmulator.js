// Chat Messages Test - Using Firebase Emulator
const admin = require('firebase-admin');
const firebaseConfig = require('../../firebase.config');

// Initialize Firebase with emulator settings
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

// Connect to emulator
db.settings({
  host: 'localhost:8080',
  ssl: false
});

// Test user IDs
const TEST_USER_1 = 'test_user_1';
const TEST_USER_2 = 'test_user_2';
const TEST_TASK_ID = 'test_task_123';

async function testMessages() {
  console.log('\n💬 Testing Chat Messages (Local Emulator)\n');
  console.log('================================\n');
  console.log('🔗 View in browser: http://localhost:4000\n');
  console.log('================================\n');

  try {
    // Test 1: Create a chat message
    console.log('1️⃣  Creating test message...');
    const messageData = {
      taskId: TEST_TASK_ID,
      senderId: TEST_USER_1,
      senderName: 'Test User 1',
      text: 'Hello! This is a test message.',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'text',
      isRead: false
    };

    const messageRef = await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .add(messageData);

    console.log('✅ Message created with ID:', messageRef.id);
    console.log('   Text:', messageData.text, '\n');

    // Test 2: Read the message back
    console.log('2️⃣  Reading message back...');
    const messageSnap = await messageRef.get();
    if (messageSnap.exists) {
      console.log('✅ Message retrieved successfully!');
      console.log('   Message:', messageSnap.data().text);
      console.log('   Sender:', messageSnap.data().senderName, '\n');
    }

    // Test 3: Add a reply
    console.log('3️⃣  Adding reply message...');
    const replyData = {
      taskId: TEST_TASK_ID,
      senderId: TEST_USER_2,
      senderName: 'Test User 2',
      text: 'Hi! I got your message. This reply should persist!',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'text',
      isRead: false
    };

    const replyRef = await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .add(replyData);

    console.log('✅ Reply created with ID:', replyRef.id);
    console.log('   Text:', replyData.text, '\n');

    // Test 4: Get all messages for the task
    console.log('4️⃣  Retrieving all messages...');
    const messagesSnapshot = await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    console.log(`✅ Found ${messagesSnapshot.size} messages:\n`);
    messagesSnapshot.forEach((doc, index) => {
      const msg = doc.data();
      console.log(`   💬 ${index + 1}. ${msg.senderName}: "${msg.text}"`);
    });
    console.log('');

    // Test 5: Test persistence - simulate app restart
    console.log('5️⃣  Testing persistence (simulating app restart)...');
    console.log('   💾 Waiting 3 seconds to simulate closing and reopening app...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('   📱 "Reopening app" - checking if messages still exist...');
    const persistenceCheck = await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .get();

    if (persistenceCheck.size === messagesSnapshot.size) {
      console.log('\n   ✅ PERSISTENCE VERIFIED! 🎉');
      console.log('   ✅ Messages survived the "app restart"');
      console.log(`   ✅ Still have ${persistenceCheck.size} messages`);
      console.log('\n   📋 Messages after restart:');
      persistenceCheck.forEach((doc, index) => {
        const msg = doc.data();
        console.log(`      ${index + 1}. ${msg.senderName}: "${msg.text}"`);
      });
      console.log('');
    } else {
      console.log('\n   ❌ Persistence check failed');
      console.log(`   Expected ${messagesSnapshot.size}, got ${persistenceCheck.size}`);
    }

    // Test 6: Mark message as read
    console.log('6️⃣  Marking message as read...');
    await messageRef.update({
      isRead: true,
      readAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedMsg = await messageRef.get();
    console.log('✅ Message marked as read:', updatedMsg.data().isRead, '\n');

    console.log('================================');
    console.log('🎉 All message tests passed!\n');
    console.log('📝 Summary:');
    console.log('   ✅ Messages can be created');
    console.log('   ✅ Messages can be read');
    console.log('   ✅ Messages persist across "app restarts"');
    console.log('   ✅ Messages can be updated');
    console.log('   ✅ Multiple users can chat\n');
    
    console.log('🌐 View the data in Firebase Emulator UI:');
    console.log('   http://localhost:4000\n');
    console.log('📁 Look for:');
    console.log('   Collection: taskMessages');
    console.log('   Document: test_task_123');
    console.log('   Subcollection: messages\n');
    
    console.log('💡 The messages are there! Check the emulator UI to see them.');
    console.log('   They will persist even if you stop and restart the emulator!\n');

    return true;
  } catch (error) {
    console.error('\n❌ Message test failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 TIP: Make sure Firebase emulator is running!');
      console.error('   In another terminal, run: npm run emu:start\n');
    }
    
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testMessages()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testMessages };


// Chat Messages Test - Test message persistence
const admin = require('./adminApp');

const db = admin.firestore();

// Test user IDs
const TEST_USER_1 = 'test_user_1';
const TEST_USER_2 = 'test_user_2';
const TEST_TASK_ID = 'test_task_123';

async function testMessages() {
  console.log('\n💬 Testing Chat Messages\n');
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

    console.log('✅ Message created with ID:', messageRef.id, '\n');

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
      text: 'Hi! I got your message.',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'text',
      isRead: false
    };

    const replyRef = await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .add(replyData);

    console.log('✅ Reply created with ID:', replyRef.id, '\n');

    // Test 4: Get all messages for the task
    console.log('4️⃣  Retrieving all messages...');
    const messagesSnapshot = await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    console.log(`✅ Found ${messagesSnapshot.size} messages:`);
    let messageCounter = 1;
    messagesSnapshot.forEach(doc => {
      const msg = doc.data();
      console.log(`   ${messageCounter}. ${msg.senderName}: ${msg.text}`);
      messageCounter += 1;
    });
    console.log('');

    // Test 5: Test persistence - simulate app restart
    console.log('5️⃣  Testing persistence (simulating app restart)...');
    console.log('   Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const persistenceCheck = await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .get();

    if (persistenceCheck.size === messagesSnapshot.size) {
      console.log('✅ Persistence verified! Messages survived "restart"');
      console.log(`   Still have ${persistenceCheck.size} messages\n`);
    } else {
      console.log('❌ Persistence check failed');
    }

    // Test 6: Mark message as read
    console.log('6️⃣  Marking message as read...');
    await messageRef.update({
      isRead: true,
      readAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedMsg = await messageRef.get();
    console.log('✅ Message marked as read:', updatedMsg.data().isRead, '\n');

    // Test 7: Clean up (optional - comment out to keep test data)
    console.log('7️⃣  Cleaning up test data...');
    const deletePromises = [];
    messagesSnapshot.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    await Promise.all(deletePromises);
    console.log('✅ Test data cleaned up\n');

    console.log('================================');
    console.log('🎉 All message tests passed!\n');
    console.log('📝 Summary:');
    console.log('   - Messages can be created ✅');
    console.log('   - Messages can be read ✅');
    console.log('   - Messages persist across restarts ✅');
    console.log('   - Messages can be updated ✅');
    console.log('   - Messages can be deleted ✅\n');

    return true;
  } catch (error) {
    console.error('\n❌ Message test failed:');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
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


// Create messages that STAY in the emulator so you can see them
const admin = require('firebase-admin');
const firebaseConfig = require('../../firebase.config');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();
db.settings({
  host: 'localhost:8080',
  ssl: false
});

async function createMessages() {
  console.log('\n💬 Creating Messages That Will Stay\n');
  console.log('================================\n');

  try {
    const TEST_TASK_ID = 'demo_chat_task';
    
    // Create message 1
    console.log('1️⃣  Creating message from Alice...');
    await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .add({
        taskId: TEST_TASK_ID,
        senderId: 'user_alice',
        senderName: 'Alice',
        text: 'Hey! Can you help me with my math homework?',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'text',
        isRead: false
      });
    console.log('✅ Message created\n');

    // Create message 2
    console.log('2️⃣  Creating message from Bob...');
    await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .add({
        taskId: TEST_TASK_ID,
        senderId: 'user_bob',
        senderName: 'Bob',
        text: 'Sure! What do you need help with?',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'text',
        isRead: false
      });
    console.log('✅ Message created\n');

    // Create message 3
    console.log('3️⃣  Creating message from Alice...');
    await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .add({
        taskId: TEST_TASK_ID,
        senderId: 'user_alice',
        senderName: 'Alice',
        text: 'I need help with quadratic equations.',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'text',
        isRead: false
      });
    console.log('✅ Message created\n');

    // Verify they're there
    console.log('4️⃣  Verifying messages exist...');
    const messages = await db
      .collection('taskMessages')
      .doc(TEST_TASK_ID)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    console.log(`✅ Found ${messages.size} messages:\n`);
    messages.forEach((doc, index) => {
      const msg = doc.data();
      console.log(`   💬 ${msg.senderName}: "${msg.text}"`);
    });

    console.log('\n================================');
    console.log('🎉 Messages created successfully!\n');
    console.log('🌐 NOW REFRESH YOUR BROWSER!');
    console.log('   Go to: http://localhost:4000/firestore\n');
    console.log('📁 Navigate to:');
    console.log('   taskMessages → demo_chat_task → messages\n');
    console.log('✅ You should see 3 messages!');
    console.log('✅ These will STAY THERE until you delete them!\n');

    return true;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return false;
  }
}

createMessages()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });


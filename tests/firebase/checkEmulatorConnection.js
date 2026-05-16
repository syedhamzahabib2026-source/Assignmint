// Quick check to see what's in the emulator
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

async function checkData() {
  console.log('\n🔍 Checking what\'s in the emulator...\n');
  
  // List all collections
  const collections = await db.listCollections();
  console.log('Collections found:');
  collections.forEach(col => console.log('  -', col.id));
  
  // Check taskMessages specifically
  console.log('\n📬 Checking taskMessages collection:');
  const taskMessages = await db.collection('taskMessages').get();
  console.log('  Documents:', taskMessages.size);
  
  if (taskMessages.size > 0) {
    taskMessages.forEach(doc => {
      console.log('  - Document ID:', doc.id);
    });
    
    // Check messages subcollection
    const testTaskDoc = await db.collection('taskMessages').doc('test_task_123').get();
    if (testTaskDoc.exists) {
      console.log('\n📨 Checking messages in test_task_123:');
      const messages = await db.collection('taskMessages').doc('test_task_123').collection('messages').get();
      console.log('  Messages found:', messages.size);
      messages.forEach(msg => {
        const data = msg.data();
        console.log(`  - ${data.senderName}: "${data.text}"`);
      });
    }
  }
}

checkData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

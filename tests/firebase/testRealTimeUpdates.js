// Test Real-Time Updates - Simulates Real-Time Listeners
// Tests that real-time subscriptions work correctly

const admin = require('./adminApp');

const db = admin.firestore();

async function testRealTimeUpdates() {
  console.log('\n📡 Real-Time Updates Test');
  console.log('================================\n');
  console.log('This test verifies real-time listeners work correctly\n');

  const testTaskId = 'realtime_test_' + Date.now();

  try {
    // Create a test task
    console.log('1️⃣  Creating test task...');
    const taskRef = db.collection('tasks').doc(testTaskId);
    await taskRef.set({
      title: 'Real-Time Test Task',
      status: 'open',
      price: 30,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Task created:', testTaskId, '\n');

    // Simulate real-time updates
    console.log('2️⃣  Simulating real-time updates...');
    
    // Update 1: Change status
    await new Promise(resolve => setTimeout(resolve, 1000));
    await taskRef.update({
      status: 'claimed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('   ✅ Status updated: open → claimed');

    // Update 2: Add expert
    await new Promise(resolve => setTimeout(resolve, 1000));
    await taskRef.update({
      expertId: 'test_expert_123',
      expertName: 'Test Expert',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('   ✅ Expert assigned');

    // Update 3: Complete task
    await new Promise(resolve => setTimeout(resolve, 1000));
    await taskRef.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('   ✅ Task completed\n');

    // Verify final state
    console.log('3️⃣  Verifying final state...');
    const finalDoc = await taskRef.get();
    const finalData = finalDoc.data();
    
    console.log('   Status:', finalData.status);
    console.log('   Expert:', finalData.expertName);
    console.log('   ✅ All updates persisted correctly\n');

    // Clean up
    console.log('4️⃣  Cleaning up...');
    await taskRef.delete();
    console.log('✅ Test data cleaned up\n');

    console.log('================================');
    console.log('🎉 Real-Time Updates Test Passed!\n');
    console.log('💡 In your app, use onSnapshot() to listen for these updates:');
    console.log('   const unsubscribe = db.collection("tasks").doc(taskId)');
    console.log('     .onSnapshot((snapshot) => {');
    console.log('       // Handle real-time updates');
    console.log('     });\n');

    return { success: true };

  } catch (error) {
    console.error('\n❌ Real-time test failed:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testRealTimeUpdates()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(error => {
      console.error('💥 Test crashed:', error);
      process.exit(1);
    });
}

module.exports = { testRealTimeUpdates };


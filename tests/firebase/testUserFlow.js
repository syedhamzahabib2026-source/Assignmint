// Complete User Flow Test - Simulates Real App Usage
// Run this to test entire user flows, then check Firebase Console to verify data

const admin = require('./adminApp');
const firebaseConfig = require('../../firebase.config');

const db = admin.firestore();

// Test data
const TEST_USER = {
  email: 'testuser@assignmint.com',
  displayName: 'Test User',
  uid: 'test_user_' + Date.now()
};

const TEST_EXPERT = {
  email: 'testexpert@assignmint.com',
  displayName: 'Test Expert',
  uid: 'test_expert_' + Date.now()
};

async function testCompleteUserFlow() {
  console.log('\n🎯 Complete User Flow Test');
  console.log('================================\n');
  console.log('This test simulates a complete user journey:');
  console.log('1. User creates account');
  console.log('2. User posts a task');
  console.log('3. Expert accepts task');
  console.log('4. User and expert chat');
  console.log('5. Expert completes task');
  console.log('6. User rates expert\n');

  try {
    // Step 1: Create User Profile
    console.log('1️⃣  Creating user profile...');
    const userRef = db.collection('users').doc(TEST_USER.uid);
    await userRef.set({
      uid: TEST_USER.uid,
      email: TEST_USER.email,
      displayName: TEST_USER.displayName,
      role: 'requester',
      trustScore: 100,
      rating: 0,
      totalReviews: 0,
      tasksCompleted: 0,
      tasksPosted: 0,
      totalEarnings: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ User profile created:', TEST_USER.uid);
    console.log('   👉 Check Firebase Console: users/' + TEST_USER.uid + '\n');

    // Step 2: Create Expert Profile
    console.log('2️⃣  Creating expert profile...');
    const expertRef = db.collection('users').doc(TEST_EXPERT.uid);
    await expertRef.set({
      uid: TEST_EXPERT.uid,
      email: TEST_EXPERT.email,
      displayName: TEST_EXPERT.displayName,
      role: 'expert',
      trustScore: 100,
      rating: 4.8,
      totalReviews: 15,
      tasksCompleted: 15,
      tasksPosted: 0,
      totalEarnings: 500,
      specialties: ['Mathematics', 'Physics'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Expert profile created:', TEST_EXPERT.uid);
    console.log('   👉 Check Firebase Console: users/' + TEST_EXPERT.uid + '\n');

    // Step 3: User Posts a Task
    console.log('3️⃣  User posting a task...');
    const taskData = {
      title: 'Help with Calculus Homework',
      description: 'Need help solving derivatives and integrals for Chapter 5',
      subject: 'Mathematics',
      gradeLevel: 'High School',
      price: 25.00,
      deadline: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ),
      status: 'open',
      urgency: 'medium',
      requesterId: TEST_USER.uid,
      requesterName: TEST_USER.displayName,
      tags: ['calculus', 'math', 'homework'],
      attachments: [],
      isActive: true,
      isPublic: true,
      matchingType: 'manual',
      viewCount: 0,
      applicantCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const taskRef = await db.collection('tasks').add(taskData);
    const taskId = taskRef.id;
    console.log('✅ Task posted:', taskId);
    console.log('   Title:', taskData.title);
    console.log('   Price: $' + taskData.price);
    console.log('   👉 Check Firebase Console: tasks/' + taskId + '\n');

    // Step 4: Expert Accepts Task
    console.log('4️⃣  Expert accepting task...');
    await taskRef.update({
      status: 'claimed',
      expertId: TEST_EXPERT.uid,
      expertName: TEST_EXPERT.displayName,
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Task accepted by expert');
    console.log('   Expert:', TEST_EXPERT.displayName);
    console.log('   👉 Check Firebase Console: tasks/' + taskId + ' (status should be "claimed")\n');

    // Step 5: User and Expert Chat
    console.log('5️⃣  Starting chat conversation...');
    const chatRef = db.collection('taskMessages').doc(taskId);
    
    // User sends first message
    const message1Ref = await chatRef.collection('messages').add({
      taskId: taskId,
      senderId: TEST_USER.uid,
      senderName: TEST_USER.displayName,
      text: 'Hi! Thanks for accepting my task. When can you start?',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'text',
      isRead: false
    });
    console.log('✅ User sent message:', message1Ref.id);

    // Expert replies
    const message2Ref = await chatRef.collection('messages').add({
      taskId: taskId,
      senderId: TEST_EXPERT.uid,
      senderName: TEST_EXPERT.displayName,
      text: 'I can start right away! I\'ll have it done by tomorrow.',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'text',
      isRead: false
    });
    console.log('✅ Expert replied:', message2Ref.id);
    console.log('   👉 Check Firebase Console: taskMessages/' + taskId + '/messages/\n');

    // Step 6: Expert Completes Task
    console.log('6️⃣  Expert completing task...');
    await taskRef.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Task marked as completed');
    console.log('   👉 Check Firebase Console: tasks/' + taskId + ' (status should be "completed")\n');

    // Step 7: User Rates Expert
    console.log('7️⃣  User rating expert...');
    const ratingRef = await db.collection('ratings').add({
      fromUserId: TEST_USER.uid,
      fromUserName: TEST_USER.displayName,
      toUserId: TEST_EXPERT.uid,
      toUserName: TEST_EXPERT.displayName,
      taskId: taskId,
      rating: 5,
      comment: 'Great work! Very helpful and completed on time.',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Rating created:', ratingRef.id);
    console.log('   Rating: 5/5');
    console.log('   👉 Check Firebase Console: ratings/' + ratingRef.id + '\n');

    // Step 8: Update User Stats
    console.log('8️⃣  Updating user statistics...');
    await userRef.update({
      tasksPosted: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await expertRef.update({
      tasksCompleted: admin.firestore.FieldValue.increment(1),
      totalEarnings: admin.firestore.FieldValue.increment(taskData.price),
      totalReviews: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Statistics updated');
    console.log('   👉 Check Firebase Console: users/' + TEST_USER.uid + ' and users/' + TEST_EXPERT.uid + '\n');

    // Summary
    console.log('================================');
    console.log('🎉 Complete User Flow Test Passed!\n');
    console.log('📊 Test Summary:');
    console.log('   ✅ User profile created');
    console.log('   ✅ Expert profile created');
    console.log('   ✅ Task posted');
    console.log('   ✅ Task accepted');
    console.log('   ✅ Messages exchanged');
    console.log('   ✅ Task completed');
    console.log('   ✅ Expert rated');
    console.log('   ✅ Statistics updated\n');
    
    console.log('🔍 Verify in Firebase Console:');
    console.log('   1. Go to: https://console.firebase.google.com/project/' + firebaseConfig.projectId + '/firestore');
    console.log('   2. Check these collections:');
    console.log('      - users/' + TEST_USER.uid);
    console.log('      - users/' + TEST_EXPERT.uid);
    console.log('      - tasks/' + taskId);
    console.log('      - taskMessages/' + taskId + '/messages/');
    console.log('      - ratings/ (find the new rating)\n');

    return {
      success: true,
      userId: TEST_USER.uid,
      expertId: TEST_EXPERT.uid,
      taskId: taskId
    };

  } catch (error) {
    console.error('\n❌ User flow test failed:');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  testCompleteUserFlow()
    .then(result => {
      if (result.success) {
        console.log('✅ All tests passed!');
        process.exit(0);
      } else {
        console.log('❌ Tests failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteUserFlow };


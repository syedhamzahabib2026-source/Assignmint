// Test Task Posting Flow - Simulates User Posting Multiple Tasks
// Perfect for testing the PostTaskScreen functionality

const admin = require('./adminApp');
const firebaseConfig = require('../../firebase.config');

const db = admin.firestore();

async function testTaskPosting() {
  console.log('\n📝 Task Posting Test');
  console.log('================================\n');
  console.log('This test simulates users posting different types of tasks\n');

  const testUser = {
    uid: 'test_poster_' + Date.now(),
    email: 'poster@test.com',
    displayName: 'Task Poster'
  };

  try {
    // Create test user
    console.log('1️⃣  Creating test user...');
    await db.collection('users').doc(testUser.uid).set({
      uid: testUser.uid,
      email: testUser.email,
      displayName: testUser.displayName,
      role: 'requester',
      tasksPosted: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ User created:', testUser.uid, '\n');

    // Post different types of tasks
    const tasks = [
      {
        title: 'Math Homework - Algebra',
        description: 'Need help with quadratic equations',
        subject: 'Mathematics',
        price: 20,
        urgency: 'high',
        tags: ['algebra', 'math']
      },
      {
        title: 'Python Programming Assignment',
        description: 'Build a web scraper using BeautifulSoup',
        subject: 'Coding',
        price: 50,
        urgency: 'medium',
        tags: ['python', 'programming']
      },
      {
        title: 'Essay Writing - History',
        description: 'Write a 5-page essay on World War II',
        subject: 'Writing',
        price: 40,
        urgency: 'low',
        tags: ['essay', 'history']
      }
    ];

    const postedTasks = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`${i + 2}️⃣  Posting task: "${task.title}"...`);
      
      const taskRef = await db.collection('tasks').add({
        title: task.title,
        description: task.description,
        subject: task.subject,
        price: task.price,
        deadline: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000)
        ),
        status: 'open',
        urgency: task.urgency,
        requesterId: testUser.uid,
        requesterName: testUser.displayName,
        tags: task.tags,
        isActive: true,
        isPublic: true,
        matchingType: 'manual',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      postedTasks.push({ id: taskRef.id, ...task });
      console.log('✅ Task posted:', taskRef.id);
      console.log('   👉 Check Firebase: tasks/' + taskRef.id + '\n');
    }

    // Update user stats
    await db.collection('users').doc(testUser.uid).update({
      tasksPosted: tasks.length,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('================================');
    console.log('🎉 Task Posting Test Complete!\n');
    console.log('📊 Posted Tasks:');
    postedTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.title} ($${task.price}) - ID: ${task.id}`);
    });
    console.log('\n🔍 Verify in Firebase Console:');
    console.log('   - Collection: tasks');
    console.log('   - Filter by: requesterId = ' + testUser.uid);
    console.log('   - Should see ' + tasks.length + ' tasks\n');

    return { success: true, tasks: postedTasks };

  } catch (error) {
    console.error('\n❌ Task posting test failed:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testTaskPosting()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(error => {
      console.error('💥 Test crashed:', error);
      process.exit(1);
    });
}

module.exports = { testTaskPosting };


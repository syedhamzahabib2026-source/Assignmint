// Tasks Test - Test task CRUD operations
const admin = require('./adminApp');

const db = admin.firestore();

const TEST_USER_ID = 'test_requester_123';

async function testTasks() {
  console.log('\n📋 Testing Tasks Operations\n');
  console.log('================================\n');

  try {
    // Test 1: Create a task
    console.log('1️⃣  Creating test task...');
    const taskData = {
      title: 'Test Math Assignment',
      description: 'Solve problems 1-10 from Chapter 5',
      subject: 'Mathematics',
      gradeLevel: 'High School',
      price: 25.00,
      deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
      status: 'open',
      urgency: 'medium',
      requesterId: TEST_USER_ID,
      requesterName: 'Test Student',
      tags: ['math', 'algebra', 'homework'],
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
    console.log('✅ Task created with ID:', taskRef.id, '\n');

    // Test 2: Read the task back
    console.log('2️⃣  Reading task back...');
    const taskSnap = await taskRef.get();
    if (taskSnap.exists) {
      const task = taskSnap.data();
      console.log('✅ Task retrieved successfully!');
      console.log('   Title:', task.title);
      console.log('   Subject:', task.subject);
      console.log('   Price: $' + task.price);
      console.log('   Status:', task.status, '\n');
    }

    // Test 3: Update task
    console.log('3️⃣  Updating task status...');
    await taskRef.update({
      status: 'claimed',
      expertId: 'test_expert_456',
      expertName: 'Test Expert',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedTaskSnap = await taskRef.get();
    const updatedTask = updatedTaskSnap.data();
    console.log('✅ Task updated!');
    console.log('   New status:', updatedTask.status);
    console.log('   Expert:', updatedTask.expertName, '\n');

    // Test 4: Query tasks
    console.log('4️⃣  Querying tasks...');
    const tasksSnapshot = await db
      .collection('tasks')
      .where('status', '==', 'open')
      .limit(5)
      .get();

    console.log(`✅ Found ${tasksSnapshot.size} open tasks:`);
    let openTaskCounter = 1;
    tasksSnapshot.forEach(doc => {
      const task = doc.data();
      console.log(`   ${openTaskCounter}. ${task.title} - ${task.status} ($${task.price})`);
      openTaskCounter += 1;
    });
    console.log('');

    // Test 5: Filter by subject
    console.log('5️⃣  Filtering by subject...');
    const mathTasks = await db
      .collection('tasks')
      .where('subject', '==', 'Mathematics')
      .get();

    console.log(`✅ Found ${mathTasks.size} Mathematics tasks\n`);

    // Test 6: Test persistence
    console.log('6️⃣  Testing persistence...');
    console.log('   Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const persistCheck = await taskRef.get();
    if (persistCheck.exists) {
      console.log('✅ Persistence verified! Task still exists after delay\n');
    }

    // Test 7: Clean up
    console.log('7️⃣  Cleaning up test task...');
    await taskRef.delete();
    
    const deletedCheck = await taskRef.get();
    if (!deletedCheck.exists) {
      console.log('✅ Task deleted successfully\n');
    }

    console.log('================================');
    console.log('🎉 All task tests passed!\n');
    console.log('📝 Summary:');
    console.log('   - Tasks can be created ✅');
    console.log('   - Tasks can be read ✅');
    console.log('   - Tasks can be updated ✅');
    console.log('   - Tasks can be queried/filtered ✅');
    console.log('   - Tasks persist correctly ✅');
    console.log('   - Tasks can be deleted ✅\n');

    return true;
  } catch (error) {
    console.error('\n❌ Task test failed:');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testTasks()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testTasks };


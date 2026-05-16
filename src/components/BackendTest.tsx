import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { db } from '../lib/firebase';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp?: Date;
}

export const BackendTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const addResult = (name: string, status: 'success' | 'error', message: string) => {
    setResults(prev => [...prev, { name, status, message, timestamp: new Date() }]);
  };

  const runTests = async () => {
    setRunning(true);
    setResults([]);

    try {
      // Test 1: Firestore Connection
      addResult('Firestore Connection', 'pending', 'Testing...');
      const firestore = db();
      addResult('Firestore Connection', 'success', 'Firestore instance created');

      // Test 2: Read from tasks collection
      addResult('Read Tasks', 'pending', 'Reading tasks...');
      const tasksSnapshot = await firestore.collection('tasks').limit(1).get();
      const taskCount = tasksSnapshot.size;
      addResult('Read Tasks', 'success', `Successfully read ${taskCount} task(s)`);

      // Test 3: Read from users collection
      addResult('Read Users', 'pending', 'Reading users...');
      const usersSnapshot = await firestore.collection('users').limit(1).get();
      const userCount = usersSnapshot.size;
      addResult('Read Users', 'success', `Successfully read ${userCount} user(s)`);

      // Test 4: Write test document
      addResult('Write Test', 'pending', 'Writing test document...');
      const testRef = firestore.collection('_test').doc('app_connection_test');
      await testRef.set({
        timestamp: firestore.FieldValue.serverTimestamp(),
        testType: 'app_connectivity',
        status: 'connected',
        device: 'ios_simulator'
      });
      addResult('Write Test', 'success', 'Successfully wrote test document');

      // Test 5: Read back test document
      addResult('Read Test', 'pending', 'Reading test document back...');
      const testDoc = await testRef.get();
      if (testDoc.exists) {
        const data = testDoc.data();
        addResult('Read Test', 'success', `Test document exists: ${data?.status || 'unknown'}`);
      } else {
        addResult('Read Test', 'error', 'Test document not found');
      }

      // Test 6: Real-time listener
      addResult('Real-time Listener', 'pending', 'Setting up real-time listener...');
      let listenerTriggered = false;
      const unsubscribe = testRef.onSnapshot(
        (snapshot) => {
          if (snapshot.exists && !listenerTriggered) {
            listenerTriggered = true;
            addResult('Real-time Listener', 'success', 'Real-time updates working!');
          }
        },
        (error) => {
          addResult('Real-time Listener', 'error', `Error: ${error.message}`);
        }
      );
      
      // Clean up listener after 3 seconds
      setTimeout(() => {
        unsubscribe();
      }, 3000);

      // Clean up test document after 4 seconds
      setTimeout(async () => {
        try {
          await testRef.delete();
          addResult('Cleanup', 'success', 'Test document cleaned up');
        } catch (error: any) {
          addResult('Cleanup', 'error', `Cleanup failed: ${error.message}`);
        }
      }, 4000);

    } catch (error: any) {
      addResult('Test Suite', 'error', `Test failed: ${error.message}`);
      console.error('Backend test error:', error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔌 Backend Connection Test</Text>
      <TouchableOpacity 
        style={[styles.button, running && styles.buttonDisabled]} 
        onPress={runTests}
        disabled={running}
      >
        {running ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Run Tests</Text>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.results}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={styles.resultName}>
              {result.status === 'pending' && '⏳ '}
              {result.status === 'success' && '✅ '}
              {result.status === 'error' && '❌ '}
              {result.name}
            </Text>
            <Text style={[
              styles.resultMessage,
              result.status === 'error' && styles.errorText
            ]}>
              {result.message}
            </Text>
            {result.timestamp && (
              <Text style={styles.timestamp}>
                {result.timestamp.toLocaleTimeString()}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    maxHeight: 400,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});


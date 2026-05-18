// src/services/taskService.ts - Task management with React Native Firebase
import { getFirebaseDb } from '../lib/firebase';
import firestore from '@react-native-firebase/firestore';
import { Task } from '../types';

export interface CreateTaskData {
  title: string;
  subject: string;
  description?: string;
  budget: number;
  deadline: string;
  deadlineTime?: string;
  urgency: 'low' | 'medium' | 'high';
  matchingPreference: 'auto' | 'manual';
  autoMatch?: boolean;
  matchingType?: 'manual' | 'auto';
  isForStudent?: boolean;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  aiLevel?: number;
  aiTaskExplainer?: boolean;
  summaryOnDelivery?: boolean;
  uploadedFiles?: string[];
  selectedTemplate?: string;
}

export interface CreateTaskResult {
  success: boolean;
  taskId?: string;
  message: string;
}

class TaskService {
  async createTask(taskData: CreateTaskData): Promise<CreateTaskResult> {
    try {
      console.log('🔥 Creating task:', taskData);

      let deadlineISO = taskData.deadline;
      if (taskData.deadlineTime) {
        deadlineISO = new Date(`${taskData.deadline} ${taskData.deadlineTime}`).toISOString();
      } else {
        deadlineISO = new Date(taskData.deadline).toISOString();
      }

      const ref = getFirebaseDb().collection('tasks').doc();

      await ref.set({
        taskId: ref.id,
        title: taskData.title,
        subject: taskData.subject,
        description: taskData.description || '',
        price: taskData.budget,
        deadlineISO,
        urgency: taskData.urgency,
        status: 'open',
        ownerId: taskData.ownerId,
        ownerName: taskData.ownerName,
        ownerEmail: taskData.ownerEmail,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),

        matchingPreference: taskData.matchingPreference,
        matchingType: taskData.matchingType || taskData.matchingPreference,
        autoMatch: taskData.autoMatch || (taskData.matchingPreference === 'auto'),
        reservedBy: null,
        reservedUntil: null,
        matching: {
          invitedCount: 0,
          acceptedCount: 0,
          declinedCount: 0,
          currentWave: 0,
          lastInviteAt: null,
          nextWaveAt: null,
          invitedNow: 0,
        },

        aiLevel: taskData.aiLevel || 50,
        aiTaskExplainer: taskData.aiTaskExplainer || false,
        summaryOnDelivery: taskData.summaryOnDelivery || false,
        uploadedFiles: taskData.uploadedFiles || [],
        selectedTemplate: taskData.selectedTemplate || '',

        isActive: true,
        isForStudent: taskData.isForStudent || false,
        tags: this.generateTags(taskData.title, taskData.description || '', taskData.subject),
      });

      console.log('✅ Task created with ID:', ref.id);

      return {
        success: true,
        taskId: ref.id,
        message: taskData.matchingPreference === 'manual'
          ? 'Task posted to expert marketplace!'
          : 'Task created and queued for auto-assignment!',
      };
    } catch (error) {
      console.error('❌ Error creating task:', error);
      return {
        success: false,
        message: `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const doc = await getFirebaseDb().collection('tasks').doc(taskId).get();
      if (!doc.exists) return null;

      const data = doc.data() as any;
      return {
        taskId: doc.id,
        ...data,
        createdAt: data.createdAt instanceof firestore.Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof firestore.Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      } as Task;
    } catch (error) {
      console.error('❌ Error getting task:', error);
      return null;
    }
  }

  getOpenTasks(callback: (tasks: Task[]) => void): () => void {
    return getFirebaseDb()
      .collection('tasks')
      .where('status', '==', 'open')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(
        (snapshot: any) => {
          const tasks: Task[] = (snapshot?.docs ?? []).map((doc: any) => {
            const data = doc.data();
            return {
              taskId: doc.id,
              ...data,
              createdAt: data.createdAt instanceof firestore.Timestamp ? data.createdAt.toDate() : data.createdAt,
              updatedAt: data.updatedAt instanceof firestore.Timestamp ? data.updatedAt.toDate() : data.updatedAt,
            } as Task;
          });
          console.log(`📡 Real-time feed update: ${tasks.length} open tasks`);
          callback(tasks);
        },
        (error: any) => {
          console.error('❌ Error listening to tasks:', error);
          callback([]);
        }
      );
  }

  getUserTasks(ownerId: string, callback: (tasks: Task[]) => void): () => void {
    return getFirebaseDb()
      .collection('tasks')
      .where('ownerId', '==', ownerId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        (snapshot: any) => {
          const tasks: Task[] = (snapshot?.docs ?? []).map((doc: any) => {
            const data = doc.data();
            return {
              taskId: doc.id,
              ...data,
              createdAt: data.createdAt instanceof firestore.Timestamp ? data.createdAt.toDate() : data.createdAt,
              updatedAt: data.updatedAt instanceof firestore.Timestamp ? data.updatedAt.toDate() : data.updatedAt,
            } as Task;
          });
          console.log(`📡 Real-time user tasks update: ${tasks.length} tasks for ${ownerId}`);
          callback(tasks);
        },
        (error: any) => {
          console.error('❌ Error listening to user tasks:', error);
          callback([]);
        }
      );
  }

  private generateTags(title: string, description: string, subject: string): string[] {
    const text = `${title} ${description} ${subject}`.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    const tags = [...new Set(words.filter(word => !commonWords.includes(word)))];
    tags.push(subject.toLowerCase());
    return tags.slice(0, 10);
  }
}

export const taskService = new TaskService();

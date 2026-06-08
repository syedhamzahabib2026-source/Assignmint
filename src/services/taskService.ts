// src/services/taskService.ts
import { getFirebaseDb } from '../lib/firebase';
import firestore from '@react-native-firebase/firestore';
import { Task } from '../types';

export interface CreateTaskData {
  title: string;
  subject: string;
  description?: string;
  price: number;
  deadline: string;        // date string "YYYY-MM-DD"
  deadlineTime?: string;   // optional time "HH:MM"
  urgency: 'low' | 'medium' | 'high';
  matchingType: 'manual' | 'auto';
  autoMatch?: boolean;
  createdBy: string;
  createdByName: string;
  aiLevel?: number;
  fileUrls?: string[];
  tags?: string[];
  specialInstructions?: string;
  estimatedHours?: number;
}

export interface CreateTaskResult {
  success: boolean;
  taskId?: string;
  message: string;
}

class TaskService {
  async createTask(data: CreateTaskData): Promise<CreateTaskResult> {
    try {
      console.log('🔥 Creating task:', data.title);

      const deadlineDate = data.deadlineTime
        ? new Date(`${data.deadline} ${data.deadlineTime}`)
        : new Date(data.deadline);

      const ref = getFirebaseDb().collection('tasks').doc();

      await ref.set({
        id: ref.id,
        title: data.title,
        subject: data.subject,
        description: data.description || '',
        price: data.price,
        deadline: firestore.Timestamp.fromDate(deadlineDate),
        urgency: data.urgency,
        status: 'open',
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        matchingType: data.matchingType,
        autoMatch: data.autoMatch ?? (data.matchingType === 'auto'),
        aiLevel: data.aiLevel ?? 50,
        fileUrls: data.fileUrls || [],
        tags: data.tags || this.generateTags(data.title, data.description || '', data.subject),
        specialInstructions: data.specialInstructions || '',
        estimatedHours: data.estimatedHours ?? null,
        applicants: [],
        assignedExpert: null,
        assignedExpertName: null,
        reservedBy: null,
        reservedUntil: null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Task created:', ref.id);

      return {
        success: true,
        taskId: ref.id,
        message: data.matchingType === 'auto'
          ? 'Task created and queued for auto-assignment!'
          : 'Task posted to expert marketplace!',
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
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof firestore.Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof firestore.Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        deadline: data.deadline instanceof firestore.Timestamp ? data.deadline.toDate() : new Date(data.deadline),
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
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(
        (snapshot: any) => {
          const tasks: Task[] = (snapshot?.docs ?? []).map((doc: any) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt instanceof firestore.Timestamp ? data.createdAt.toDate() : data.createdAt,
              updatedAt: data.updatedAt instanceof firestore.Timestamp ? data.updatedAt.toDate() : data.updatedAt,
              deadline: data.deadline instanceof firestore.Timestamp ? data.deadline.toDate() : new Date(data.deadline),
            } as Task;
          });
          console.log(`📡 Open tasks update: ${tasks.length}`);
          callback(tasks);
        },
        (error: any) => {
          console.error('❌ Error listening to tasks:', error);
          callback([]);
        }
      );
  }

  getUserTasks(createdBy: string, callback: (tasks: Task[]) => void): () => void {
    return getFirebaseDb()
      .collection('tasks')
      .where('createdBy', '==', createdBy)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        (snapshot: any) => {
          const tasks: Task[] = (snapshot?.docs ?? []).map((doc: any) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt instanceof firestore.Timestamp ? data.createdAt.toDate() : data.createdAt,
              updatedAt: data.updatedAt instanceof firestore.Timestamp ? data.updatedAt.toDate() : data.updatedAt,
              deadline: data.deadline instanceof firestore.Timestamp ? data.deadline.toDate() : new Date(data.deadline),
            } as Task;
          });
          console.log(`📡 User tasks update: ${tasks.length} for ${createdBy}`);
          callback(tasks);
        },
        (error: any) => {
          console.error('❌ Error listening to user tasks:', error);
          callback([]);
        }
      );
  }

  private generateTags(title: string, description: string, subject: string): string[] {
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
    const words = `${title} ${description} ${subject}`
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    return [...new Set([...words, subject.toLowerCase()])].slice(0, 10);
  }
}

export const taskService = new TaskService();

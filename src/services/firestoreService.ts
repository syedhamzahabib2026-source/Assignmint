// src/services/firestoreService.ts
import { getFirebaseDb } from '../lib/firebase';
import firestore from '@react-native-firebase/firestore';
import {
  User,
  Task,
  Chat,
  Message,
  Notification,
  Wallet,
  Transaction,
  AIChatSession,
  COLLECTIONS,
  TaskQuery,
  ChatQuery,
  NotificationQuery,
} from '../types/firestore';

class FirestoreService {
  private convertTimestamps(data: any): any {
    if (!data) return data;

    const converted = { ...data };
    Object.keys(converted).forEach(key => {
      if (converted[key] && converted[key].toDate && typeof converted[key].toDate === 'function') {
        converted[key] = converted[key].toDate();
      } else if (typeof converted[key] === 'object' && converted[key] !== null) {
        converted[key] = this.convertTimestamps(converted[key]);
      }
    });
    return converted;
  }

  // User Management
  async createUser(userData: Omit<User, 'uid' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = getFirebaseDb().collection(COLLECTIONS.USERS).doc();
    await ref.set({
      uid: ref.id,
      ...userData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async getUser(userId: string): Promise<User | null> {
    const doc = await getFirebaseDb().collection(COLLECTIONS.USERS).doc(userId).get();
    if (!doc.exists) return null;
    return this.convertTimestamps({ uid: doc.id, ...doc.data() }) as User;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await getFirebaseDb().collection(COLLECTIONS.USERS).doc(userId).update({
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  // Task Management
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = getFirebaseDb().collection(COLLECTIONS.TASKS).doc();
    await ref.set({
      id: ref.id,
      ...taskData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      deadline: taskData.deadline ? firestore.Timestamp.fromDate(taskData.deadline) : null,
    });
    return ref.id;
  }

  async getTask(taskId: string): Promise<Task | null> {
    const doc = await getFirebaseDb().collection(COLLECTIONS.TASKS).doc(taskId).get();
    if (!doc.exists) return null;
    return this.convertTimestamps({ id: doc.id, ...doc.data() }) as Task;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };
    if (updates.deadline) {
      updateData.deadline = firestore.Timestamp.fromDate(updates.deadline);
    }
    await getFirebaseDb().collection(COLLECTIONS.TASKS).doc(taskId).update(updateData);
  }

  async getTasks(queryParams: TaskQuery = {}): Promise<Task[]> {
    let ref: any = getFirebaseDb().collection(COLLECTIONS.TASKS);
    if (queryParams.status) ref = ref.where('status', '==', queryParams.status);
    if (queryParams.createdBy) ref = ref.where('createdBy', '==', queryParams.createdBy);
    if (queryParams.completedBy) ref = ref.where('completedBy', '==', queryParams.completedBy);
    if (queryParams.subject) ref = ref.where('subject', '==', queryParams.subject);
    if (queryParams.minPrice !== undefined) ref = ref.where('price', '>=', queryParams.minPrice);
    if (queryParams.maxPrice !== undefined) ref = ref.where('price', '<=', queryParams.maxPrice);
    if (queryParams.urgency) ref = ref.where('urgency', '==', queryParams.urgency);
    ref = ref.orderBy(queryParams.orderBy || 'createdAt', queryParams.orderDirection || 'desc');
    if (queryParams.limit) ref = ref.limit(queryParams.limit);
    const snapshot = await ref.get();
    if (!snapshot?.docs) return [];
    return snapshot.docs.map((doc: any) =>
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Task
    );
  }

  // Real-time task updates
  subscribeToTasks(
    queryParams: TaskQuery = {},
    callback: (tasks: Task[]) => void
  ): () => void {
    let ref: any = getFirebaseDb().collection(COLLECTIONS.TASKS);
    if (queryParams.status) ref = ref.where('status', '==', queryParams.status);
    if (queryParams.createdBy) ref = ref.where('createdBy', '==', queryParams.createdBy);
    if (queryParams.completedBy) ref = ref.where('completedBy', '==', queryParams.completedBy);
    if (queryParams.subject) ref = ref.where('subject', '==', queryParams.subject);
    if (queryParams.minPrice !== undefined) ref = ref.where('price', '>=', queryParams.minPrice);
    if (queryParams.maxPrice !== undefined) ref = ref.where('price', '<=', queryParams.maxPrice);
    if (queryParams.urgency) ref = ref.where('urgency', '==', queryParams.urgency);
    ref = ref.orderBy(queryParams.orderBy || 'createdAt', queryParams.orderDirection || 'desc');
    if (queryParams.limit) ref = ref.limit(queryParams.limit);
    return ref.onSnapshot(
      (snapshot: any) => {
        const tasks = snapshot?.docs?.map((doc: any) =>
          this.convertTimestamps({ id: doc.id, ...doc.data() }) as Task
        ) ?? [];
        callback(tasks);
      },
      (error: any) => {
        console.error('subscribeToTasks error:', error);
        callback([]);
      }
    );
  }

  // Chat Management
  async createChat(chatData: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = getFirebaseDb().collection(COLLECTIONS.CHATS).doc();
    await ref.set({
      id: ref.id,
      ...chatData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async getChat(chatId: string): Promise<Chat | null> {
    const doc = await getFirebaseDb().collection(COLLECTIONS.CHATS).doc(chatId).get();
    if (!doc.exists) return null;
    return this.convertTimestamps({ id: doc.id, ...doc.data() }) as Chat;
  }

  async getChats(queryParams: ChatQuery = {}): Promise<Chat[]> {
    let ref: any = getFirebaseDb().collection(COLLECTIONS.CHATS);
    if (queryParams.participants) {
      ref = ref.where('participants', 'array-contains-any', queryParams.participants);
    }
    if (queryParams.taskId) ref = ref.where('taskId', '==', queryParams.taskId);
    if (queryParams.isActive !== undefined) ref = ref.where('isActive', '==', queryParams.isActive);
    ref = ref.orderBy(queryParams.orderBy || 'updatedAt', queryParams.orderDirection || 'desc');
    if (queryParams.limit) ref = ref.limit(queryParams.limit);
    const snapshot = await ref.get();
    if (!snapshot?.docs) return [];
    return snapshot.docs.map((doc: any) =>
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Chat
    );
  }

  // Real-time chat updates
  subscribeToChats(
    queryParams: ChatQuery = {},
    callback: (chats: Chat[]) => void
  ): () => void {
    let ref: any = getFirebaseDb().collection(COLLECTIONS.CHATS);
    if (queryParams.participants) {
      ref = ref.where('participants', 'array-contains-any', queryParams.participants);
    }
    if (queryParams.taskId) ref = ref.where('taskId', '==', queryParams.taskId);
    if (queryParams.isActive !== undefined) ref = ref.where('isActive', '==', queryParams.isActive);
    ref = ref.orderBy(queryParams.orderBy || 'updatedAt', queryParams.orderDirection || 'desc');
    if (queryParams.limit) ref = ref.limit(queryParams.limit);
    return ref.onSnapshot(
      (snapshot: any) => {
        const chats = snapshot?.docs?.map((doc: any) =>
          this.convertTimestamps({ id: doc.id, ...doc.data() }) as Chat
        ) ?? [];
        callback(chats);
      },
      (error: any) => {
        console.error('subscribeToChats error:', error);
        callback([]);
      }
    );
  }

  // Message Management
  async sendMessage(messageData: Omit<Message, 'id' | 'timestamp'>): Promise<string> {
    const msgRef = getFirebaseDb()
      .collection(COLLECTIONS.CHATS)
      .doc(messageData.chatId)
      .collection(COLLECTIONS.MESSAGES)
      .doc();
    await msgRef.set({
      id: msgRef.id,
      ...messageData,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });
    await getFirebaseDb()
      .collection(COLLECTIONS.CHATS)
      .doc(messageData.chatId)
      .update({
        lastMessage: {
          text: messageData.text,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          timestamp: firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    return msgRef.id;
  }

  // Real-time message updates
  subscribeToMessages(
    chatId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    return getFirebaseDb()
      .collection(COLLECTIONS.CHATS)
      .doc(chatId)
      .collection(COLLECTIONS.MESSAGES)
      .orderBy('timestamp', 'asc')
      .onSnapshot(
        (snapshot: any) => {
          const messages = snapshot?.docs?.map((doc: any) =>
            this.convertTimestamps({ id: doc.id, ...doc.data() }) as Message
          ) ?? [];
          callback(messages);
        },
        (error: any) => {
          console.error('subscribeToMessages error:', error);
          callback([]);
        }
      );
  }

  // Notification Management
  async createNotification(notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    const ref = getFirebaseDb().collection(COLLECTIONS.NOTIFICATIONS).doc();
    await ref.set({
      id: ref.id,
      ...notificationData,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async getNotifications(queryParams: NotificationQuery): Promise<Notification[]> {
    let ref: any = getFirebaseDb()
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('userId', '==', queryParams.userId);
    if (queryParams.isRead !== undefined) ref = ref.where('isRead', '==', queryParams.isRead);
    if (queryParams.type) ref = ref.where('type', '==', queryParams.type);
    ref = ref.orderBy(queryParams.orderBy || 'createdAt', queryParams.orderDirection || 'desc');
    if (queryParams.limit) ref = ref.limit(queryParams.limit);
    const snapshot = await ref.get();
    if (!snapshot?.docs) return [];
    return snapshot.docs.map((doc: any) =>
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Notification
    );
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await getFirebaseDb()
      .collection(COLLECTIONS.NOTIFICATIONS)
      .doc(notificationId)
      .update({ isRead: true });
  }

  // Real-time notification updates
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    return getFirebaseDb()
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        (snapshot: any) => {
          const notifications = snapshot?.docs?.map((doc: any) =>
            this.convertTimestamps({ id: doc.id, ...doc.data() }) as Notification
          ) ?? [];
          callback(notifications);
        },
        (error: any) => {
          console.error('subscribeToNotifications error:', error);
          callback([]);
        }
      );
  }

  // Wallet Management
  async getWallet(userId: string): Promise<Wallet | null> {
    const doc = await getFirebaseDb().collection(COLLECTIONS.WALLETS).doc(userId).get();
    if (!doc.exists) return null;
    return this.convertTimestamps({ userId, ...doc.data() }) as Wallet;
  }

  async updateWallet(userId: string, updates: Partial<Wallet>): Promise<void> {
    await getFirebaseDb().collection(COLLECTIONS.WALLETS).doc(userId).update({
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
    const ref = getFirebaseDb().collection(COLLECTIONS.TRANSACTIONS).doc();
    await ref.set({
      id: ref.id,
      ...transactionData,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async getTransactions(userId: string, limitCount: number = 50): Promise<Transaction[]> {
    const snapshot = await getFirebaseDb()
      .collection(COLLECTIONS.TRANSACTIONS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();
    if (!snapshot?.docs) return [];
    return snapshot.docs.map((doc: any) =>
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Transaction
    );
  }

  // AI Chat Session Management
  async createAISession(sessionData: Omit<AIChatSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = getFirebaseDb().collection(COLLECTIONS.AI_SESSIONS).doc();
    await ref.set({
      id: ref.id,
      ...sessionData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async getAISession(sessionId: string): Promise<AIChatSession | null> {
    const doc = await getFirebaseDb().collection(COLLECTIONS.AI_SESSIONS).doc(sessionId).get();
    if (!doc.exists) return null;
    return this.convertTimestamps({ id: doc.id, ...doc.data() }) as AIChatSession;
  }

  async updateAISession(sessionId: string, updates: Partial<AIChatSession>): Promise<void> {
    await getFirebaseDb().collection(COLLECTIONS.AI_SESSIONS).doc(sessionId).update({
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  async getAISessions(userId: string, limitCount: number = 20): Promise<AIChatSession[]> {
    const snapshot = await getFirebaseDb()
      .collection(COLLECTIONS.AI_SESSIONS)
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limitCount)
      .get();
    if (!snapshot?.docs) return [];
    return snapshot.docs.map((doc: any) =>
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as AIChatSession
    );
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService;

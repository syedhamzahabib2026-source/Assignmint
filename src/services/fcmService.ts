import { Platform, Alert, PermissionsAndroid } from 'react-native';
import { firestoreService } from './firestoreService';
import { auth, messaging } from '../lib/firebase';

class FCMService {
  private fcmToken: string | null = null;

  async initialize(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('FCM permission not granted');
          return;
        }
      }

      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('FCM Token:', token);

      const currentUser = auth().currentUser;
      if (currentUser) {
        await this.saveTokenToUser(currentUser.uid, token);
      }

      this.setupMessageHandlers();
    } catch (error) {
      console.error('FCM initialization failed:', error);
    }
  }

  async saveTokenToUser(userId: string, token: string): Promise<void> {
    try {
      await firestoreService.updateUser(userId, { fcmToken: token } as any);
    } catch (error) {
      console.error('Failed to save FCM token:', error);
    }
  }

  async getToken(): Promise<string | null> {
    if (this.fcmToken) return this.fcmToken;
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  private setupMessageHandlers(): void {
    messaging().onMessage(async (remoteMessage: any) => {
      console.log('Foreground message received:', remoteMessage);
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'New Notification',
          remoteMessage.notification.body || '',
          [{ text: 'OK' }]
        );
      }
    });
  }

  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: { [key: string]: string }
  ): Promise<void> {
    try {
      await firestoreService.createNotification({
        userId,
        type: 'system',
        title,
        body,
        ...(data !== undefined && { data }),
        isRead: false,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async sendTaskNotification(
    userId: string,
    taskId: string,
    type: 'newTask' | 'taskAccepted' | 'taskSubmitted' | 'taskCompleted' | 'taskRevision',
    title: string,
    body: string
  ): Promise<void> {
    if (!userId || !taskId) {
      console.warn('sendTaskNotification skipped: userId or taskId is missing', { userId, taskId });
      return;
    }
    try {
      await firestoreService.createNotification({
        userId,
        type,
        title,
        body,
        taskId,
        isRead: false,
      });
    } catch (error) {
      console.error('Failed to send task notification:', error);
    }
  }

  async sendMessageNotification(
    userId: string,
    chatId: string,
    senderName: string,
    messageText: string
  ): Promise<void> {
    try {
      await firestoreService.createNotification({
        userId,
        type: 'messageReceived',
        title: `New message from ${senderName}`,
        body: messageText,
        chatId,
        isRead: false,
      });
    } catch (error) {
      console.error('Failed to send message notification:', error);
    }
  }
}

export const fcmService = new FCMService();
export default fcmService;

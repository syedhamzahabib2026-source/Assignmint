// types/index.ts
// Task is defined in firestore.ts — import it from there to avoid duplication.
export type { Task } from './firestore';

// ─── Matching-system types (not in firestore.ts) ────────────────────────────

export interface ExpertUser {
  uid: string;
  displayName: string;
  subjects: string[];
  minPrice?: number;
  maxPrice?: number;
  level: 'HS' | 'UG' | 'Grad';
  ratingAvg: number;
  ratingCount: number;
  acceptRate: number;
  medianResponseMins: number;
  completedBySubject: Record<string, number>;
}

export interface Invite {
  inviteId: string;
  taskId: string;
  expertId: string;
  sentAt: Date;
  respondedAt?: Date | null;
  status: 'sent' | 'accepted' | 'declined';
  lastScore: number;
}

// ─── App-level types ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isExpert: boolean;
  rating?: number;
  completedTasks?: number;
  totalEarnings?: number;
  subjects?: string[];
  bio?: string;
  joinDate: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task' | 'payment' | 'system' | 'message';
  isRead: boolean;
  createdAt: Date;
  data?: any;
}

export interface Wallet {
  balance: number;
  currency: string;
  transactions: Transaction[];
  pendingAmount: number;
  totalEarned: number;
  totalSpent: number;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  taskId?: string;
  reference?: string;
}

export interface TaskFilter {
  subject?: string;
  urgency?: string;
  minBudget?: number;
  maxBudget?: number;
  status?: string;
  dateRange?: { start: Date; end: Date };
}

export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface FileUpload {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  taskId: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  attachments?: string[];
}

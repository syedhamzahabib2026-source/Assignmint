import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../constants';
import Icon, { Icons } from '../components/common/Icon';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { Notification } from '../types/firestore';

type FilterKey = 'all' | 'today' | 'week' | 'earlier';

function getCategory(date: Date): 'today' | 'week' | 'earlier' {
  const diffHours = (Date.now() - date.getTime()) / 3600000;
  if (diffHours < 24) return 'today';
  if (diffHours < 168) return 'week';
  return 'earlier';
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'taskAccepted': return Icons.check;
    case 'newTask': return Icons.task;
    case 'messageReceived': return Icons.messages;
    case 'taskCompleted': return Icons.success;
    case 'paymentReceived': return Icons.payment;
    case 'system': return Icons.settings;
    default: return Icons.notifications;
  }
}

function getNotificationColor(type: Notification['type']): string {
  switch (type) {
    case 'taskAccepted': return '#34C759';
    case 'newTask': return '#007AFF';
    case 'messageReceived': return '#007AFF';
    case 'taskCompleted': return '#34C759';
    case 'paymentReceived': return '#34C759';
    case 'system': return '#8E8E93';
    default: return '#007AFF';
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  today: 'Today',
  week: 'This Week',
  earlier: 'Earlier',
};

const CATEGORY_ORDER = ['today', 'week', 'earlier'];

const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (!user) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    try {
      const data = await firestoreService.getNotifications({ userId: user.uid, limit: 50 });
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (!unread.length || markingRead) return;
    setMarkingRead(true);
    try {
      await Promise.all(unread.map(n => firestoreService.markNotificationAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.isRead) {
      firestoreService.markNotificationAsRead(notification.id).catch(() => {});
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
    }
    if (notification.taskId) {
      navigation.navigate('TaskDetails', { taskId: notification.taskId });
    }
  };

  const visible = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    return getCategory(n.createdAt) === activeFilter;
  });

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = visible.filter(n => getCategory(n.createdAt) === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, Notification[]>);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotificationItem = (notification: Notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[styles.notificationItem, !notification.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={styles.notificationAvatar}>
        <Icon name={Icons.user} size={24} color={COLORS.textSecondary} />
        {!notification.isRead && (
          <View style={[styles.unreadDot, { backgroundColor: getNotificationColor(notification.type) }]} />
        )}
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationTime}>{formatRelativeTime(notification.createdAt)}</Text>
        </View>
        <Text style={styles.notificationMessage}>{notification.body}</Text>
      </View>

      <View style={styles.notificationIcon}>
        <Icon
          name={getNotificationIcon(notification.type)}
          size={20}
          color={getNotificationColor(notification.type)}
        />
      </View>
    </TouchableOpacity>
  );

  const renderGroup = (category: string, items: Notification[]) => (
    <View key={category} style={styles.notificationGroup}>
      <Text style={styles.groupTitle}>{CATEGORY_LABELS[category]}</Text>
      {items.map(renderNotificationItem)}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.markAllReadButton}
          onPress={handleMarkAllRead}
          disabled={markingRead || unreadCount === 0}
        >
          {markingRead
            ? <ActivityIndicator size="small" color="#007AFF" />
            : <Text style={[styles.markAllReadText, unreadCount === 0 && styles.markAllReadDisabled]}>
                Mark all read
              </Text>
          }
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {([
            { key: 'all', label: 'All' },
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'earlier', label: 'Earlier' },
          ] as { key: FilterKey; label: string }[]).map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterTab, activeFilter === filter.key && styles.activeFilterTab]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[styles.filterTabText, activeFilter === filter.key && styles.activeFilterTabText]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notifications List */}
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
      ) : (
        <ScrollView
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} tintColor={COLORS.primary} />
          }
        >
          {Object.keys(grouped).length > 0 ? (
            Object.entries(grouped).map(([cat, items]) => renderGroup(cat, items))
          ) : (
            <View style={styles.emptyState}>
              <Icon name={Icons.notifications} size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateTitle}>No notifications</Text>
              <Text style={styles.emptyStateText}>
                You're all caught up! New notifications will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  markAllReadButton: {
    padding: 8,
  },
  markAllReadText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  markAllReadDisabled: {
    color: '#C7C7CC',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  loader: {
    flex: 1,
    marginTop: 60,
  },
  notificationsList: {
    flex: 1,
  },
  notificationGroup: {
    marginTop: 16,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  unreadNotification: {
    backgroundColor: '#F8F9FF',
  },
  notificationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  notificationIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default NotificationsScreen;

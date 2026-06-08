import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants';
import Icon, { Icons } from '../components/common/Icon';
import { useAuth } from '../state/AuthProvider';
import { firestoreService } from '../services/firestoreService';
import { Task } from '../types/firestore';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatPrice = (price: number) => `$${price.toFixed(0)}`;

const formatDeadline = (deadline: Date | any): string => {
  if (!deadline) return 'No deadline';
  const d = deadline instanceof Date ? deadline : (deadline.toDate?.() ?? new Date(deadline));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getUrgencyColor = (urgency: string) => {
  if (urgency === 'high') return COLORS.error;
  if (urgency === 'medium') return COLORS.warning;
  return COLORS.success;
};

const getAILevelLabel = (level: number): { text: string; color: string } => {
  if (level >= 67) return { text: 'High AI', color: COLORS.warning };
  if (level >= 34) return { text: 'Medium AI', color: COLORS.primary };
  return { text: 'Low AI', color: COLORS.success };
};

const getStatusConfig = (status: string): { label: string; color: string; bg: string } => {
  switch (status) {
    case 'open':        return { label: 'Open', color: COLORS.success, bg: '#34C75920' };
    case 'in_progress': return { label: 'In Progress', color: COLORS.primary, bg: '#007AFF20' };
    case 'completed':   return { label: 'Completed', color: COLORS.textSecondary, bg: COLORS.gray200 };
    case 'cancelled':   return { label: 'Cancelled', color: COLORS.error, bg: '#FF3B3020' };
    default:            return { label: status, color: COLORS.text, bg: COLORS.gray200 };
  }
};

const filenameFromUrl = (url: string): string => {
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split('/');
    const last = parts[parts.length - 1].split('?')[0];
    return last || 'File';
  } catch {
    return 'File';
  }
};

// ─── component ──────────────────────────────────────────────────────────────

const TaskDetailsScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { taskId } = route.params || {};
  const { user, isGuestMode } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [negotiating, setNegotiating] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      return;
    }
    firestoreService.getTask(taskId)
      .then(setTask)
      .catch((err) => console.error('TaskDetailsScreen fetch error:', err))
      .finally(() => setLoading(false));
  }, [taskId]);

  const requireAuth = (action: () => void) => {
    if (isGuestMode || !user) {
      Alert.alert(
        'Sign Up Required',
        'Create a free account to perform this action.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    action();
  };

  const handleAccept = () => {
    requireAuth(() => {
      if (!task) return;
      if (task.status !== 'open') {
        Alert.alert('Not Available', 'This task is no longer open.');
        return;
      }
      if (task.createdBy === user!.uid) {
        Alert.alert('Cannot Accept', 'You cannot accept your own task.');
        return;
      }
      Alert.alert(
        'Accept Task',
        `Accept "${task.title}" for ${formatPrice(task.price)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept',
            onPress: async () => {
              try {
                setAccepting(true);
                await firestoreService.updateTask(task.id, {
                  status: 'in_progress',
                  completedBy: user!.uid,
                  completedByName: user!.displayName || user!.email || 'Unknown',
                });
                Alert.alert('Accepted!', 'You can now start working on this task.', [
                  { text: 'OK', onPress: () => navigation.navigate('Tasks') },
                ]);
              } catch (err) {
                console.error('Accept task error:', err);
                Alert.alert('Error', 'Failed to accept task. Please try again.');
              } finally {
                setAccepting(false);
              }
            },
          },
        ]
      );
    });
  };

  const handleNegotiate = () => {
    requireAuth(async () => {
      if (!task) return;
      if (task.createdBy === user!.uid) {
        Alert.alert('Cannot Negotiate', 'This is your own task.');
        return;
      }
      try {
        setNegotiating(true);
        const allChats = await firestoreService.getChats({ isActive: true });
        const existing = allChats.find(
          c => c.taskId === task.id && c.participants.includes(user!.uid)
        );

        let chatId: string;
        if (existing) {
          chatId = existing.id;
        } else {
          chatId = await firestoreService.createChat({
            taskId: task.id,
            taskTitle: task.title,
            participants: [user!.uid, task.createdBy],
            participantNames: {
              [user!.uid]: user!.displayName || user!.email || 'Unknown',
              [task.createdBy]: task.createdByName,
            },
            isActive: true,
          });
        }

        navigation.navigate('ChatThread', {
          chat: { id: chatId, name: task.createdByName, taskTitle: task.title },
        });
      } catch (err) {
        console.error('Negotiate error:', err);
        Alert.alert('Error', 'Failed to start conversation. Please try again.');
      } finally {
        setNegotiating(false);
      }
    });
  };

  // ─── loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.stateText}>Loading task...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButtonAlone} onPress={() => navigation.goBack()}>
          <Icon name={Icons.arrowBack} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.centeredState}>
          <Icon name={Icons.error} size={56} color={COLORS.error} />
          <Text style={styles.stateTitle}>Task Not Found</Text>
          <Text style={styles.stateText}>This task may have been removed.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(task.status);
  const aiLabel = getAILevelLabel(task.aiLevel);
  const isOwner = user?.uid === task.createdBy;
  const canAct = task.status === 'open' && !isOwner;

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Icon name={Icons.arrowBack} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            Alert.alert('Report Task', 'What issue would you like to report?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Inappropriate Content', onPress: () => Alert.alert('Reported', 'Thank you.') },
              { text: 'Spam', onPress: () => Alert.alert('Reported', 'Thank you.') },
            ])
          }
        >
          <Icon name={Icons.more} size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.badgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#007AFF20' }]}>
            <Text style={[styles.badgeText, { color: COLORS.primary }]}>{task.subject}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{task.title}</Text>

        {/* Posted by */}
        <View style={styles.postedRow}>
          <View style={styles.avatar}>
            <Icon name={Icons.user} size={18} color={COLORS.textSecondary} />
          </View>
          <View>
            <Text style={styles.postedBy}>{task.createdByName}</Text>
            {task.createdAt && (
              <Text style={styles.postedDate}>
                Posted {formatDeadline(task.createdAt)}
              </Text>
            )}
          </View>
        </View>

        {/* Description */}
        {!!task.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name={Icons.money} size={20} color={COLORS.success} />
            <Text style={styles.statLabel}>Budget</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {formatPrice(task.price)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Icon name={Icons.time} size={20} color={COLORS.warning} />
            <Text style={styles.statLabel}>Deadline</Text>
            <Text style={styles.statValue}>{formatDeadline(task.deadline)}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name={Icons.flash} size={20} color={getUrgencyColor(task.urgency)} />
            <Text style={styles.statLabel}>Urgency</Text>
            <Text style={[styles.statValue, { color: getUrgencyColor(task.urgency) }]}>
              {task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}
            </Text>
          </View>
        </View>

        {/* AI Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Assistance</Text>
          <View style={styles.aiRow}>
            <Icon name={Icons.ai} size={20} color={aiLabel.color} />
            <Text style={[styles.aiText, { color: aiLabel.color }]}>{aiLabel.text}</Text>
            <Text style={styles.aiSubtext}>({task.aiLevel}% AI involvement allowed)</Text>
          </View>
        </View>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsWrap}>
              {task.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* File Attachments */}
        {task.fileUrls && task.fileUrls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attachments ({task.fileUrls.length})</Text>
            {task.fileUrls.map((url, i) => (
              <View key={i} style={styles.fileItem}>
                <Icon name={Icons.document} size={20} color={COLORS.primary} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {filenameFromUrl(url)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Matching info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matching</Text>
          <Text style={styles.matchingText}>
            {task.matchingType === 'auto'
              ? 'Auto-assigned — AssignMint will match an expert'
              : 'Manual — open for experts to apply'}
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        {isOwner ? (
          <View style={styles.ownerNote}>
            <Icon name={Icons.info} size={18} color={COLORS.textSecondary} />
            <Text style={styles.ownerNoteText}>This is your task</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.negotiateBtn, !canAct && styles.disabledBtn]}
              onPress={handleNegotiate}
              disabled={negotiating || !canAct}
            >
              {negotiating ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={[styles.actionBtnText, styles.negotiateBtnText]}>
                  Negotiate
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn, !canAct && styles.disabledBtn]}
              onPress={handleAccept}
              disabled={accepting || !canAct}
            >
              {accepting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={[styles.actionBtnText, styles.acceptBtnText]}>
                  {task.status === 'open' ? 'Accept Task' : statusConfig.label}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  stateText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  backButtonAlone: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
    lineHeight: 32,
  },
  postedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postedBy: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  postedDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
  },
  aiText: {
    fontSize: 15,
    fontWeight: '600',
  },
  aiSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  matchingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 20,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  negotiateBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  negotiateBtnText: {
    color: COLORS.primary,
  },
  acceptBtnText: {
    color: COLORS.white,
  },
  ownerNote: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ownerNoteText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});

export default TaskDetailsScreen;

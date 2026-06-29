import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../constants';
import Icon, { Icons } from '../components/common/Icon';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../state/AuthProvider';
import { Task } from '../types/firestore';
import GuestGate from '../components/common/GuestGate';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:        { label: 'Open',        color: COLORS.primary },
  reserved:    { label: 'Reserved',    color: COLORS.secondary },
  claimed:     { label: 'Claimed',     color: COLORS.warning },
  in_progress: { label: 'In Progress', color: COLORS.warning },
  submitted:   { label: 'Submitted',   color: COLORS.teal },
  completed:   { label: 'Completed',   color: COLORS.success },
  cancelled:   { label: 'Cancelled',   color: COLORS.error },
};

const statusConfig = (status: string) =>
  STATUS_CONFIG[status] ?? { label: status, color: COLORS.textSecondary };

const formatDeadline = (deadline: Date | any): string => {
  if (!deadline) return 'No deadline';
  const d = deadline instanceof Date ? deadline : (deadline.toDate?.() ?? new Date(deadline));
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
};

const formatDate = (date: Date | any): string => {
  if (!date) return '';
  const d = date instanceof Date ? date : (date.toDate?.() ?? new Date(date));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── component ──────────────────────────────────────────────────────────────

type FilterId = 'All' | 'Posted' | 'Accepted' | 'Completed';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'All',       label: 'All' },
  { id: 'Posted',    label: 'Posted' },
  { id: 'Accepted',  label: 'Accepted' },
  { id: 'Completed', label: 'Completed' },
];

const MyTasksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterId>('All');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [postedIds, setPostedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMyTasks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);

    let created: Task[] = [];
    let accepted: Task[] = [];

    try {
      created = await firestoreService.getTasks({ createdBy: user.uid, limit: 50 });
    } catch (err) {
      console.warn('⚠️ Failed to load posted tasks:', err);
    }

    try {
      accepted = await firestoreService.getTasks({ completedBy: user.uid, limit: 50 });
    } catch (err) {
      console.warn('⚠️ Failed to load accepted tasks:', err);
    }

    const createdSet = new Set(created.map(t => t.id));
    const acceptedSet = new Set(accepted.map(t => t.id));

    // Merge, deduplicate — prefer the created copy so createdByName etc. are always populated
    const seen = new Set<string>();
    const merged: Task[] = [];
    for (const t of [...created, ...accepted]) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        merged.push(t);
      }
    }

    setPostedIds(createdSet);
    setAcceptedIds(acceptedSet);
    setTasks(merged);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    loadMyTasks();
  }, [loadMyTasks]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMyTasks();
  };

  const filteredTasks = tasks.filter(task => {
    switch (activeFilter) {
      case 'Posted':    return postedIds.has(task.id);
      case 'Accepted':  return acceptedIds.has(task.id) && !postedIds.has(task.id);
      case 'Completed': return task.status === 'completed';
      default:          return true;
    }
  });

  // ─── TaskCard ──────────────────────────────────────────────────────────────

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const cfg = statusConfig(task.status);
    const isPosted   = postedIds.has(task.id);
    const isAccepted = acceptedIds.has(task.id) && !isPosted;
    const deadlineText = formatDeadline(task.deadline);
    const isOverdue = deadlineText === 'Overdue';

    return (
      <TouchableOpacity
        style={styles.taskCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
      >
        {/* Card header row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {/* Role badge */}
            <View style={[
              styles.roleBadge,
              { backgroundColor: isAccepted ? COLORS.success + '20' : COLORS.primary + '15' },
            ]}>
              <Text style={[
                styles.roleBadgeText,
                { color: isAccepted ? COLORS.success : COLORS.primary },
              ]}>
                {isAccepted ? 'Accepted' : 'Posted'}
              </Text>
            </View>

            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <Text style={styles.price}>${task.price}</Text>
        </View>

        {/* Title */}
        <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>

        {/* Subject + description */}
        <Text style={styles.subject}>{task.subject}</Text>
        {!!task.description && (
          <Text style={styles.description} numberOfLines={2}>{task.description}</Text>
        )}

        {/* Assigned expert row (auto-matched tasks) */}
        {task.assignedExpert && task.assignedExpertName && (
          <View style={styles.expertRow}>
            <Icon name={Icons.user} size={14} color={COLORS.success} />
            <Text style={styles.expertText}>{task.assignedExpertName}</Text>
            <View style={styles.assignedBadge}>
              <Text style={styles.assignedBadgeText}>Assigned</Text>
            </View>
          </View>
        )}

        {/* Posted by (for accepted tasks) */}
        {isAccepted && task.createdByName && (
          <View style={styles.expertRow}>
            <Icon name={Icons.user} size={14} color={COLORS.textSecondary} />
            <Text style={styles.postedByText}>Posted by {task.createdByName}</Text>
          </View>
        )}

        {/* Footer row */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.metaItem}>
              <Icon name={Icons.time} size={14} color={isOverdue ? COLORS.error : COLORS.textSecondary} />
              <Text style={[styles.metaText, isOverdue && { color: COLORS.error }]}>
                {deadlineText}
              </Text>
            </View>
            {isPosted && (
              <View style={styles.metaItem}>
                <Icon name={Icons.users} size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>
                  {task.applicants?.length ?? 0} applicant{task.applicants?.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {task.createdAt && (
              <View style={styles.metaItem}>
                <Icon name={Icons.calendar} size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{formatDate(task.createdAt)}</Text>
              </View>
            )}
          </View>

          <View style={styles.footerRight}>
            {isAccepted && task.status === 'in_progress' && (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => navigation.navigate('UploadDelivery', { taskId: task.id })}
              >
                <Text style={styles.submitButtonText}>Submit Work</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
            >
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── render ───────────────────────────────────────────────────────────────

  const postedCount   = tasks.filter(t => postedIds.has(t.id)).length;
  const acceptedCount = tasks.filter(t => acceptedIds.has(t.id) && !postedIds.has(t.id)).length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <GuestGate action="view_my_tasks" navigation={navigation}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Tasks</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{postedCount}</Text>
            <Text style={styles.statLabel}>Posted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{acceptedCount}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterTab, activeFilter === f.id && styles.filterTabActive]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={[styles.filterTabText, activeFilter === f.id && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.stateText}>Loading your tasks...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Icon name={Icons.error} size={48} color={COLORS.error} />
              <Text style={styles.stateTitle}>Failed to load tasks</Text>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadMyTasks}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : filteredTasks.length === 0 ? (
            <View style={styles.centerState}>
              <Icon name={Icons.briefcase} size={48} color={COLORS.textSecondary} />
              <Text style={styles.stateTitle}>
                {activeFilter === 'All' ? 'No tasks yet' : `No ${activeFilter.toLowerCase()} tasks`}
              </Text>
              <Text style={styles.stateText}>
                {activeFilter === 'Posted'
                  ? 'Post a task from the Post tab to see it here.'
                  : activeFilter === 'Accepted'
                  ? 'Accept a task from the Home feed to see it here.'
                  : 'Your tasks will appear here once you get started.'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              </Text>
              {filteredTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      </View>
    </GuestGate>
  );
};

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statNumber: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  resultCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  centerState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  stateTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  stateText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.semiBold,
    fontSize: FONTS.sizes.md,
  },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: FONTS.weights.semiBold,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: FONTS.weights.semiBold,
  },
  price: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginLeft: 8,
  },
  taskTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  subject: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
    marginBottom: 4,
  },
  description: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  expertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  expertText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.success,
    flex: 1,
  },
  postedByText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  assignedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  assignedBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerLeft: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  submitButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  viewButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: SPACING.sm,
  },
  viewButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  bottomPad: {
    height: 20,
  },
});

export default MyTasksScreen;

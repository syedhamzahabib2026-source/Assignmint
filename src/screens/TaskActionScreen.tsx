import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants';
import Icon from '../components/common/Icon';
import { useAuth } from '../state/AuthProvider';
import { firestoreService } from '../services/firestoreService';
import { fcmService } from '../services/fcmService';
import { Task } from '../types/firestore';
import LeaveReviewModal from '../components/LeaveReviewModal';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatDate = (date: any): string => {
  if (!date) return '—';
  const d = date instanceof Date ? date : (date.toDate?.() ?? new Date(date));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fileNameFromUrl = (url: string): string => {
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split('/');
    const last = parts[parts.length - 1].split('?')[0];
    return last.replace(/^\d+_/, '');
  } catch {
    return 'file';
  }
};

// ─── component ──────────────────────────────────────────────────────────────

const TaskActionScreen = ({ route, navigation }: any) => {
  const { taskId } = route.params as { taskId: string };
  const { user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [acting, setActing] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // review modal state — shown after a successful approval
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    firestoreService.getTask(taskId).then(t => {
      if (!cancelled) {
        setTask(t);
        setLoadingTask(false);
      }
    }).catch(() => {
      if (!cancelled) setLoadingTask(false);
    });
    return () => { cancelled = true; };
  }, [taskId]);

  // ── approve ──────────────────────────────────────────────────────────────

  const handleApprove = () => {
    Alert.alert(
      'Approve Submission',
      'This will mark the task as completed and notify the expert.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', style: 'default', onPress: confirmApprove },
      ]
    );
  };

  const confirmApprove = async () => {
    if (!task) return;
    setActing(true);
    try {
      await firestoreService.updateTask(taskId, {
        status: 'completed',
        completedAt: new Date(),
        completedBy: task.submittedBy,
        completedByName: task.submittedByName,
      } as any);

      if (task.submittedBy) {
        await fcmService.sendTaskNotification(
          task.submittedBy,
          taskId,
          'taskCompleted',
          'Submission Approved!',
          `Your work on "${task.title}" has been approved. Payment is on its way.`
        );
      }

      // Show review modal before leaving — the modal's onClose/onSubmitted handles navigation
      setShowReviewModal(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to approve submission. Please try again.');
      setActing(false);
    }
    // Note: setActing(false) is intentionally omitted here — the acting state
    // persists so the buttons stay disabled while the review modal is open.
  };

  const handleReviewDone = () => {
    setShowReviewModal(false);
    setActing(false);
    navigation.goBack();
  };

  // ── reject / request revision ─────────────────────────────────────────────

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Reason required', 'Please explain what needs to be revised.');
      return;
    }
    if (!task) return;
    setActing(true);
    setShowRejectModal(false);

    try {
      await firestoreService.updateTask(taskId, {
        status: 'in_progress',
        rejectionReason: rejectionReason.trim(),
      } as any);

      await sendRejectionMessage(task, rejectionReason.trim());

      if (task.submittedBy) {
        await fcmService.sendTaskNotification(
          task.submittedBy,
          taskId,
          'taskRevision',
          'Revision Requested',
          `Your submission for "${task.title}" needs changes. Check the chat for details.`
        );
      }

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to request revision. Please try again.');
    } finally {
      setActing(false);
    }
  };

  const sendRejectionMessage = async (t: Task, reason: string) => {
    if (!user || !t.submittedBy) return;

    const chats = await firestoreService.getChats({ taskId });
    let chatId: string | null = null;

    for (const c of chats) {
      if (c.participants.includes(user.uid) && c.participants.includes(t.submittedBy)) {
        chatId = c.id;
        break;
      }
    }

    if (!chatId) {
      chatId = await firestoreService.createChat({
        taskId,
        taskTitle: t.title,
        participants: [user.uid, t.submittedBy],
        participantNames: {
          [user.uid]: user.displayName ?? 'Requester',
          [t.submittedBy]: t.submittedByName ?? 'Expert',
        },
        isActive: true,
      });
    }

    await firestoreService.sendMessage({
      chatId: chatId!,
      senderId: user.uid,
      senderName: user.displayName ?? 'Requester',
      text: `Revision requested: ${reason}`,
      type: 'text',
      isRead: false,
      readBy: {},
    });
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (loadingTask) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading submission…</Text>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.centered}>
        <Icon name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Task not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const hasFiles = (task.submissionFileUrls ?? []).length > 0;
  const expertId   = task.submittedBy ?? task.completedBy ?? '';
  const expertName = task.submittedByName ?? task.completedByName ?? 'Expert';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Icon name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Submission</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task info */}
        <View style={styles.card}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={styles.meta}>
            <Icon name="person-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>
              Submitted by {task.submittedByName ?? 'Expert'}
            </Text>
          </View>
          <View style={styles.meta}>
            <Icon name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{formatDate(task.submittedAt)}</Text>
          </View>
          <View style={[styles.statusPill, styles.statusSubmitted]}>
            <Text style={styles.statusPillText}>Awaiting Your Review</Text>
          </View>
        </View>

        {/* Expert's note */}
        {task.submissionNote ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Note from Expert</Text>
            <Text style={styles.noteText}>{task.submissionNote}</Text>
          </View>
        ) : null}

        {/* Submitted files */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            Submitted Files{hasFiles ? ` (${task.submissionFileUrls!.length})` : ''}
          </Text>
          {hasFiles ? (
            task.submissionFileUrls!.map((url, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.fileRow}
                onPress={() => Linking.openURL(url).catch(() =>
                  Alert.alert('Cannot open', 'Unable to open this file.')
                )}
              >
                <View style={styles.fileIcon}>
                  <Icon name="document-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {fileNameFromUrl(url)}
                  </Text>
                  <Text style={styles.fileHint}>Tap to open</Text>
                </View>
                <Icon name="open-outline" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyFiles}>
              <Icon name="document-outline" size={32} color={COLORS.gray300} />
              <Text style={styles.emptyFilesText}>No files attached to this submission.</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn, acting && styles.disabled]}
            onPress={() => setShowRejectModal(true)}
            disabled={acting}
          >
            {acting ? (
              <ActivityIndicator color={COLORS.warning} size="small" />
            ) : (
              <Icon name="refresh-outline" size={18} color={COLORS.warning} />
            )}
            <Text style={[styles.actionBtnText, styles.rejectBtnText]}>Request Revision</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn, acting && styles.disabled]}
            onPress={handleApprove}
            disabled={acting}
          >
            {acting ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Icon name="checkmark-circle-outline" size={18} color={COLORS.white} />
            )}
            <Text style={[styles.actionBtnText, styles.approveBtnText]}>Approve & Complete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rejection reason modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Request Revision</Text>
            <Text style={styles.modalSubtitle}>
              Explain what needs to change. This will be sent to the expert via chat.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe what needs to be revised…"
              placeholderTextColor={COLORS.textSecondary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowRejectModal(false); setRejectionReason(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSend, !rejectionReason.trim() && styles.disabled]}
                onPress={handleRejectSubmit}
                disabled={!rejectionReason.trim()}
              >
                <Text style={styles.modalSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post-approval review modal */}
      {user && expertId ? (
        <LeaveReviewModal
          visible={showReviewModal}
          onClose={handleReviewDone}
          onSubmitted={handleReviewDone}
          taskId={taskId}
          subjectId={expertId}
          subjectName={expertName}
          role="expert"
          authorId={user.uid}
          authorName={user.displayName ?? user.email ?? 'User'}
        />
      ) : null}
    </SafeAreaView>
  );
};

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  errorText: {
    marginTop: SPACING.md,
    color: COLORS.error,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  taskTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    marginTop: SPACING.sm,
  },
  statusSubmitted: {
    backgroundColor: '#FFF3CD',
  },
  statusPillText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: '#856404',
  },
  sectionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  noteText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  fileHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    marginTop: 2,
  },
  emptyFiles: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  emptyFilesText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: 12,
    paddingVertical: SPACING.md,
  },
  actionBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: COLORS.warning,
  },
  rejectBtnText: {
    color: COLORS.warning,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
  },
  approveBtnText: {
    color: COLORS.white,
  },
  disabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: 120,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalSend: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
  },
  modalSendText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default TaskActionScreen;

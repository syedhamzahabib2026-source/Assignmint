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
  Linking,
} from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { COLORS, FONTS, SPACING } from '../constants';
import Icon, { Icons } from '../components/common/Icon';
import { useAuth } from '../state/AuthProvider';
import { firestoreService } from '../services/firestoreService';
import { fcmService } from '../services/fcmService';
import { storage } from '../lib/firebase';
import { Task } from '../types/firestore';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatDeadline = (deadline: any): string => {
  if (!deadline) return 'No deadline';
  const d = deadline instanceof Date ? deadline : (deadline.toDate?.() ?? new Date(deadline));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── types ──────────────────────────────────────────────────────────────────

interface PickedFile extends DocumentPickerResponse {
  uploadProgress?: number;
}

// ─── component ──────────────────────────────────────────────────────────────

const UploadDeliveryScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { taskId } = route.params ?? {};
  const { user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setLoadingTask(false);
      return;
    }
    firestoreService.getTask(taskId)
      .then(setTask)
      .catch(err => console.error('UploadDelivery fetch error:', err))
      .finally(() => setLoadingTask(false));
  }, [taskId]);

  // ─── file picking ─────────────────────────────────────────────────────────

  const handlePickFiles = async () => {
    try {
      const picked = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });
      setFiles(prev => {
        const existingNames = new Set(prev.map(f => f.name));
        const newFiles = picked.filter(f => !existingNames.has(f.name));
        return [...prev, ...newFiles];
      });
    } catch (err) {
      if (DocumentPicker.isCancel(err)) return;
      console.error('Document picker error:', err);
      Alert.alert('Error', 'Could not open file picker. Please try again.');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ─── upload + submit ──────────────────────────────────────────────────────

  const uploadFileToStorage = async (file: PickedFile, index: number): Promise<string> => {
    const timestamp = Date.now();
    const safeName = (file.name ?? `file_${index}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `tasks/${taskId}/submissions/${timestamp}_${safeName}`;
    const ref = storage().ref(storagePath);

    const localUri = (file as any).fileCopyUri ?? file.uri;
    const uploadTask = ref.putFile(localUri);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: any) => {
          const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => {
            const perFile = 100 / files.length;
            return Math.round(index * perFile + (fileProgress / 100) * perFile);
          });
        },
        reject,
        async () => {
          const url = await ref.getDownloadURL();
          resolve(url);
        }
      );
    });
  };

  const handleSubmit = async () => {
    if (!user || !task) return;
    if (files.length === 0 && !note.trim()) {
      Alert.alert('Nothing to Submit', 'Please attach at least one file or add a note before submitting.');
      return;
    }

    Alert.alert(
      'Submit Work',
      `Submit your work for "${task.title}"? The requester will be notified to review it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: doSubmit },
      ]
    );
  };

  const doSubmit = async () => {
    if (!user || !task) return;
    setSubmitting(true);
    setUploadProgress(0);

    try {
      let fileUrls: string[] = [];

      if (files.length > 0) {
        try {
          const uploadPromises = files.map((f, i) => uploadFileToStorage(f, i));
          fileUrls = await Promise.all(uploadPromises);
          setUploadProgress(100);
        } catch (storageErr) {
          console.error('Storage upload error:', storageErr);
          Alert.alert(
            'Upload Failed',
            'Could not upload files. Please run pod install and rebuild, or submit without files.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Submit Without Files',
                onPress: () => doSubmitWithUrls([]),
              },
            ]
          );
          setSubmitting(false);
          return;
        }
      }

      await doSubmitWithUrls(fileUrls);
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Error', 'Failed to submit work. Please try again.');
      setSubmitting(false);
    }
  };

  const doSubmitWithUrls = async (fileUrls: string[]) => {
    if (!user || !task) return;
    try {
      await firestoreService.updateTask(taskId, {
        status: 'submitted',
        submittedAt: new Date(),
        submittedBy: user.uid,
        submittedByName: user.displayName || user.email || 'Expert',
        submissionNote: note.trim() || undefined,
        submissionFileUrls: fileUrls.length > 0 ? fileUrls : undefined,
      });

      await fcmService.sendTaskNotification(
        task.createdBy,
        taskId,
        'taskSubmitted',
        'Work Submitted for Review',
        `${user.displayName || user.email} submitted work for "${task.title}". Tap to review.`
      );

      setSubmitted(true);
    } catch (err) {
      console.error('Firestore update error:', err);
      Alert.alert('Error', 'Failed to update task status. Please try again.');
      setSubmitting(false);
    }
  };

  // ─── success screen ───────────────────────────────────────────────────────

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Icon name="checkmark-circle" size={72} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Work Submitted!</Text>
          <Text style={styles.successBody}>
            Your work has been sent to {task?.createdByName ?? 'the requester'} for review.
            You'll be notified once they respond.
          </Text>

          {note.trim() ? (
            <View style={styles.successNote}>
              <Text style={styles.successNoteLabel}>Your note:</Text>
              <Text style={styles.successNoteText}>{note.trim()}</Text>
            </View>
          ) : null}

          <View style={styles.successStats}>
            <View style={styles.successStat}>
              <Text style={styles.successStatValue}>{files.length}</Text>
              <Text style={styles.successStatLabel}>Files</Text>
            </View>
            <View style={styles.successStatDivider} />
            <View style={styles.successStat}>
              <Text style={styles.successStatValue}>Pending</Text>
              <Text style={styles.successStatLabel}>Review</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.successButton}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Text style={styles.successButtonText}>View My Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.successButtonSecondary}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.successButtonSecondaryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── loading ──────────────────────────────────────────────────────────────

  if (loadingTask) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading task...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButtonAlone} onPress={() => navigation.goBack()}>
          <Icon name={Icons.back} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Icon name={Icons.error} size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Task not found.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = (files.length > 0 || note.trim().length > 0) && !submitting;

  // ─── main form ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} disabled={submitting}>
          <Icon name={Icons.back} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Work</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Task details card */}
        <View style={styles.taskCard}>
          <View style={styles.taskCardHeader}>
            <View style={[styles.subjectBadge, { backgroundColor: COLORS.primary + '15' }]}>
              <Text style={[styles.subjectBadgeText, { color: COLORS.primary }]}>{task.subject}</Text>
            </View>
            <Text style={styles.taskPrice}>${task.price}</Text>
          </View>
          <Text style={styles.taskTitle}>{task.title}</Text>
          {!!task.description && (
            <Text style={styles.taskDescription} numberOfLines={3}>{task.description}</Text>
          )}
          <View style={styles.taskMeta}>
            <Icon name={Icons.time} size={14} color={COLORS.textSecondary} />
            <Text style={styles.taskMetaText}>Deadline: {formatDeadline(task.deadline)}</Text>
            <Text style={styles.taskMetaSep}> · </Text>
            <Icon name={Icons.profile} size={14} color={COLORS.textSecondary} />
            <Text style={styles.taskMetaText}>{task.createdByName}</Text>
          </View>
        </View>

        {/* Files section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachments</Text>
          <Text style={styles.sectionSubtitle}>Upload your completed work files</Text>

          {files.map((file, index) => (
            <View key={`${file.name}-${index}`} style={styles.fileRow}>
              <Icon name="document-outline" size={20} color={COLORS.primary} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                {file.size ? (
                  <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => removeFile(index)} style={styles.removeFileBtn} disabled={submitting}>
                <Icon name="close-circle" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addFilesButton, submitting && styles.disabledButton]}
            onPress={handlePickFiles}
            disabled={submitting}
          >
            <Icon name={Icons.upload} size={20} color={COLORS.primary} />
            <Text style={styles.addFilesText}>
              {files.length === 0 ? 'Add Files' : 'Add More Files'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Note section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note to Requester</Text>
          <Text style={styles.sectionSubtitle}>Describe what you've done or any important context</Text>
          <TextInput
            style={[styles.noteInput, submitting && styles.disabledInput]}
            placeholder="e.g. Completed all sections. Referenced the textbook chapters you mentioned..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={note}
            onChangeText={setNote}
            editable={!submitting}
          />
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Icon name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.disclaimerText}>
            Once submitted, the requester will review your work and either approve it or request revisions.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit bar */}
      <View style={styles.actionBar}>
        {submitting ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.progressSpinner} />
            <Text style={styles.progressText}>
              {files.length > 0 && uploadProgress < 100
                ? `Uploading files... ${uploadProgress}%`
                : 'Submitting...'}
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress || 5}%` }]} />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Icon name="checkmark-circle-outline" size={20} color={COLORS.white} />
            <Text style={styles.submitButtonText}>Submit Work</Text>
          </TouchableOpacity>
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
    width: 40,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.text,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: FONTS.weights.semiBold,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.semiBold,
    fontSize: FONTS.sizes.md,
  },
  backButtonAlone: { padding: 16 },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subjectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  subjectBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semiBold,
  },
  taskPrice: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.success,
  },
  taskTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: 6,
  },
  taskDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  taskMetaText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  taskMetaSep: {
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  fileSize: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 4,
  },
  addFilesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
  },
  addFilesText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.primary,
  },
  noteInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: 120,
    lineHeight: 22,
  },
  disabledInput: {
    opacity: 0.6,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.gray100,
    borderRadius: 10,
    padding: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.white,
  },
  disabledButton: {
    opacity: 0.4,
  },
  progressContainer: {
    alignItems: 'center',
    gap: 8,
  },
  progressSpinner: {},
  progressText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  // Success screen
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
  },
  successBody: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  successNote: {
    width: '100%',
    backgroundColor: COLORS.gray100,
    borderRadius: 10,
    padding: 14,
  },
  successNoteLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  successNoteText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  successStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    width: '100%',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  successStat: {
    flex: 1,
    alignItems: 'center',
  },
  successStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  successStatValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  successStatLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  successButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semiBold,
    color: COLORS.white,
  },
  successButtonSecondary: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
  },
  successButtonSecondaryText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
});

export default UploadDeliveryScreen;

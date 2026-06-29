import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from './common/Icon';
import { COLORS, FONTS, SPACING } from '../constants';
import { submitReview } from '../services/reviewService';

// ─── tag definitions ────────────────────────────────────────────────────────

export const TAG_LABELS: Record<string, string> = {
  // expert tags
  on_time:               'On Time',
  high_quality:          'High Quality',
  great_communicator:    'Great Communicator',
  exceeded_expectations: 'Exceeded Expectations',
  would_hire_again:      'Would Hire Again',
  late_delivery:         'Late Delivery',
  poor_quality:          'Poor Quality',
  unclear_communication: 'Unclear Communication',
  incomplete_work:       'Incomplete Work',
  // requester tags
  clear_instructions:    'Clear Instructions',
  quick_responses:       'Quick Responses',
  fair_feedback:         'Fair Feedback',
  respectful:            'Respectful',
  paid_on_time:          'Paid On Time',
  unclear_requirements:  'Unclear Requirements',
  slow_responses:        'Slow Responses',
  changed_scope:         'Changed Scope',
  unreasonable:          'Unreasonable',
};

const EXPERT_TAGS_POSITIVE  = ['on_time', 'high_quality', 'great_communicator', 'exceeded_expectations', 'would_hire_again'];
const EXPERT_TAGS_NEGATIVE  = ['late_delivery', 'poor_quality', 'unclear_communication', 'incomplete_work'];
const REQUESTER_TAGS_POSITIVE = ['clear_instructions', 'quick_responses', 'fair_feedback', 'respectful', 'paid_on_time'];
const REQUESTER_TAGS_NEGATIVE = ['unclear_requirements', 'slow_responses', 'changed_scope', 'unreasonable'];

function getTagsForRole(role: 'requester' | 'expert') {
  return role === 'expert'
    ? { positive: EXPERT_TAGS_POSITIVE,   negative: EXPERT_TAGS_NEGATIVE }
    : { positive: REQUESTER_TAGS_POSITIVE, negative: REQUESTER_TAGS_NEGATIVE };
}

// ─── props ───────────────────────────────────────────────────────────────────

interface LeaveReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  taskId: string;
  subjectId: string;
  subjectName: string;
  /** Role of the SUBJECT being reviewed */
  role: 'requester' | 'expert';
  authorId: string;
  authorName: string;
}

// ─── component ───────────────────────────────────────────────────────────────

const StarRow: React.FC<{ stars: number; onSelect: (n: number) => void }> = ({ stars, onSelect }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((n) => (
      <TouchableOpacity key={n} onPress={() => onSelect(n)} style={styles.starBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
        <Icon
          name={n <= stars ? 'star' : 'star-outline'}
          size={34}
          color={n <= stars ? '#FFD700' : COLORS.gray300}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({
  visible,
  onClose,
  onSubmitted,
  taskId,
  subjectId,
  subjectName,
  role,
  authorId,
  authorName,
}) => {
  const [stars, setStars]         = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { positive, negative } = getTagsForRole(role);
  const roleLabel = role === 'expert' ? 'expert' : 'requester';

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (stars === 0) {
      Alert.alert('Select a rating', 'Please choose 1–5 stars before submitting.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitReview({
        taskId,
        authorId,
        authorName,
        subjectId,
        role,
        stars,
        tags: Array.from(selectedTags),
        comment: comment.trim(),
      });
      onSubmitted();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [stars, submitting, taskId, authorId, authorName, subjectId, role, selectedTags, comment, onSubmitted]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setStars(0);
    setSelectedTags(new Set());
    setComment('');
    onClose();
  }, [submitting, onClose]);

  const TagChip: React.FC<{ tag: string; positive: boolean }> = ({ tag, positive: isPositive }) => {
    const active = selectedTags.has(tag);
    const activeColor = isPositive ? COLORS.success : COLORS.error;
    return (
      <TouchableOpacity
        style={[
          styles.chip,
          active && { backgroundColor: activeColor + '22', borderColor: activeColor },
        ]}
        onPress={() => toggleTag(tag)}
      >
        <Text style={[styles.chipText, active && { color: activeColor, fontWeight: '600' }]}>
          {TAG_LABELS[tag] ?? tag}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rate this {roleLabel}</Text>
            <TouchableOpacity onPress={handleClose} disabled={submitting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>How was your experience with {subjectName}?</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Stars */}
            <StarRow stars={stars} onSelect={setStars} />

            {/* Positive tags */}
            <Text style={styles.tagGroupLabel}>What went well?</Text>
            <View style={styles.tagWrap}>
              {positive.map((tag) => (
                <TagChip key={tag} tag={tag} positive />
              ))}
            </View>

            {/* Negative tags */}
            <Text style={styles.tagGroupLabel}>Any issues?</Text>
            <View style={styles.tagWrap}>
              {negative.map((tag) => (
                <TagChip key={tag} tag={tag} positive={false} />
              ))}
            </View>

            {/* Comment */}
            <Text style={styles.tagGroupLabel}>Comment (optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share a bit more about your experience…"
              placeholderTextColor={COLORS.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, (stars === 0 || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={stars === 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleClose} disabled={submitting}>
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </TouchableOpacity>

            <View style={{ height: SPACING.xl }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: SPACING.md,
  },
  starBtn: {
    padding: 4,
  },
  tagGroupLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    minHeight: 80,
    marginTop: SPACING.sm,
  },
  submitBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  skipBtn: {
    marginTop: SPACING.sm,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  skipBtnText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});

export default LeaveReviewModal;

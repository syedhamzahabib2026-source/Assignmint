import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import { computeTrustScore } from './trust/trustScore';
import { COLLECTIONS } from '../types/firestore';

export interface SubmitReviewParams {
  taskId: string;
  authorId: string;
  authorName: string;
  subjectId: string;
  /**
   * Role of the SUBJECT being reviewed.
   * 'expert'    → requester is reviewing the expert  → sets task.requesterReviewId
   * 'requester' → expert is reviewing the requester  → sets task.expertReviewId
   */
  role: 'requester' | 'expert';
  stars: number;
  tags: string[];
  comment: string;
}

export async function submitReview(params: SubmitReviewParams): Promise<void> {
  const db = getFirebaseDb();

  const reviewRef = db.collection(COLLECTIONS.REVIEWS).doc();
  const userRef   = db.collection(COLLECTIONS.USERS).doc(params.subjectId);
  const taskRef   = db.collection(COLLECTIONS.TASKS).doc(params.taskId);

  const taskField =
    params.role === 'expert' ? 'requesterReviewId' : 'expertReviewId';

  await db.runTransaction(async (tx: FirebaseFirestoreTypes.Transaction) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error('Subject user not found');

    const data = userSnap.data()!;
    const currentRatingSum   = (data.ratingSum   ?? 0) as number;
    const currentTotalReviews = (data.totalReviews ?? 0) as number;
    const currentTasksCompleted = (data.tasksCompleted ?? 0) as number;
    const currentTags: Record<string, number> = (data.reviewTags ?? {}) as Record<string, number>;

    const newRatingSum    = currentRatingSum + params.stars;
    const newTotalReviews = currentTotalReviews + 1;
    const newRating       = Math.round((newRatingSum / newTotalReviews) * 10) / 10;
    const newTrustScore   = computeTrustScore(newRatingSum, newTotalReviews, currentTasksCompleted);

    const newTags = { ...currentTags };
    for (const tag of params.tags) {
      newTags[tag] = (newTags[tag] ?? 0) + 1;
    }

    tx.set(reviewRef, {
      taskId:     params.taskId,
      authorId:   params.authorId,
      authorName: params.authorName,
      subjectId:  params.subjectId,
      role:       params.role,
      stars:      params.stars,
      tags:       params.tags,
      comment:    params.comment,
      createdAt:  firestore.FieldValue.serverTimestamp(),
    });

    tx.update(userRef, {
      ratingSum:    newRatingSum,
      totalReviews: newTotalReviews,
      rating:       newRating,
      trustScore:   newTrustScore,
      reviewTags:   newTags,
      updatedAt:    firestore.FieldValue.serverTimestamp(),
    });

    tx.update(taskRef, {
      [taskField]: reviewRef.id,
      updatedAt:   firestore.FieldValue.serverTimestamp(),
    });
  });
}

export async function getReviewsForUser(
  userId: string,
  limitCount = 20,
): Promise<import('../types/firestore').Review[]> {
  const db = getFirebaseDb();
  const snap = await db
    .collection(COLLECTIONS.REVIEWS)
    .where('subjectId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snap.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
    const d = doc.data();
    return {
      id:         doc.id,
      taskId:     d.taskId,
      authorId:   d.authorId,
      authorName: d.authorName,
      subjectId:  d.subjectId,
      role:       d.role,
      stars:      d.stars,
      tags:       d.tags ?? [],
      comment:    d.comment ?? '',
      createdAt:  d.createdAt?.toDate?.() ?? new Date(),
    } as import('../types/firestore').Review;
  });
}

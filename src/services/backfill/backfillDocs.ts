/**
 * One-time backfill for existing Firestore documents.
 * Run once after deploying the Reviews & Trust feature.
 *
 * Call from a dev screen or admin tool — NOT imported anywhere else.
 */
import firestore from '@react-native-firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import { computeTrustScore } from '../trust/trustScore';

export async function backfillUsers(): Promise<{ updated: number; errors: number }> {
  const db = getFirebaseDb();
  const snap = await db.collection('users').get();

  let updated = 0;
  let errors = 0;

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    try {
      const data = doc.data();
      const ratingSum = data.ratingSum ?? (data.rating ?? 0) * (data.totalReviews ?? 0);
      const totalReviews = data.totalReviews ?? 0;
      const tasksCompleted = data.tasksCompleted ?? 0;
      const trustScore = computeTrustScore(ratingSum, totalReviews, tasksCompleted);

      batch.update(doc.ref, {
        ratingSum,
        reviewTags: data.reviewTags ?? {},
        totalReviews,
        tasksCompleted,
        tasksPosted: data.tasksPosted ?? 0,
        totalEarnings: data.totalEarnings ?? 0,
        isVerified: data.isVerified ?? false,
        trustScore,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      batchCount++;
      updated++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    } catch {
      errors++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { updated, errors };
}

export async function backfillTasks(): Promise<{ updated: number; errors: number }> {
  const db = getFirebaseDb();
  const snap = await db.collection('tasks').get();

  let updated = 0;
  let errors = 0;

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    try {
      const data = doc.data();
      const needsUpdate =
        data.requesterReviewId === undefined ||
        data.expertReviewId === undefined;

      if (!needsUpdate) continue;

      batch.update(doc.ref, {
        requesterReviewId: data.requesterReviewId ?? null,
        expertReviewId: data.expertReviewId ?? null,
      });

      batchCount++;
      updated++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    } catch {
      errors++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { updated, errors };
}

export async function runFullBackfill(): Promise<void> {
  console.log('🔄 Starting backfill...');
  const userResult = await backfillUsers();
  console.log(`✅ Users backfilled: ${userResult.updated} updated, ${userResult.errors} errors`);
  const taskResult = await backfillTasks();
  console.log(`✅ Tasks backfilled: ${taskResult.updated} updated, ${taskResult.errors} errors`);
  console.log('🎉 Backfill complete');
}

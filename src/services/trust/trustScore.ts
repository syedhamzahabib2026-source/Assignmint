export type TrustTier = 'new' | 'rising' | 'trusted' | 'verified';

/**
 * Compute a 0–100 trust score from aggregated review data.
 *
 * ratingPart     = (avgRating / 5) × 80   → up to 80 pts
 * completionPart = min(tasksCompleted × 2, 20) → up to 20 pts
 */
export function computeTrustScore(
  ratingSum: number,
  totalReviews: number,
  tasksCompleted: number,
): number {
  const avgRating = totalReviews > 0 ? ratingSum / totalReviews : 0;
  const ratingPart = (avgRating / 5) * 80;
  const completionPart = Math.min(tasksCompleted * 2, 20);
  return Math.round(Math.min(100, Math.max(0, ratingPart + completionPart)));
}

export function getTrustTier(score: number): TrustTier {
  if (score >= 80) return 'verified';
  if (score >= 55) return 'trusted';
  if (score >= 25) return 'rising';
  return 'new';
}

export function getTrustTierLabel(tier: TrustTier): string {
  switch (tier) {
    case 'verified': return 'Verified';
    case 'trusted':  return 'Trusted';
    case 'rising':   return 'Rising';
    case 'new':      return 'New';
  }
}

export function getTrustTierColor(tier: TrustTier): string {
  switch (tier) {
    case 'verified': return '#34C759';
    case 'trusted':  return '#007AFF';
    case 'rising':   return '#FF9500';
    case 'new':      return '#8E8E93';
  }
}

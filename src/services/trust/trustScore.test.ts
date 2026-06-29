import { computeTrustScore, getTrustTier } from './trustScore';

describe('computeTrustScore', () => {
  test('new user with no reviews or tasks scores 0', () => {
    expect(computeTrustScore(0, 0, 0)).toBe(0);
  });

  test('10 completed tasks, no reviews scores 20', () => {
    expect(computeTrustScore(0, 0, 10)).toBe(20);
  });

  test('5-star average (1 review), 0 tasks scores 80', () => {
    expect(computeTrustScore(5, 1, 0)).toBe(80);
  });

  test('5-star average (1 review), 10 tasks scores 100', () => {
    expect(computeTrustScore(5, 1, 10)).toBe(100);
  });

  test('3-star average (1 review), 0 tasks scores 48', () => {
    expect(computeTrustScore(3, 1, 0)).toBe(48);
  });

  test('clamps to 100 for very active verified user', () => {
    expect(computeTrustScore(25, 5, 100)).toBe(100);
  });

  test('completion bonus caps at 20 points', () => {
    const withTen = computeTrustScore(0, 0, 10);
    const withFifty = computeTrustScore(0, 0, 50);
    expect(withTen).toBe(20);
    expect(withFifty).toBe(20);
  });

  test('4-star average (2 reviews), 5 tasks', () => {
    // avg = 8/2 = 4, ratingPart = (4/5)*80 = 64, completionPart = min(10,20) = 10 → 74
    expect(computeTrustScore(8, 2, 5)).toBe(74);
  });
});

describe('getTrustTier', () => {
  test('score 0 is new', ()     => expect(getTrustTier(0)).toBe('new'));
  test('score 24 is new', ()    => expect(getTrustTier(24)).toBe('new'));
  test('score 25 is rising', () => expect(getTrustTier(25)).toBe('rising'));
  test('score 54 is rising', () => expect(getTrustTier(54)).toBe('rising'));
  test('score 55 is trusted', ()  => expect(getTrustTier(55)).toBe('trusted'));
  test('score 79 is trusted', ()  => expect(getTrustTier(79)).toBe('trusted'));
  test('score 80 is verified', () => expect(getTrustTier(80)).toBe('verified'));
  test('score 100 is verified', () => expect(getTrustTier(100)).toBe('verified'));
});

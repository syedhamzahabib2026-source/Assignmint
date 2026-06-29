# AssignMint — Reviews & Trust System Build Spec (V1)

## §0 Overview

After a task completes, both the **requester** (task poster) and the **expert** (task accepter) can leave each other a starred review with optional tags and a short comment. The aggregated reviews drive a **Trust Score** (0–100) displayed on each user's profile and as a badge next to their name in task flows.

---

## §1 Data Model

### 1.1 New Firestore Collection: `reviews`

```
reviews/{reviewId}
  taskId        : string           — task this review is about
  authorId      : string           — uid of the person writing the review
  authorName    : string           — display name of author (denormalized)
  subjectId     : string           — uid of the person being reviewed
  role          : 'requester' | 'expert'  — role of the SUBJECT in the task
  stars         : number           — 1–5
  tags          : string[]         — selected tag slugs (see §6)
  comment       : string           — optional free-text comment
  createdAt     : Timestamp
```

### 1.2 New fields on `users/{uid}`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `ratingSum` | `number` | `0` | Running sum of all star values received |
| `reviewTags` | `Record<string,number>` | `{}` | Tag slug → frequency count |

Existing fields `rating`, `totalReviews`, `tasksCompleted`, `trustScore` are already present; they are updated by the review transaction (§4).

### 1.3 New fields on `tasks/{taskId}`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `requesterReviewId` | `string \| null` | `null` | ID of review doc left BY the requester (about the expert) |
| `expertReviewId` | `string \| null` | `null` | ID of review doc left BY the expert (about the requester) |

---

## §2 Trust Score Pure Functions

**File:** `src/services/trust/trustScore.ts`

```
avgRating      = totalReviews > 0 ? ratingSum / totalReviews : 0
ratingPart     = (avgRating / 5) × 80          // max 80 pts
completionPart = min(tasksCompleted × 2, 20)   // max 20 pts
trustScore     = round(clamp(ratingPart + completionPart, 0, 100))
```

**Tiers:**

| Score | Tier |
|-------|------|
| 0–24  | New |
| 25–54 | Rising |
| 55–79 | Trusted |
| 80–100 | Verified |

**Example assertions (test file):**
- `(0, 0, 0)` → score `0`, tier `'new'`
- `(0, 0, 10)` → score `20`, tier `'new'`
- `(5, 1, 0)` → score `80`, tier `'verified'`
- `(5, 1, 10)` → score `100`, tier `'verified'`
- `(3, 1, 0)` → score `48`, tier `'rising'`

---

## §3 Review Eligibility

A user may leave a review for a task if **all** are true:
1. The task `status === 'completed'`
2. The user is either `task.createdBy` (requester) or `task.completedBy` (expert)
3. Their corresponding review slot on the task is `null`:
   - Requester → `task.requesterReviewId == null`
   - Expert → `task.expertReviewId == null`

---

## §4 `submitReview` Transaction

**File:** `src/services/reviewService.ts`

Inside a single Firestore transaction:
1. Read `users/{subjectId}`
2. Compute new aggregates:
   - `newRatingSum = ratingSum + stars`
   - `newTotalReviews = totalReviews + 1`
   - `newRating = newRatingSum / newTotalReviews`
   - `newTrustScore = computeTrustScore(newRatingSum, newTotalReviews, tasksCompleted)`
   - `newReviewTags = merge tag frequencies`
3. `tx.set(reviews/{newId}, reviewDoc)`
4. `tx.update(users/{subjectId}, { ratingSum, rating, totalReviews, trustScore, reviewTags })`
5. `tx.update(tasks/{taskId}, { [requesterReviewId|expertReviewId]: newId })`
   - Use `requesterReviewId` when `role === 'expert'` (requester is reviewing expert)
   - Use `expertReviewId` when `role === 'requester'` (expert is reviewing requester)

---

## §5 UI Components

### 5.1 TrustBadge

**File:** `src/components/TrustBadge.tsx`

Props:
- `score: number` — the user's trust score
- `showScore?: boolean` — default `true`
- `size?: 'sm' | 'md'` — default `'md'`

Renders a small pill with a shield icon, the tier label, and optionally the numeric score. Color is tier-dependent.

### 5.2 LeaveReviewModal

**File:** `src/components/LeaveReviewModal.tsx`

Props:
- `visible: boolean`
- `onClose: () => void`
- `onSubmitted: () => void`
- `taskId: string`
- `subjectId: string`
- `subjectName: string`
- `role: 'requester' | 'expert'` — role of the SUBJECT
- `authorId: string`
- `authorName: string`

UI:
1. Star picker (5 stars, tap to select)
2. Tag chips relevant to the subject's role (see §6)
3. Optional comment TextInput
4. Submit button with double-tap guard (`submitting` boolean state)

---

## §6 Tag Sets

### Expert tags (shown when reviewing an expert, `role === 'expert'`):
- Positive: `on_time`, `high_quality`, `great_communicator`, `exceeded_expectations`, `would_hire_again`
- Negative: `late_delivery`, `poor_quality`, `unclear_communication`, `incomplete_work`

### Requester tags (shown when reviewing a requester, `role === 'requester'`):
- Positive: `clear_instructions`, `quick_responses`, `fair_feedback`, `respectful`, `paid_on_time`
- Negative: `unclear_requirements`, `slow_responses`, `changed_scope`, `unreasonable`

Display labels map: `on_time` → "On Time", `high_quality` → "High Quality", etc.

---

## §7 Wiring

### 7.1 TaskActionScreen — after "Approve & Complete"

After `confirmApprove()` resolves successfully (before `navigation.goBack()`), set a state flag `showReviewModal = true` and render `<LeaveReviewModal>` to let the requester review the expert. On `onSubmitted` or `onClose`, call `navigation.goBack()`.

### 7.2 TaskDetailsScreen — completed task open path

When a completed task loads:
- If `user.uid === task.createdBy` AND `task.requesterReviewId == null` → auto-show modal (requester reviewing expert)
- If `user.uid === task.completedBy` AND `task.expertReviewId == null` → auto-show modal (expert reviewing requester)

Only auto-show once (guard with a `reviewPromptShown` ref).

### 7.3 TaskDetailsScreen — TrustBadge

Show `<TrustBadge>` next to the task poster's name. Load the poster's `trustScore` by fetching `users/{task.createdBy}` after the task loads.

---

## §8 Build Order

1. **Data model + backfill** — update signup, `createUserDocument`, and provide one-time backfill for existing docs
2. **`trustScore.ts`** — pure functions + test file
3. **`reviewService.ts`** — Firestore transaction
4. **`TrustBadge`** component
5. **`LeaveReviewModal`** + tag sets
6. **Wire modal** into TaskActionScreen approval and TaskDetailsScreen completed-task path
7. **ProfileScreen** — replace placeholder reviews tab with real data from `reviews` collection
8. **TaskDetailsScreen** — add TrustBadge + completed-task review prompt
9. **Firestore security rules** — `reviews` collection rules (§9)
10. ~~Cloud Function~~ — **DEFERRED to pre-launch**

---

## §9 Firestore Security Rules

Add to existing rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }

    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if false;
    }

    match /reviews/{reviewId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.authorId
        && request.resource.data.stars is int
        && request.resource.data.stars >= 1
        && request.resource.data.stars <= 5;
      allow update, delete: if false;
    }

    match /chats/{chatId} {
      allow read, write: if request.auth != null
        && request.auth.uid in resource.data.participants;
    }

    match /chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null;
    }

    match /notifications/{notifId} {
      allow read, update: if request.auth != null
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
      allow delete: if false;
    }
  }
}
```

### Required Composite Index

```
Collection: reviews
Field 1: subjectId   (Ascending)
Field 2: createdAt   (Descending)
Query scope: Collection
```

This index is required for the ProfileScreen reviews query:
```
db.collection('reviews')
  .where('subjectId', '==', uid)
  .orderBy('createdAt', 'desc')
  .limit(20)
```

---

## §10 Cloud Function (DEFERRED)

A `onTaskCompleted` Cloud Function that automatically sends push notifications to both parties reminding them to leave a review. Deferred to pre-launch.

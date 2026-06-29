# Firebase Security Rules

## Firestore Rules

Apply these rules in the Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      // Any authenticated user can read profiles (for TrustBadge display)
      allow read: if request.auth != null;
      // Only self can create or update own document
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
      // Any authenticated user can read reviews
      allow read: if request.auth != null;
      // Author must be the authenticated user; stars must be 1–5
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.authorId
        && request.resource.data.stars is int
        && request.resource.data.stars >= 1
        && request.resource.data.stars <= 5;
      // Reviews are immutable once submitted
      allow update, delete: if false;
    }

    match /chats/{chatId} {
      allow read: if request.auth != null
        && request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth != null
        && request.auth.uid in resource.data.participants;
      allow delete: if false;
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

### Required Composite Index for reviews

The ProfileScreen reviews query (`subjectId` filter + `createdAt` order) requires a
composite index. Create it in **Firebase Console → Firestore → Indexes → Composite**:

| Collection | Field 1 | Field 1 Order | Field 2 | Field 2 Order | Scope |
|------------|---------|---------------|---------|---------------|-------|
| `reviews`  | `subjectId` | Ascending | `createdAt` | Descending | Collection |

Or paste this URL pattern into the Firebase Console after the first query fires
(Firestore will offer a "create index" link automatically on the first violation).

## Realtime Database Rules

Apply these rules in the Firebase Console > Realtime Database > Rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

## Storage Rules

Apply these rules in the Firebase Console > Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Important Notes

1. **Apply these rules in the Firebase Console** - they cannot be applied programmatically
2. **Test thoroughly** - these rules are restrictive and only allow users to access their own data
3. **Update project configuration** - replace placeholder values in `src/lib/firebase.ts` with your actual Firebase project config
4. **Monitor usage** - check Firebase Console logs to ensure rules are working as expected

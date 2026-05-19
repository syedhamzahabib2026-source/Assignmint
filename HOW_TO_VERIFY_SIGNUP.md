# How to Verify Sign-Up in Firebase Console

## 📧 Test Credentials
- **Email**: syedhamzahabib2004@gmail.com
- **Password**: hamza123
- **Display Name**: (whatever you enter)

---

## ✅ Where to Check After Sign-Up

### 1. Firebase Authentication (Email/Password Storage)

**Location**: Firebase Console → Authentication → Users

**Steps**:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **Assignmint** (or **assignimt**)
3. Click **Authentication** in the left sidebar
4. Click **Users** tab (should be selected by default)

**What You'll See**:
- A table with all registered users
- Columns: **Email**, **Provider**, **Created**, **Last Sign In**
- Your email `syedhamzahabib2004@gmail.com` should appear in the list
- **Provider** should show: `password`
- **Email Verified** column shows if email is verified (checkmark or X)

**This is where Firebase stores the email/password credentials!**

---

### 2. Firestore Database (User Profile Data)

**Location**: Firebase Console → Firestore Database → Data → `users` collection

**Steps**:
1. Go to Firebase Console
2. Click **Firestore Database** in the left sidebar
3. Click **Data** tab
4. Look for the **`users`** collection
5. Click on it to expand
6. You should see a document with a **Document ID** (this is the user's UID)

**What You'll See**:
- **Document ID**: A long string (the user's UID from Firebase Auth)
- **Fields**:
  - `email`: "syedhamzahabib2004@gmail.com"
  - `displayName`: (whatever name you entered)
  - `role`: "user"
  - `createdAt`: (timestamp)
  - `updatedAt`: (timestamp)
  - `photoURL`: null
  - `stripeCustomerId`: null

**This is where the app stores user profile information!**

---

## 🔍 Quick Verification Checklist

After signing up with `syedhamzahabib2004@gmail.com`:

- [ ] **Authentication → Users**: Email appears in the list
- [ ] **Authentication → Users**: Provider shows "password"
- [ ] **Firestore → users collection**: Document exists with your email
- [ ] **Firestore → users collection**: Display name matches what you entered
- [ ] **Email inbox**: Verification email received (check spam folder)

---

## 📱 How to Sign Up in the App

1. **Open the app** (iOS Simulator or device)
2. **Tap "Sign Up"** or "Create Account" button
3. **Fill in the form**:
   - Display Name: "Hamza" (or any name)
   - Email: `syedhamzahabib2004@gmail.com`
   - Password: `hamza123`
   - Confirm Password: `hamza123`
4. **Tap "Create Account"**
5. **Wait for success message**: "Account Created!"
6. **Check Firebase Console** using the steps above

---

## 🐛 Troubleshooting

### If user doesn't appear in Authentication → Users:
- Check console logs for errors
- Verify Email/Password is enabled in Firebase Console → Authentication → Sign-in method
- Check if there's an error message in the app

### If user appears in Auth but not in Firestore:
- This means sign-up worked but Firestore document creation failed
- Check Firestore security rules
- Check console logs for Firestore errors

### If you see "Email already in use":
- The email is already registered
- Try logging in instead, or use a different email

---

## 📊 What Gets Created Where

| Data | Location | What It Contains |
|------|----------|------------------|
| **Email/Password** | Authentication → Users | Encrypted credentials, email, UID |
| **User Profile** | Firestore → users/{uid} | displayName, email, role, timestamps |
| **Email Verification** | Authentication → Users | Email verification status |

---

## 🎯 Summary

**To verify sign-up worked**:
1. ✅ Check **Firebase Console → Authentication → Users** → Your email should be there
2. ✅ Check **Firebase Console → Firestore Database → users collection** → Your profile should be there

**Both must exist for sign-up to be complete!**


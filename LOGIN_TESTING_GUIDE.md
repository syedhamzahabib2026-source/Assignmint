# Login Testing Guide - Manual Testing Steps

**Date:** January 2025

## ✅ Pre-Test Verification

The following has been verified:
- ✅ Valid user exists: `syedhamzahabib2004@gmail.com` (UID: 780OSh5qgpdG1AU9yx5yRh4YA6I2)
- ✅ Invalid user does NOT exist: `nonexistent@test.com`
- ✅ Login error handling code is implemented correctly
- ✅ Error messages are properly formatted

---

## 🧪 Test Scenarios

### Test 1: Login with Valid Credentials ✅

**Steps:**
1. Open the app (should show Landing screen)
2. Tap "Log In" or "Sign In" button
3. Enter email: `syedhamzahabib2004@gmail.com`
4. Enter password: `hamza123`
5. Tap "Sign In" button

**Expected Results:**
- ✅ No error messages appear
- ✅ Loading indicator shows briefly
- ✅ Console shows: `✅ Login completed successfully`
- ✅ App navigates to Home screen
- ✅ User is authenticated (can access all features)

**If it fails:**
- Check Metro console for error messages
- Verify Firebase connection
- Check network connection

---

### Test 2: Login with Non-Existent Email ❌

**Steps:**
1. On Login screen
2. Enter email: `nonexistent@test.com` (or any random email)
3. Enter password: `anypassword123`
4. Tap "Sign In" button

**Expected Results:**
- ❌ Error message appears
- ✅ Error message says: **"No account found with this email address."**
- ✅ Error appears in AuthToast (animated toast at top)
- ✅ Error also appears inline below the form
- ✅ User stays on Login screen (does NOT navigate)
- ✅ Console shows: `❌ Login failed: [error object]`

**Error Code:** `auth/user-not-found`

**If it doesn't work:**
- Check that error handling code is correct
- Verify `getAuthErrorInfo()` is mapping the error correctly
- Check Metro console for the actual error

---

### Test 3: Login with Wrong Password ❌

**Steps:**
1. On Login screen
2. Enter email: `syedhamzahabib2004@gmail.com`
3. Enter password: `wrongpassword123` (incorrect password)
4. Tap "Sign In" button

**Expected Results:**
- ❌ Error message appears
- ✅ Error message says: **"The password you entered is incorrect."** OR **"The email or password is incorrect."**
- ✅ Error appears in AuthToast
- ✅ User stays on Login screen
- ✅ Console shows: `❌ Login failed: [error object]`

**Error Code:** `auth/wrong-password` or `auth/invalid-credential`

---

### Test 4: Login with Empty Fields ❌

**Steps:**
1. On Login screen
2. Leave email and password empty
3. Tap "Sign In" button

**Expected Results:**
- ❌ Error message appears
- ✅ Error message says: **"Email and password are required"**
- ✅ Sign In button is disabled (grayed out)

---

### Test 5: Login with Invalid Email Format ❌

**Steps:**
1. On Login screen
2. Enter email: `notanemail` (no @ symbol)
3. Enter password: `anypassword`
4. Tap "Sign In" button

**Expected Results:**
- ❌ Error message appears
- ✅ Error message says: **"Please enter a valid email address"**

---

## 📊 Expected Error Messages

| Scenario | Error Code | Error Message |
|----------|-----------|---------------|
| Non-existent user | `auth/user-not-found` | "No account found with this email address." |
| Wrong password | `auth/wrong-password` | "The password you entered is incorrect." |
| Invalid credential | `auth/invalid-credential` | "The email or password is incorrect." |
| Empty fields | `validation/required` | "Email and password are required" |
| Invalid email format | `auth/invalid-email` | "Please enter a valid email address." |

---

## 🔍 What to Check in Console

### Successful Login:
```
✅ Login completed successfully
✓ User authenticated: syedhamzahabib2004@gmail.com
```

### Failed Login (Non-existent user):
```
❌ Login failed: [FirebaseError: Firebase: Error (auth/user-not-found)]
🔐 Login Error
Code: auth/user-not-found
Title: Account Not Found
Message: No account found with this email address.
```

### Failed Login (Wrong password):
```
❌ Login failed: [FirebaseError: Firebase: Error (auth/wrong-password)]
🔐 Login Error
Code: auth/wrong-password
Title: Incorrect Password
Message: The password you entered is incorrect.
```

---

## 🐛 Troubleshooting

### Issue: Error message not showing
- Check that `AuthToast` component is rendered
- Verify `showToast` state is being set to `true`
- Check that error object has the correct structure

### Issue: Wrong error message
- Check `src/utils/authErrorHelper.ts` - verify error code mapping
- Check Firebase error code matches expected codes
- Verify `getAuthErrorInfo()` is being called correctly

### Issue: App crashes on login
- Check Metro console for full error stack
- Verify Firebase is properly initialized
- Check network connection

### Issue: Login succeeds but doesn't navigate
- Check `AuthProvider` - verify `onAuthStateChanged` listener
- Check `RootNavigator` - verify navigation logic
- Check console for navigation logs

---

## ✅ Test Checklist

- [ ] **Test 1:** Valid credentials → Successfully logs in
- [ ] **Test 2:** Non-existent email → Shows "No account found" error
- [ ] **Test 3:** Wrong password → Shows "Incorrect password" error
- [ ] **Test 4:** Empty fields → Shows validation error
- [ ] **Test 5:** Invalid email format → Shows format error
- [ ] **Verify:** Error messages are user-friendly
- [ ] **Verify:** AuthToast appears and animates correctly
- [ ] **Verify:** User stays on login screen when error occurs
- [ ] **Verify:** Console logs show correct error information

---

## 📝 Notes

- All error handling is implemented in `src/screens/LoginScreen.tsx`
- Error messages are formatted by `src/utils/authErrorHelper.ts`
- Errors are displayed via `AuthToast` component (animated toast)
- Errors are also shown inline below the form
- Firebase automatically rejects non-existent users
- The app correctly catches and displays these errors

---

**Ready to test!** 🚀

Follow the steps above to verify login works correctly with both valid and invalid credentials.

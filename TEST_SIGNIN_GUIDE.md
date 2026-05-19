# Test Sign-In Guide - iOS Simulator vs Physical iPhone

## 🎯 Which Should You Use?

### **iOS Simulator** (Recommended for Quick Testing)
✅ **Pros:**
- Faster to set up and run
- No code signing issues
- Quick iteration for testing
- Perfect for testing sign-in flow

❌ **Cons:**
- Some features may not work (push notifications, Apple Sign-In)
- Not real device performance

### **Physical iPhone** (Best for Complete Testing)
✅ **Pros:**
- Real device testing
- All features work (push notifications, etc.)
- Better performance testing
- Closer to production experience

❌ **Cons:**
- Requires code signing setup
- Slightly slower build process
- Need to connect device

---

## 🚀 Option 1: iOS Simulator (Quick Test)

### Step 1: Start Metro Bundler
```bash
cd /Users/hamza/Assignmint3
npm start
```
**Wait for Metro to show:** `Metro waiting on...`

### Step 2: Run on Simulator (New Terminal)
Open a **new terminal window** and run:
```bash
cd /Users/hamza/Assignmint3
npm run ios
```

This will:
- Open iOS Simulator
- Build the app
- Install and launch automatically

### Step 3: Test Sign-In
1. **App opens** → You'll see the Landing screen
2. **Tap "Log In"** or "Sign In" button
3. **Enter credentials:**
   - Email: `syedhamzahabib2004@gmail.com`
   - Password: `hamza123`
4. **Tap "Sign In"**
5. **Should navigate to Home screen** if successful!

---

## 📱 Option 2: Physical iPhone (Complete Test)

### Step 1: Connect Your iPhone
1. Connect iPhone to Mac via USB
2. **Trust the computer** on iPhone if prompted
3. **Unlock your iPhone**

### Step 2: Start Metro Bundler
```bash
cd /Users/hamza/Assignmint3
npm start
```
**Wait for Metro to show:** `Metro waiting on...`

### Step 3: Run on iPhone (New Terminal)
Open a **new terminal window** and run:
```bash
cd /Users/hamza/Assignmint3
npx react-native run-ios --device "Syed Hamza's iPhone"
```

**OR** if that doesn't work, use Xcode:
```bash
open ios/Assignmint.xcworkspace
```
Then in Xcode:
1. Select your iPhone from device dropdown (top toolbar)
2. Click **Play button (▶️)** or press `Cmd+R`

### Step 4: Test Sign-In
Same as Simulator steps above!

---

## 🧪 Testing Checklist

After the app launches, test sign-in:

### ✅ Sign-In Test
- [ ] App opens to Landing screen
- [ ] Tap "Log In" or "Sign In"
- [ ] Enter email: `syedhamzahabib2004@gmail.com`
- [ ] Enter password: `hamza123`
- [ ] Tap "Sign In" button
- [ ] **Success:** Navigates to Home screen
- [ ] **Success:** User email shows in app (if debug info is visible)

### ✅ Sign-Up Test (Optional)
- [ ] Tap "Sign Up" or "Create Account"
- [ ] Fill in form with NEW email
- [ ] Tap "Create Account"
- [ ] Check Firebase Console → Authentication → Users
- [ ] New user should appear!

---

## 🐛 Troubleshooting

### Metro Not Starting
```bash
# Kill any existing Metro processes
pkill -f "react-native start"
pkill -f "node.*8081"

# Start fresh
npm start --reset-cache
```

### Simulator Not Opening
```bash
# List available simulators
xcrun simctl list devices

# Run on specific simulator
npx react-native run-ios --simulator="iPhone 16"
```

### Build Errors
```bash
# Clean and rebuild
cd ios
rm -rf build Pods Podfile.lock
pod install
cd ..
npm run ios
```

### Device Not Found
```bash
# List connected devices
xcrun xctrace list devices

# Use device ID instead of name
npx react-native run-ios --device "00008120-0009246214A0C01E"
```

### Sign-In Not Working
1. **Check console logs** in Metro terminal for errors
2. **Verify Email/Password is enabled** in Firebase Console → Authentication → Sign-in method
3. **Check network connection** (app needs internet for Firebase)
4. **Verify credentials** are correct:
   - Email: `syedhamzahabib2004@gmail.com`
   - Password: `hamza123`

---

## 📊 What to Look For

### Success Indicators:
✅ App navigates to Home screen after sign-in
✅ No error messages in app
✅ Console logs show: `✅ Login completed successfully`
✅ User email appears in Firebase Console → Authentication → Users
✅ "Last Sign In" timestamp updates in Firebase Console

### Error Indicators:
❌ Error message in app (check what it says)
❌ Stays on login screen
❌ Console shows authentication errors
❌ "Invalid email or password" message

---

## 🎯 Quick Start (Recommended)

**For fastest testing, use iOS Simulator:**

```bash
# Terminal 1: Start Metro
cd /Users/hamza/Assignmint3
npm start

# Terminal 2: Run on Simulator (wait for Metro to start first!)
cd /Users/hamza/Assignmint3
npm run ios
```

Then test sign-in with:
- Email: `syedhamzahabib2004@gmail.com`
- Password: `hamza123`

---

## 💡 Pro Tips

1. **Keep Metro running** - Don't close the Metro terminal while testing
2. **Use two terminals** - One for Metro, one for running the app
3. **Check Metro logs** - They show helpful debug info
4. **Refresh app** - Shake device/simulator → "Reload" to refresh
5. **Check Firebase Console** - Verify user appears after sign-in

---

## 🎉 Next Steps After Successful Sign-In

Once sign-in works:
1. ✅ Test sign-up with a new email
2. ✅ Test logout
3. ✅ Test guest mode
4. ✅ Test app navigation
5. ✅ Test posting a task

Good luck! 🚀


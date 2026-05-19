# Quick Reference - Backend Testing Commands

## 🚀 Fast Commands (No Simulator Needed!)

```bash
# Test chat messages with persistence (10 sec)
npm run test:firebase:messages

# Test tasks CRUD with persistence (10 sec)  
npm run test:firebase:tasks

# Test database connection (5 sec)
npm run test:firebase:connection

# Test everything (30 sec)
npm run test:firebase
```

## 📖 Documentation

```bash
# Quick start
cat README_QUICK_START.md

# Complete guide
cat BACKEND_TESTING_GUIDE.md

# Full status
cat CURRENT_STATUS.md

# Summary
cat SUMMARY.md
```

## 🔧 Simulator Commands (Use After Backend Tests Pass)

```bash
# Shutdown all simulators (fixes boot error)
xcrun simctl shutdown all

# Start Metro bundler
npm start

# Run iOS (after Metro is ready)
npm run ios
```

## 💡 Recommended Workflow

1. **Test backend first** (10 sec):
   ```bash
   npm run test:firebase:messages
   ```

2. **Verify persistence** - Tests do this automatically!

3. **Build UI** - Now you know it works

4. **Run simulator** - Only when ready:
   ```bash
   npm run ios
   ```

## 🎯 Result

**100X faster testing!**  
10 seconds instead of 10+ minutes 🚀

---

Run this now: `npm run test:firebase:messages`

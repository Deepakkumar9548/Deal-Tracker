# 🔧 Troubleshooting Guide

## Frontend Issues

### ❌ "No records appear after saving"

**Symptoms:**
- Clicked "✅ Save Deal"
- Success message showed
- Redirected to Records
- But table is empty

**Diagnosis:**
```
Check browser console (F12 → Console)
Look for red error messages
```

**Solutions:**

1. **Backend not running?**
   ```bash
   # Check backend is running
   curl http://localhost:5000
   
   # If fails, start backend:
   cd backend
   node server.js
   ```

2. **MongoDB not connected?**
   ```bash
   # Start MongoDB
   mongod
   
   # Check backend logs for "MongoDB Connected ✅"
   ```

3. **Firewall blocking localhost?**
   ```bash
   # Try explicit localhost
   # Update frontend API_BASE_URL:
   const API_BASE_URL = 'http://127.0.0.1:5000/api/deals';
   ```

4. **CORS Error?**
   ```javascript
   // Already configured in backend!
   // But if issues, check server.js has:
   app.use(cors());
   
   // OR with options:
   app.use(cors({
     origin: 'http://localhost:8000'
   }));
   ```

---

### ❌ "Loading indicator stuck"

**Symptoms:**
- Click save
- See "⏳ Loading..." forever
- Nothing happens

**Diagnosis:**
1. Open DevTools (F12 → Network tab)
2. Perform action (save/edit/delete)
3. Look at network requests
4. Check response status

**Solutions:**

1. **Backend crashed?**
   ```bash
   # Terminal shows connection refused?
   # Restart backend:
   cd backend
   npm install --save-dev nodemon  # If not installed
   npm start
   ```

2. **Long processing time?**
   ```
   - Could be large dataset
   - Could be slow MongoDB
   - Wait 30 seconds before giving up
   ```

3. **Request timeout?**
   ```javascript
   // Add timeout to fetch calls
   const timeoutPromise = new Promise((_, reject) =>
     setTimeout(() => reject(new Error('Timeout')), 10000)
   );
   
   Promise.race([fetch(...), timeoutPromise])
   ```

---

### ❌ "Edit button doesn't work"

**Symptoms:**
- Click row in Records table
- Nothing happens
- Form doesn't load

**Solutions:**

1. **Didn't click on table row?**
   ```
   - Make sure you click ON the row
   - Not on the 🗑 delete button
   - Click anywhere in the middle
   ```

2. **Form already editing?**
   ```javascript
   // Clear form first:
   // Click "🗑 Clear Form" button
   // Then try clicking record again
   ```

3. **Deal not found?**
   ```javascript
   // In browser console, check:
   console.log(DB); // See if deals exist
   
   // If empty, click Records tab first
   // To ensure data is fetched
   ```

---

### ❌ "Delete not working / Confirmation not showing"

**Symptoms:**
- Click 🗑 button
- Nothing happens
- OR: Confirmation appears but delete fails

**Solutions:**

1. **Check confirmation dialog**
   ```javascript
   // Make sure you click "OK" to confirm
   // If you click "Cancel", nothing happens (that's correct!)
   ```

2. **Permission denied?**
   ```bash
   # Check backend logs for 403/401 errors
   # Ensure database has write permissions
   ```

3. **Deal ID issue?**
   ```javascript
   // Check browser console:
   console.log('Deleting deal:', dealId);
   
   // Make sure dealId is not undefined
   ```

---

## Backend Issues

### ❌ "MongoDB Connection Failed"

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**

1. **MongoDB not running?**
   ```bash
   # Windows - Start MongoDB
   net start MongoDB
   # OR run mongod in new terminal
   mongod
   
   # Mac
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

2. **Wrong connection string?**
   ```javascript
   // Check config/db.js
   // Should be:
   mongoose.connect('mongodb://127.0.0.1:27017/dealtracker');
   
   // For MongoDB Atlas (cloud):
   mongoose.connect(process.env.MONGODB_URI);
   // Set MONGODB_URI in .env file
   ```

3. **Port already in use?**
   ```bash
   # MongoDB default port: 27017
   # If in use, change port:
   
   # Check what's using it:
   netstat -tuln | grep 27017  # Linux/Mac
   netstat -ano | find "27017"  # Windows
   
   # Change MongoDB port in config
   ```

---

### ❌ "Cannot POST /api/deals"

**Symptoms:**
```
404 Not Found
or
Cannot POST /api/deals
```

**Solutions:**

1. **Routes not loaded?**
   ```javascript
   // Check server.js has:
   app.use("/api/deals", require("./routes/dealRoutes"));
   ```

2. **Route path wrong?**
   ```javascript
   // Check dealRoutes.js has:
   router.post("/", createDeal);  // This becomes /api/deals
   router.get("/", getDeals);
   router.put("/:id", updateDeal);
   router.delete("/:id", deleteDeal);
   ```

3. **Server not restarted?**
   ```bash
   # After changing code, restart:
   node server.js
   
   # Or use nodemon for auto-restart:
   npm install -g nodemon
   nodemon server.js
   ```

---

### ❌ "CORS Error in browser"

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**

1. **CORS not enabled?**
   ```javascript
   // server.js should have:
   const cors = require("cors");
   app.use(cors());
   ```

2. **Request origin blocked?**
   ```javascript
   // If needed, specify allowed origins:
   app.use(cors({
     origin: ['http://localhost:8000', 'http://localhost:3000'],
     credentials: true
   }));
   ```

3. **Frontend URL wrong?**
   ```javascript
   // In frontend, check:
   const API_BASE_URL = 'http://localhost:5000/api/deals';
   
   // Should match backend's ALLOWED_ORIGIN
   ```

---

### ❌ "Validation error: Customer name required"

**Symptoms:**
```json
{
  "message": "Customer name required"
}
```

**Solutions:**

1. **Form data not sent?**
   ```javascript
   // Ensure form field exists:
   g('f-cname') // Should exist in HTML
   
   // Check value is not empty:
   const cname = gv('f-cname');
   console.log('cname:', cname); // Should not be empty
   ```

2. **API not receiving data?**
   ```javascript
   // Log what's being sent:
   const formData = getFormData();
   console.log('Sending:', formData);
   console.log('Customer name:', formData.cname);
   ```

---

## Network Issues

### ❌ "Request blocked / No response"

**Debug steps:**

1. **Open DevTools Network Tab**
   ```
   F12 → Network tab → Refresh page
   Perform action (save/delete)
   Look at list of requests
   ```

2. **Check Request**
   - Click on the request (e.g., deals)
   - See Headers tab - check method (POST/PUT/DELETE)
   - Check Request payload - see sent data
   - Check Status code - should be 200, 201, etc.

3. **Check Response**
   - Click Response tab
   - See what server sent back
   - Red status code? Backend error
   - No response? Server didn't respond

4. **Check Timing**
   - Click Timing tab
   - How long did request take?
   - Normal: < 1 second
   - Slow: 5+ seconds = server issue

---

## Database Issues

### ❌ "Deals saved but don't persist"

**Symptoms:**
- Save deal successfully
- Next page load - deal gone
- MongoDB not saving

**Solutions:**

1. **Check MongoDB is actually running**
   ```bash
   mongosh  # Connect to MongoDB
   use dealtracker
   db.deals.find()  # See saved deals
   ```

2. **Check connection**
   ```javascript
   // Backend should log:
   // "MongoDB Connected ✅"
   
   // If not, check config/db.js
   ```

3. **Check model**
   ```javascript
   // models/dealModel.js should have schema
   // All fields should be defined
   ```

---

## Browser/Cache Issues

### ❌ "Changes don't show up"

**Symptoms:**
- Edit/delete/create but changes not visible
- Old data still showing

**Solutions:**

1. **Hard refresh**
   ```
   Ctrl + Shift + R (Windows)
   Cmd + Shift + R (Mac)
   
   Clears cache and reloads
   ```

2. **Clear browser cache**
   ```
   F12 → Application → Cache Storage
   Delete all cache entries
   Refresh page
   ```

3. **Check localStorage is gone**
   ```javascript
   // Open console (F12 → Console)
   localStorage.getItem('dealTrackDB')
   // Should return null (not an array!)
   ```

---

## Performance Issues

### ⚠️ "App running slow"

**Solutions:**

1. **Too many records?**
   ```bash
   # Check database size
   mongosh
   use dealtracker
   db.deals.count()  # How many records?
   
   # If > 10,000, implement pagination
   ```

2. **Slow network?**
   ```
   Check Network tab (F12)
   How long do requests take?
   If > 5 seconds, issue with server/database
   ```

3. **Memory leak?**
   ```
   Refresh page if app gets slower over time
   Check for infinite loops in console
   ```

---

## Testing Commands

### Verify Backend is Working

```bash
# 1. Check backend server
curl http://localhost:5000

# Should return:
# {"status":"API Running 🚀"}

# 2. Get all deals
curl http://localhost:5000/api/deals

# Should return JSON array (even if empty: [])

# 3. Check MongoDB
mongosh
use dealtracker
db.deals.find()

# Should show collections
```

### Test from Frontend Console

```javascript
// Open F12 → Console, paste:

// Test fetch
fetch('http://localhost:5000/api/deals')
  .then(r => r.json())
  .then(d => console.log('Deals:', d))
  .catch(e => console.error('Error:', e));

// Should show deals in console or error
```

---

## When All Else Fails

### Nuclear Reset

```bash
# 1. Stop everything
# - Close browser
# - Stop backend (Ctrl+C in terminal)
# - Stop MongoDB (mongod terminal)

# 2. Clear data
# - Delete MongoDB data (risky! backs up first)
# - Clear browser cache (F12 → Application → Clear all)

# 3. Restart
mongod
cd backend
npm install
node server.js

# 4. Open fresh browser window
# https://localhost:8000/frontend/index.html

# 5. Try creating new record
```

---

## Getting Help

If stuck:

1. **Check console errors** (F12 → Console) - copy full error message
2. **Check network requests** (F12 → Network) - what status codes?
3. **Check backend logs** - any error messages?
4. **Check MongoDB** - `mongosh` and explore data
5. **Provide error message** - exact text helps identify issue

---

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| No records | Refresh page, check backend running |
| Edit fails | Click on table row, not button |
| Delete fails | Press "OK" on confirmation |
| Save stuck | Check MongoDB running |
| CORS error | Ensure backend has `cors()` |
| Loading forever | Backend crashed? Restart |
| No success msg | Check browser notifications |
| Old data showing | Hard refresh (Ctrl+Shift+R) |

---

**Still stuck? Add debugging to your code and check outputs! 🔍**

# Quick Start Guide - Background Job System

## Testing the Implementation

### 1. Start the Backend Server
```bash
cd server
npm run dev
```

Expected output:
```
🚀 Server running on http://localhost:3000
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v... ready in ...ms
➜  Local:   http://localhost:5173/
```

### 3. Test the Flow

#### Step 1: Login
1. Open http://localhost:5173
2. Login with your credentials
3. Navigate to "Meal Plan" page

#### Step 2: Generate Meal Plan
1. Fill in the meal plan form
2. Click "Generate Meal Plan"
3. **Observe**: Banner appears in top-right corner within 1 second
4. **Message**: "We're preparing your page in the background..."

#### Step 3: Navigate Away
1. While banner is showing, click on "Chat" or "Progress" in navbar
2. **Observe**: Banner follows you to new page
3. **Observe**: Progress bar updates (10% → 20% → 30%...)

#### Step 4: Wait for Completion
1. Wait 2-3 minutes (this is the actual meal generation time)
2. **Observe**: Banner turns green
3. **Message**: "✨ Your Meal Plan is Ready!"
4. **Observe**: "View Meal Plan →" button appears

#### Step 5: View Results
1. Click "View Meal Plan →" button
2. **Observe**: Redirected to meal plan page
3. **Observe**: Meal plan is loaded and displayed
4. **Observe**: Banner disappears

## API Testing with cURL

### Test Job Creation
```bash
curl -X POST http://localhost:3000/api/meals/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "regions": ["north-indian"],
    "cuisines": ["North Indian"],
    "dietType": "vegetarian",
    "budget": 200,
    "mealsPerDay": "3",
    "duration": "3",
    "restrictions": [],
    "healthContext": {},
    "userOverrides": {}
  }'
```

Expected response (immediate):
```json
{
  "success": true,
  "data": {
    "jobId": "meal-generation_test-user-123_1234567890",
    "status": "pending",
    "message": "Meal plan generation started. You can navigate away - we'll notify you when it's ready."
  }
}
```

### Check Job Status
```bash
# Replace JOB_ID with the jobId from above
curl http://localhost:3000/api/jobs/JOB_ID
```

Expected response (while processing):
```json
{
  "success": true,
  "data": {
    "id": "meal-generation_test-user-123_1234567890",
    "type": "meal-generation",
    "userId": "test-user-123",
    "status": "processing",
    "progress": 30,
    "metadata": {
      "progressMessage": "Generating personalized meal plan with AI..."
    }
  }
}
```

Expected response (completed):
```json
{
  "success": true,
  "data": {
    "id": "meal-generation_test-user-123_1234567890",
    "type": "meal-generation",
    "userId": "test-user-123",
    "status": "completed",
    "progress": 100,
    "result": {
      "planId": "plan_1234567890",
      "plan": { /* full meal plan data */ }
    }
  }
}
```

## Troubleshooting

### Banner Doesn't Appear
**Problem**: No banner shows after clicking "Generate Meal Plan"

**Check**:
1. Open browser console (F12)
2. Look for: `✅ Background job created: meal-generation_...`
3. If missing, check network tab for `/api/meals/generate` response

**Fix**: Ensure backend returns `jobId` in response

### Banner Doesn't Update
**Problem**: Banner stuck at 0% or old status

**Check**:
1. Open browser console
2. Look for errors in polling: `Failed to poll job status`
3. Check network tab for `/api/jobs/:jobId` requests every 3 seconds

**Fix**: Ensure backend job routes are working

### Meal Plan Doesn't Load
**Problem**: Success notification shows but clicking doesn't load plan

**Check**:
1. Open browser console
2. Look for: `✅ Loading meal plan from completed job`
3. Check if `job.result.plan` exists

**Fix**: Ensure background processor stores result correctly

### Jobs Disappear on Refresh
**Problem**: Page refresh clears jobs

**Expected**: This is normal! Jobs are stored in localStorage
**Solution**: 
- Check localStorage in DevTools → Application → Local Storage
- Look for `job-storage` key
- If missing, jobs weren't persisted

## Console Logs to Watch

### Frontend (Browser Console)
```
✅ Background job created: meal-generation_...
✅ Loading meal plan from completed job: meal-generation_...
```

### Backend (Terminal)
```
[MealPlanRoutes] Access control passed - creating background job for meal plan
[JobService] Job created { jobId: 'meal-generation_...', type: 'meal-generation' }
[JobService] Job updated { jobId: '...', status: 'processing', progress: 30 }
[MealPlanRoutes] Job completed successfully { jobId: '...', planId: '...' }
```

## Known Limitations

1. **In-Memory Storage**: Jobs reset on server restart
   - **Impact**: Users lose job tracking if server restarts
   - **Solution**: Upgrade to Redis for production

2. **No Push Notifications**: Relies on polling, not push
   - **Impact**: No notifications if browser is closed
   - **Solution**: Add Firebase Cloud Messaging (optional)

3. **Single User Testing**: Concurrent jobs may overlap in console logs
   - **Impact**: Hard to debug multiple users
   - **Solution**: Add user filtering in logs

## Next Steps

Once basic testing works:

1. **Load Testing**
   - Generate multiple meal plans simultaneously
   - Verify job queue handles concurrency
   - Monitor server resource usage

2. **Error Simulation**
   - Force job failures (invalid cuisine)
   - Verify red error banner appears
   - Check error messages are user-friendly

3. **Persistence Testing**
   - Start job, close browser tab
   - Reopen and check if job continues
   - Verify completed jobs persist

4. **Production Readiness**
   - Migrate job storage to Redis
   - Add job expiration (TTL)
   - Implement retry logic
   - Add monitoring/alerting

## Success Indicators

✅ Response time < 1 second  
✅ Banner appears immediately  
✅ User can navigate freely  
✅ Progress updates every 3 seconds  
✅ Completion notification shows  
✅ Meal plan loads correctly  
✅ No errors in console  

---

**Happy Testing! 🎉**

# Quick Fix for Login Error

## Problem
Your Vercel frontend is trying to connect to `localhost:5000` which doesn't exist in production.

## Solution Options

### Option A: You Already Have Backend Deployed

If your backend is already running somewhere:

1. **Get your backend URL** (e.g., Railway, Render, Heroku)
2. **Go to Vercel Dashboard**:
   - Select your project
   - Go to **Settings** → **Environment Variables**
   - Add new variable:
     ```
     Name: VITE_API_URL
     Value: https://your-backend-url.com/api
     ```
   - Select all environments (Production, Preview, Development)
   - Click **Save**
3. **Redeploy**:
   - Go to **Deployments** tab
   - Click ⋯ on latest deployment
   - Click **Redeploy**
4. **Test login** on your Vercel URL

### Option B: Backend Not Deployed Yet

You need to deploy the backend first. Follow these steps:

1. **Deploy to Railway** (easiest, 5 minutes):
   - Go to https://railway.app
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Configure:
     - Root Directory: `backend`
     - Start Command: `node server.js`
   - Add environment variables (see BACKEND_DEPLOYMENT.md)
   - Get the Railway URL

2. **Update Frontend**:
   - Edit `frontend/src/api/axios.js`
   - Replace `'https://your-backend-url.railway.app/api'`
   - With your actual Railway URL
   - Commit and push

3. **Vercel will auto-redeploy**

### Option C: Quick Local Test

To verify the issue is just the backend URL:

1. **Run backend locally**:
   ```bash
   cd backend
   npm install
   node server.js
   ```

2. **Test frontend locally**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Try login** at http://localhost:5173

If it works locally, the issue is definitely the backend URL in production.

## Current Code Status

Your `frontend/src/api/axios.js` now has this logic:

```javascript
const getApiUrl = () => {
    // 1. Check for environment variable (set in Vercel)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    
    // 2. In production, use hardcoded backend URL
    if (import.meta.env.PROD) {
        return 'https://your-backend-url.railway.app/api'; // ← UPDATE THIS
    }
    
    // 3. In development, use localhost
    return 'http://localhost:5000/api';
};
```

## What You Need to Do

**Choose ONE of these:**

1. **Set VITE_API_URL in Vercel** (recommended)
   - No code changes needed
   - Easy to update later
   - Works across all environments

2. **Hardcode backend URL in axios.js**
   - Update the line with `your-backend-url.railway.app`
   - Commit and push
   - Vercel will redeploy

3. **Deploy backend first**
   - Follow BACKEND_DEPLOYMENT.md
   - Then do option 1 or 2

## Next Steps

1. ✅ Commit current changes:
   ```bash
   git add .
   git commit -m "Fix API URL configuration for production"
   git push origin main
   ```

2. 🚀 Deploy backend (if not done)

3. 🔧 Set environment variable in Vercel OR update axios.js

4. ✨ Test login

## Need Help?

Check these files:
- `BACKEND_DEPLOYMENT.md` - Full backend deployment guide
- `DEPLOYMENT.md` - Complete deployment documentation
- `README.md` - Project overview and setup

## Common Errors

### "Network Error" in browser console
→ Backend URL is wrong or backend is not running

### "CORS Error"
→ Backend CORS_ORIGIN doesn't match your Vercel URL

### "401 Unauthorized"
→ Backend is working! Check credentials or Firebase config

### "Cannot read properties of undefined"
→ Backend response format issue, check backend logs

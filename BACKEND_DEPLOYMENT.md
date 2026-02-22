# Quick Backend Deployment Guide

## 🚀 Deploy Backend to Railway (5 minutes)

### Step 1: Sign up for Railway
1. Go to https://railway.app
2. Sign up with GitHub
3. Authorize Railway to access your repositories

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose `dinaypatil-web/smartcrm`
4. Railway will start deploying

### Step 3: Configure Backend Service
1. Click on the deployed service
2. Go to **Settings** tab
3. Scroll to **Service Settings**
4. Set **Root Directory**: `backend`
5. Set **Start Command**: `node server.js`
6. Click **Save**

### Step 4: Add Environment Variables
1. Go to **Variables** tab
2. Click **"New Variable"** and add each of these:

```
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your_firebase_private_key_with_newlines
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

**Important Notes:**
- For `FIREBASE_PRIVATE_KEY`, wrap it in quotes and keep the `\n` characters
- For `CORS_ORIGIN`, use your actual Vercel URL
- For `MONGODB_URI`, get it from MongoDB Atlas (see below)

### Step 5: Get MongoDB Connection String

If you don't have MongoDB Atlas set up:

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (M0 Free tier)
4. Create database user:
   - Username: `smartcrm_admin`
   - Password: (generate strong password)
5. Add IP: **0.0.0.0/0** (allow from anywhere)
6. Get connection string:
   ```
   mongodb+srv://smartcrm_admin:PASSWORD@cluster0.xxxxx.mongodb.net/smartcrm?retryWrites=true&w=majority
   ```
7. Replace PASSWORD with your actual password

### Step 6: Get Firebase Credentials

1. Go to https://console.firebase.google.com
2. Select your project (or create new one)
3. Go to **Project Settings** → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Download the JSON file
6. Extract these values:
   - `project_id` → FIREBASE_PROJECT_ID
   - `private_key` → FIREBASE_PRIVATE_KEY
   - `client_email` → FIREBASE_CLIENT_EMAIL

### Step 7: Deploy
1. Railway will automatically redeploy after adding variables
2. Wait 2-3 minutes for deployment
3. Click on your service to see the URL
4. Copy the URL (e.g., `https://smartcrm-production.up.railway.app`)

### Step 8: Update Frontend
1. Copy your Railway backend URL
2. Update `frontend/src/api/axios.js`:
   ```javascript
   // Replace this line:
   return 'https://your-backend-url.railway.app/api';
   
   // With your actual URL:
   return 'https://smartcrm-production.up.railway.app/api';
   ```
3. Commit and push:
   ```bash
   git add .
   git commit -m "Update backend URL"
   git push origin main
   ```
4. Vercel will auto-redeploy

### Step 9: Test
1. Go to your Vercel URL
2. Try logging in with:
   - Email: `admin@ayurveda.com`
   - Password: `admin123`

If login still fails, check:
- Railway logs for errors
- Browser console for CORS errors
- Verify CORS_ORIGIN matches your Vercel URL exactly

---

## 🔧 Alternative: Use Environment Variable in Vercel

Instead of hardcoding the backend URL, you can use environment variables:

### In Vercel:
1. Go to your project → **Settings** → **Environment Variables**
2. Add:
   ```
   VITE_API_URL=https://your-railway-url.railway.app/api
   ```
3. Redeploy

### In your code:
The code already supports this! Just make sure the environment variable is set.

---

## ⚡ Quick Test Backend Locally

Before deploying, test if backend works:

```bash
cd backend
npm install
node server.js
```

Should see:
```
✅ Firebase Admin initialized successfully
✅ Firestore DB instance retrieved
🚀 Ayurveda ERP Server running on port 5000
```

---

## 🆘 Troubleshooting

### Backend won't start on Railway
- Check logs in Railway dashboard
- Verify all environment variables are set
- Check MongoDB connection string format

### CORS Error
- Verify CORS_ORIGIN in Railway matches Vercel URL exactly
- Include `https://` in the URL
- Don't include trailing slash

### MongoDB Connection Failed
- Check IP whitelist (should be 0.0.0.0/0)
- Verify username/password in connection string
- Ensure database user has read/write permissions

### Firebase Error
- Check all three Firebase variables are set
- Verify private key format (should have \n for newlines)
- Wrap private key in double quotes

---

## 📝 Checklist

- [ ] Railway account created
- [ ] Backend deployed to Railway
- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] IP whitelist configured
- [ ] Firebase project created
- [ ] Service account key downloaded
- [ ] All environment variables added to Railway
- [ ] Backend URL copied
- [ ] Frontend updated with backend URL
- [ ] Changes committed and pushed
- [ ] Vercel redeployed
- [ ] Login tested successfully

---

**Once backend is deployed, your login will work! 🎉**

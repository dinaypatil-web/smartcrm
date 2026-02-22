# Deployment Guide - SmartCRM

Complete guide for deploying SmartCRM to production environments.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Backend Deployment (Railway)](#backend-deployment-railway)
4. [Database Setup (MongoDB Atlas)](#database-setup-mongodb-atlas)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment Steps](#post-deployment-steps)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account with repository access
- ✅ Vercel account (for frontend)
- ✅ Railway/Render/Heroku account (for backend)
- ✅ MongoDB Atlas account (for database)
- ✅ Firebase project with Admin SDK
- ✅ All environment variables ready

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Repository

Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository: `dinaypatil-web/smartcrm`
4. Click **"Import"**

### Step 3: Configure Build Settings

**IMPORTANT**: Configure these settings before deploying:

- **Framework Preset**: `Vite`
- **Root Directory**: `frontend` ⚠️ (Click "Edit" and select frontend folder)
- **Build Command**: `npm run build` (default is fine)
- **Output Directory**: `dist` (default is fine)
- **Install Command**: `npm install` (default is fine)

### Step 4: Environment Variables (Optional)

If your frontend needs environment variables:

1. Go to **Settings** → **Environment Variables**
2. Add variables:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   ```

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Your app will be live at: `https://your-project.vercel.app`

### Step 6: Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## Backend Deployment (Railway)

### Option A: Railway (Recommended)

#### Step 1: Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `dinaypatil-web/smartcrm`

#### Step 2: Configure Service

1. Click on the deployed service
2. Go to **Settings**
3. Set **Root Directory**: `backend`
4. Set **Start Command**: `node server.js`

#### Step 3: Add Environment Variables

Go to **Variables** tab and add:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smartcrm
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
CORS_ORIGIN=https://your-frontend.vercel.app
```

#### Step 4: Deploy

1. Railway will auto-deploy
2. Get your backend URL: `https://your-app.railway.app`
3. Update frontend API URL to point to this

### Option B: Render

1. Go to [Render Dashboard](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository
4. Configure:
   - **Name**: smartcrm-backend
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add environment variables (same as Railway)
6. Click **"Create Web Service"**

### Option C: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create smartcrm-backend

# Set buildpack
heroku buildpacks:set heroku/nodejs

# Set root directory
echo "backend" > .heroku-root

# Add environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret
# ... add all other variables

# Deploy
git subtree push --prefix backend heroku main
```

---

## Database Setup (MongoDB Atlas)

### Step 1: Create Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Build a Database"**
3. Choose **"Shared"** (Free tier)
4. Select region closest to your backend
5. Click **"Create Cluster"**

### Step 2: Create Database User

1. Go to **Database Access**
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `smartcrm_admin`
5. Generate secure password
6. Set role: **"Atlas admin"** or **"Read and write to any database"**
7. Click **"Add User"**

### Step 3: Configure Network Access

1. Go to **Network Access**
2. Click **"Add IP Address"**
3. Choose **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Or add specific IPs of your backend servers
4. Click **"Confirm"**

### Step 4: Get Connection String

1. Go to **Database** → **Connect**
2. Choose **"Connect your application"**
3. Copy connection string:
   ```
   mongodb+srv://smartcrm_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add database name: `/smartcrm` before the `?`
   ```
   mongodb+srv://smartcrm_admin:password@cluster0.xxxxx.mongodb.net/smartcrm?retryWrites=true&w=majority
   ```

### Step 5: Seed Database (Optional)

Run seed script from your local machine:
```bash
cd backend
node seed/seedAdmin.js
```

---

## Environment Variables

### Backend Environment Variables

Create these in your backend hosting platform:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smartcrm?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nMultiline\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# CORS
CORS_ORIGIN=https://your-frontend-domain.vercel.app

# Optional
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
```

### Frontend Environment Variables (Optional)

If needed, create in Vercel:

```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

---

## Post-Deployment Steps

### 1. Update Frontend API URL

Update `frontend/src/api/axios.js`:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'https://your-backend.railway.app/api';
```

Commit and push:
```bash
git add .
git commit -m "Update API URL for production"
git push origin main
```

Vercel will auto-redeploy.

### 2. Test Authentication

1. Visit your frontend URL
2. Try logging in with default credentials:
   - Email: `admin@ayurveda.com`
   - Password: `admin123`
3. If login fails, check:
   - Backend logs
   - CORS settings
   - Firebase configuration

### 3. Create Admin User

If seed didn't run, create admin manually:

```bash
# SSH into your backend or run locally
cd backend
node seed/seedAdmin.js
```

### 4. Configure CORS

Ensure backend allows your frontend domain:

In `backend/server.js`:
```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://your-frontend.vercel.app',
  credentials: true
};
app.use(cors(corsOptions));
```

### 5. Set Up Monitoring

- Enable error tracking (Sentry, LogRocket)
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure backup schedules for MongoDB

---

## Troubleshooting

### Frontend Issues

#### 404 Error on Routes
**Problem**: Direct URL access shows 404

**Solution**: Ensure `vercel.json` has rewrites:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### Build Failed - Exit Code 126
**Problem**: Build command not executable

**Solution**: 
1. Set Root Directory to `frontend` in Vercel settings
2. Use default Vite build commands
3. Don't use `cd` commands in build scripts

#### API Calls Failing
**Problem**: CORS or network errors

**Solution**:
1. Check API URL in axios config
2. Verify CORS_ORIGIN in backend
3. Check browser console for errors

### Backend Issues

#### MongoDB Connection Failed
**Problem**: Can't connect to database

**Solution**:
1. Check MongoDB Atlas IP whitelist
2. Verify connection string format
3. Ensure password doesn't have special characters (URL encode if needed)
4. Check database user permissions

#### Firebase Authentication Error
**Problem**: Firebase Admin SDK initialization failed

**Solution**:
1. Verify all three Firebase env variables are set
2. Check private key format (must include `\n` for newlines)
3. Ensure service account has correct permissions
4. Wrap private key in quotes: `"-----BEGIN..."`

#### Port Already in Use
**Problem**: Backend won't start

**Solution**:
```bash
# Find process using port
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

#### Environment Variables Not Loading
**Problem**: Backend can't read env vars

**Solution**:
1. Check variable names (case-sensitive)
2. Restart backend service after adding vars
3. Use platform's CLI to verify: `railway variables` or `heroku config`

### Database Issues

#### Seed Script Fails
**Problem**: Can't create admin user

**Solution**:
```bash
# Check MongoDB connection
node backend/config/db.js

# Run seed with verbose logging
DEBUG=* node backend/seed/seedAdmin.js
```

#### Data Not Persisting
**Problem**: Changes don't save

**Solution**:
1. Check MongoDB Atlas cluster status
2. Verify write permissions for database user
3. Check backend logs for errors
4. Ensure connection string includes database name

---

## Performance Optimization

### Frontend
- Enable Vercel Analytics
- Configure caching headers
- Optimize images and assets
- Use lazy loading for routes

### Backend
- Enable MongoDB connection pooling
- Add Redis for caching (optional)
- Implement rate limiting
- Use compression middleware

### Database
- Create indexes for frequently queried fields
- Enable MongoDB Atlas auto-scaling
- Set up read replicas for high traffic

---

## Security Checklist

- [ ] All environment variables are set and secure
- [ ] JWT secret is strong (32+ characters)
- [ ] MongoDB user has minimal required permissions
- [ ] CORS is configured for specific domains only
- [ ] Firebase rules are properly configured
- [ ] HTTPS is enabled (automatic on Vercel/Railway)
- [ ] Rate limiting is implemented
- [ ] Input validation is in place
- [ ] Sensitive data is not logged
- [ ] Regular backups are scheduled

---

## Maintenance

### Regular Tasks
- Monitor error logs weekly
- Check database size monthly
- Update dependencies quarterly
- Review security patches
- Backup database regularly

### Scaling
- Upgrade MongoDB cluster as needed
- Scale backend instances on Railway
- Enable CDN for static assets
- Implement caching strategy

---

## Support

If you encounter issues:

1. Check logs in your hosting platform
2. Review this troubleshooting guide
3. Search GitHub issues
4. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Relevant logs

---

**Deployment Complete! 🎉**

Your SmartCRM application should now be live and accessible to users.

# Deployment Guide

## Backend Deployment (Required First!)

Your backend needs to be deployed before the frontend will work. Here are your options:

### Option 1: Deploy Backend to Vercel

1. Create a new Vercel project for the backend
2. Set Root Directory to `backend`
3. Add these environment variables in Vercel:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Your JWT secret key
   - `FIREBASE_PROJECT_ID` - Your Firebase project ID
   - `FIREBASE_PRIVATE_KEY` - Your Firebase private key
   - `FIREBASE_CLIENT_EMAIL` - Your Firebase client email
   - All other env variables from `backend/.env`

4. Deploy the backend

### Option 2: Deploy Backend to Render/Railway/Heroku

Follow their respective deployment guides for Node.js apps.

### Option 3: Use Your Own Server

Deploy the backend to your own server and get the public URL.

## Frontend Deployment

Once your backend is deployed:

1. Go to your Vercel project settings for the frontend
2. Add Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.vercel.app/api` (replace with your actual backend URL)

3. Redeploy the frontend

## Testing

After deployment:
1. Visit your frontend URL
2. Try to login with your credentials
3. If login fails, check:
   - Backend is running and accessible
   - VITE_API_URL is set correctly in Vercel
   - CORS is configured in backend to allow your frontend domain

## CORS Configuration

Make sure your backend `server.js` has CORS configured to allow your frontend domain:

```javascript
const cors = require('cors');
app.use(cors({
    origin: ['https://your-frontend-url.vercel.app', 'http://localhost:5173'],
    credentials: true
}));
```

# Railway Deployment Guide

## Step 1: Sign Up

1. Go to https://railway.app
2. Click "Start a New Project" or "Login"
3. Sign up with **GitHub** (easiest)
4. Authorize Railway
5. **Free tier:** $5 credit, no credit card required

## Step 2: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

## Step 3: Push Code to GitHub (if not already)

```bash
cd /Users/adamisom/Desktop/rapid-photo-upload
git remote add origin https://github.com/YOUR_USERNAME/rapid-photo-upload.git
git push -u origin main
```

## Step 4: Deploy Backend via Railway Dashboard (Easiest Method)

### Option A: Dashboard Deployment (Recommended)

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Select your `rapid-photo-upload` repository
5. Railway will ask which service to deploy
   - Set **Root Directory:** `backend`
   - Railway auto-detects Maven and Spring Boot!

6. Click **"Add PostgreSQL"** from the project dashboard
   - Railway automatically creates database and sets `DATABASE_URL`

7. **Set Environment Variables:**
   - Click on your backend service
   - Go to **"Variables"** tab
   - Add these variables:

```
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-change-in-production
AWS_REGION=us-east-1
AWS_S3_BUCKET=rapidphotoupload-adamisom
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
```

8. **Deploy!**
   - Railway will automatically build and deploy
   - Wait 3-5 minutes for build
   - You'll get a URL like: `https://backend-production-xxxx.up.railway.app`

9. **Enable Public URL:**
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"**
   - Copy the public URL

### Option B: CLI Deployment

```bash
cd backend

# Login
railway login

# Create new project
railway init

# Link to Railway project
railway link

# Add PostgreSQL
railway add

# Set environment variables
railway variables set JWT_SECRET="your-secret-key-here"
railway variables set AWS_REGION="us-east-1"
railway variables set AWS_S3_BUCKET="rapidphotoupload-adamisom"
railway variables set AWS_ACCESS_KEY_ID="your-key"
railway variables set AWS_SECRET_ACCESS_KEY="your-secret"

# Deploy
railway up

# Get the public URL
railway domain
```

## Step 5: Test Backend

```bash
# Replace with your Railway URL
curl https://your-app.up.railway.app/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

You should get a JWT token back!

## Step 6: Deploy Web Frontend

### Option 1: Netlify/Vercel (Easiest for React)

**Netlify:**
```bash
cd web
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

**Vercel:**
```bash
cd web
npm install -g vercel
vercel login
vercel --prod
```

Both auto-detect Vite and build correctly!

### Option 2: Railway (Same as backend)

1. Railway Dashboard → Add New Service
2. Deploy from GitHub → Select repo
3. Set **Root Directory:** `web`
4. Set environment variable:
```
VITE_API_BASE_URL=https://your-backend.up.railway.app
```

## Step 7: Update Mobile App

```bash
cd mobile

# Create .env file with Railway backend URL
echo "EXPO_PUBLIC_API_BASE_URL=https://your-backend.up.railway.app" > .env

# Restart Expo
npm start
```

Now mobile will connect to production backend! 🎉

## Step 8: Update CORS (Important!)

Your Railway backend needs to allow requests from:
- Web frontend URL (e.g., `https://your-app.netlify.app`)
- Mobile app (all origins for Expo, or restrict in production)

Update `WebConfig.java`:
```java
registry.addMapping("/**")
    .allowedOrigins(
        "http://localhost:5173",
        "https://your-web-app.netlify.app",  // Add this
        "*"  // For mobile (or restrict to specific Expo domains)
    )
```

## Estimated Costs

**Railway Free Tier:**
- $5 credit/month
- ~500 hours usage
- Should cover small demo/portfolio usage

**After free tier:**
- Backend: ~$5-10/month
- PostgreSQL: ~$5/month
- **Total: $10-15/month**

**Netlify/Vercel (Web):**
- Free tier is generous
- Free HTTPS + CDN

## Monitoring

**Railway Dashboard:**
- View logs
- Monitor CPU/memory
- Check deployment status

**Logs:**
```bash
railway logs
```

## Rollback

```bash
railway rollback
```

## Next Steps After Deployment

1. ✅ Test all endpoints
2. ✅ Test file uploads (S3)
3. ✅ Test mobile app login/upload
4. ✅ Update README with production URLs
5. ✅ Add deployment status badges

---

**Ready to deploy?** Start with Step 1 (sign up) and let me know when you're ready for Step 4!


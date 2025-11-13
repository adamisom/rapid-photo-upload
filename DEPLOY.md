# Deployment Guide

Quick deployment commands and setup for Railway production environment.

## Quick Deploy (If Auto-Deploy Enabled)

```bash
# Push to trigger auto-deploy
git push origin main
```

Railway will automatically build and deploy both backend and frontend services.

## Manual Railway CLI Deploy

### Prerequisites

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
```

### Backend Deployment

```bash
cd backend
railway link  # Link to existing project (or railway init for new)
railway up
```

### Frontend Deployment

```bash
cd web
railway link  # Link to existing project
railway up
```

## Environment Variables

### Backend (Railway Dashboard → Variables)

**Required:**
- `JWT_SECRET` - Minimum 32 characters (64+ recommended for HS512)
- `AWS_REGION` - e.g., `us-east-2`
- `AWS_S3_BUCKET` - Your S3 bucket name
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

**Auto-set by Railway:**
- `DATABASE_URL` - Automatically set when PostgreSQL is added

### Frontend (Railway Dashboard → Variables)

**Required:**
- `VITE_API_BASE_URL` - Backend API URL (e.g., `https://rapid-photo-upload-production.up.railway.app`)

## Initial Setup (First Time)

### 1. Backend Service

1. Railway Dashboard → New Project → Deploy from GitHub
2. Select repository → Set **Root Directory:** `backend`
3. Add PostgreSQL service (auto-sets `DATABASE_URL`)
4. Set environment variables (see above)
5. Enable public domain: Settings → Networking → Generate Domain

### 2. Frontend Service

1. Railway Dashboard → Add New Service → Deploy from GitHub
2. Select same repository → Set **Root Directory:** `web`
3. Set `VITE_API_BASE_URL` to your backend URL
4. Enable public domain: Settings → Networking → Generate Domain

## Verify Deployment

```bash
# Backend health check
curl https://rapid-photo-upload-production.up.railway.app/actuator/health

# Frontend
open https://web-frontend-rapid-photo-upload-production.up.railway.app
```

## Monitoring & Logs

```bash
# View logs
railway logs

# View specific service logs
cd backend && railway logs
cd web && railway logs
```

## Rollback

```bash
railway rollback
```

## Troubleshooting

**Build fails:**
- Check Railway logs for Maven/Node errors
- Verify environment variables are set correctly
- Ensure `JWT_SECRET` is at least 32 characters

**Backend won't start:**
- Verify `DATABASE_URL` is set (Railway auto-sets this)
- Check `JWT_SECRET` is configured
- Review logs: `railway logs`

**Frontend can't connect:**
- Verify `VITE_API_BASE_URL` points to correct backend URL
- Check CORS settings in backend `WebConfig.java`
- Ensure backend is running and healthy

## Production URLs

- **Backend:** https://rapid-photo-upload-production.up.railway.app
- **Frontend:** https://web-frontend-rapid-photo-upload-production.up.railway.app

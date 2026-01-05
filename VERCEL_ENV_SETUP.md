# Vercel Environment Variables Setup

## CRITICAL: Set These Environment Variables in Vercel

The "Request failed" error on login is most likely because `VITE_API_URL` is not set in Vercel.

### How to Set Environment Variables in Vercel:

1. Go to https://vercel.com/dashboard
2. Click on your project: **test-case-management-system**
3. Click **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Add each variable below:

---

## Required Environment Variables

### 1. VITE_API_URL (CRITICAL - Frontend needs this!)
```
Key: VITE_API_URL
Value: /api
Environment: Production, Preview, Development (select all)
```
**Why**: This tells the frontend to use `/api` (same domain) instead of `localhost:5002/api`

---

### 2. DATABASE_URL
```
Key: DATABASE_URL
Value: <your Neon.tech PostgreSQL connection string>
Environment: Production, Preview, Development
```
**Example**: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

**Where to get it**: 
- Go to your Neon.tech dashboard
- Copy the connection string for your database

---

### 3. JWT_SECRET
```
Key: JWT_SECRET
Value: <a secure random string>
Environment: Production, Preview, Development
```
**Example**: `your-super-secret-jwt-key-change-this-in-production-12345`

**Generate a secure one**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 4. DB_SSL
```
Key: DB_SSL
Value: true
Environment: Production, Preview, Development
```
**Why**: Neon.tech requires SSL connections

---

### 5. NODE_ENV (Optional but recommended)
```
Key: NODE_ENV
Value: production
Environment: Production
```

---

## After Adding Variables

1. **Redeploy**: After adding all variables, go to **Deployments** tab
2. Click the **three dots** (•••) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~2-5 minutes)

---

## Quick Check

After redeployment, test these URLs:

1. **Health Check**: `https://test-case-management-system-j7lawgv3x.vercel.app/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend**: `https://test-case-management-system-j7lawgv3x.vercel.app/`
   - Should load the login page

3. **Try Login**: Use your credentials
   - Should now work!

---

## Troubleshooting

If still not working after setting variables:

1. **Check browser console** (F12) for the actual error
2. **Check Network tab** to see what URL the frontend is calling
3. **Verify** all environment variables are saved in Vercel settings
4. **Make sure** you redeployed after adding variables

---

## Current Status

✅ Code fixes pushed to GitHub
✅ Diagnostic handler deployed
⚠️ **NEXT STEP**: Set environment variables in Vercel (especially `VITE_API_URL`)

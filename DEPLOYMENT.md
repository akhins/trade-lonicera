# Production Deployment Guide

Bu rehber uygulamayı Netlify (Frontend) ve Heroku/Railway/VPS (Backend) üzerinde production ortamında çalıştırmak için adımları içerir.

## 📋 Prerequisite Türler

### Needed Services:
1. **GitHub Repository** - Code version control (✅ Already done: trade-lonicera)
2. **Netlify Account** - Frontend deployment (free tier suitable)
3. **Backend Server** - Node.js runtime (Heroku, Railway, DigitalOcean VPS, etc.)
4. **Production Database** - MySQL/MariaDB (AWS RDS, DigitalOcean DB, etc.)

---

## 🚀 Step 1: Backend Deployment (Node.js Server)

### Option A: Railway.app (Recommended for simplicity)

1. **Go to [railway.app](https://railway.app) and signup**

2. **Create new project → Deploy from GitHub**
   - Connect GitHub account
   - Select `trade-lonicera` repository
   - Select `backend` folder as root directory

3. **Set Environment Variables in Railway Dashboard:**
   ```
   DB_HOST=your-production-db.host
   DB_USER=trading_user
   DB_PASSWORD=secure_password_32_chars_min
   DB_NAME=trading_db
   DB_PORT=3306
   JWT_SECRET=your_jwt_secret_32_chars_min
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-netlify-domain.netlify.app
   ```

4. **Railway generates public URL automatically**
   - Example: `https://trade-backend-prod.up.railway.app`
   - Note this URL for next step

---

### Option B: Heroku (if you have free credits)

1. **Create Heroku app:**
   ```bash
   heroku create trade-backend-prod
   heroku git:remote -a trade-backend-prod
   ```

2. **Set buildpack to Node.js:**
   ```bash
   heroku buildpacks:set heroku/nodejs
   ```

3. **Push only backend folder** (requires Procfile in backend/):
   ```bash
   git push heroku main:main
   ```

4. **Set environment variables:**
   ```bash
   heroku config:set DB_HOST=your-production-db.host
   heroku config:set DB_USER=trading_user
   heroku config:set DB_PASSWORD=secure_pass
   # ... etc
   ```

---

## 💾 Step 2: Production Database Setup

### For AWS RDS MySQL:
1. Create RDS MySQL instance (free tier: db.t2.micro)
2. Security group: Allow inbound traffic on port 3306 from your backend server
3. Run database schema:
   ```bash
   mysql -h your-rds-endpoint.rds.amazonaws.com -u admin -p < database/schema.sql
   ```

### For DigitalOcean Managed Database:
1. Create Managed MySQL cluster
2. Download CA certificate for SSL connections
3. Update connection string in backend environment variables

### For local testing before production:
```bash
# Create database
mysql -u root -p
CREATE DATABASE trading_db;
CREATE USER 'trading_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON trading_db.* TO 'trading_user'@'localhost';

# Run schema
mysql -u trading_user -p trading_db < database/schema.sql
```

---

## 🌐 Step 3: Frontend Deployment (Netlify)

### 3.1 Connect GitHub Repository

1. Go to [netlify.com](https://netlify.com) and **Sign up/Login**
2. Click **"New site from Git"**
3. Choose **GitHub** as Git provider
4. Select **akhins/trade-lonicera** repository
5. Confirm GitHub app permissions

### 3.2 Configure Build Settings

Netlify should auto-detect settings, but verify:

| Setting | Value |
|---------|-------|
| **Build command** | `cd frontend && npm install && npm run build` |
| **Publish directory** | `frontend/dist` |
| **Base directory** | (leave empty) |

### 3.3 Set Environment Variables

1. In Netlify Dashboard → **Site settings → Build & deploy → Environment**
2. Click **"Edit variables"**
3. Add environment variables:

| Key | Value | Note |
|-----|-------|------|
| `VITE_API_URL` | `https://trade-backend-prod.up.railway.app/api` | From Step 1 backend URL |
| `VITE_SOCKET_URL` | `https://trade-backend-prod.up.railway.app` | Same base URL |

### 3.4 Deploy

1. Click **"Deploy site"**
2. Netlify builds and deploys automatically
3. Get your Netlify URL: `https://your-site-name.netlify.app`
4. Navigate to site and test

---

## 🔄 Step 4: Enable CORS on Backend (Production)

Update `backend/server.js` to allow Netlify domain:

```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

**Backend Setup Checklist:**
- ✅ Add `FRONTEND_URL=https://your-site.netlify.app` to production env vars
- ✅ Backend server running and accessible publicly
- ✅ Database connection working from backend server
- ✅ CORS headers configured for Netlify domain

---

## 🧪 Step 5: Testing the Production Deployment

### Test Backend API:
```bash
curl -X GET https://trade-backend-prod.up.railway.app/api/health

# Should return: {"status": "ok"}
```

### Test Socket.IO Connection:
Open browser console on Netlify site and check:
```javascript
console.log('Socket connected:', io.connected);
```

### Test Authentication:
1. Go to Login page on Netlify site
2. Login with test credentials
3. Verify token in localStorage: `localStorage.getItem('token')`

### Test Dashboard:
1. Dashboard should load market data
2. Trading signals should appear when new scan completes
3. WebSocket should show real-time updates

---

## 🔐 Security Checklist

- ✅ `.env` files are in `.gitignore` (never committed)
- ✅ Production secrets set via Netlify UI and backend dashboard
- ✅ JWT_SECRET is 32+ characters
- ✅ Database passwords are strong (20+ chars, mixed case, numbers, symbols)
- ✅ Production DB not accessible from internet (only from backend server)
- ✅ CORS restricted to production domain only
- ✅ HTTPS enforced (Netlify auto-HTTPS, backend SSL required)

---

## 🚨 Troubleshooting

### Frontend shows "Cannot connect to API"
1. Check Netlify environment variables are set correctly
2. Verify backend server is running: `curl https://your-backend-url/api/health`
3. Check backend CORS allows Netlify domain
4. Check browser console for actual error message

### Socket.IO not connecting
1. Verify `VITE_SOCKET_URL` is set in Netlify
2. Check backend Socket.IO path is `/socket.io` (default)
3. Ensure backend server allows WebSocket connections

### Database connection fails
1. Check production DB is accessible from backend server
2. Verify DB credentials in backend environment variables
3. Ensure database schema is initialized (SQL migration ran)
4. Check database user has correct permissions

### "npm WARN deprecated" messages during build
These are just warnings, deployment typically succeeds. Monitor build logs in Netlify UI.

---

## 📊 Monitoring

### Netlify:
- Check build logs: **Deploys → Logs**
- Monitor function logs: **Functions**
- Check deploy preview URLs for staging

### Backend Logs:
- Railway: Dashboard → **View Logs**
- Heroku: `heroku logs --tail`
- VPS: `tail -f /var/log/app.log`

---

## 🔄 Continuous Deployment

Once deployed:
1. Push to GitHub `main` branch
2. Netlify automatically rebuilds frontend
3. Backend auto-deploys if using Railway/Heroku auto-deploy

To manually trigger rebuild:
- Railway/Heroku: Redeploy from dashboard
- Netlify: **Deploys → Trigger deploy → Deploy site**

---

## 💡 Environment Variables Summary

### Frontend (Netlify Dashboard)
```
VITE_API_URL=https://your-backend.app/api
VITE_SOCKET_URL=https://your-backend.app
```

### Backend (Railway/Heroku Dashboard)
```
DB_HOST=production-db.host
DB_USER=trading_user
DB_PASSWORD=secure_password
DB_NAME=trading_db
JWT_SECRET=super_secret_32_chars_min
NODE_ENV=production
FRONTEND_URL=https://your-site.netlify.app
```

---

## ✅ Final Verification

After deployment, verify all features work:

| Feature | Test | Expected Result |
|---------|------|-----------------|
| **Login** | Enter credentials | Redirects to Dashboard |
| **Dashboard** | View page | Shows market data, balance |
| **Signals** | Check signals page | Real-time signal updates |
| **Trading** | Check open trades | Live trade positions |
| **Analytics** | View analytics page | Charts load correctly |
| **Settings** | Change settings | Saves to backend |
| **Strategies** | View page | Strategy explanation loads |

---

## 🎉 Done!

Your application is now running in production:
- 🌐 Frontend: https://your-site.netlify.app
- 🔌 Backend: https://your-backend-url.app
- 💾 Database: Production MySQL instance

Happy trading! 🚀

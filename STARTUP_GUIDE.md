# 🚀 GuardianPulse Complete Startup Guide

## 📋 Prerequisites

Before starting the GuardianPulse project, ensure you have:

- **Docker & Docker Compose** installed
- **Node.js 18+** installed
- **pnpm** package manager installed (`npm install -g pnpm`)
- **Git** for version control

## 🔧 Environment Setup

### 1. Clone and Setup Repository

```bash
git clone https://github.com/shivadeepak99/GuardianPulse.git
cd GuardianPulse
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

### 3. Environment Configuration

#### Backend API Environment (.env)

Create `packages/api/.env`:

```bash
# Database Configuration
DATABASE_URL="postgresql://guardianpulse:secure_password_2024@localhost:5432/guardianpulse"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key-here"
JWT_EXPIRES_IN="7d"

# AWS S3 (Evidence Storage)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=guardianpulse-evidence

# Email Service (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM="GuardianPulse Safety <your_email@gmail.com>"

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Application URLs
FRONTEND_URL=http://localhost:5173
DASHBOARD_URL=http://localhost:5173

# Server Configuration
PORT=8080
NODE_ENV=development
```

#### Frontend Web Environment

`packages/web/.env` already exists:

```bash
VITE_API_URL=http://localhost:8080/api/v1
VITE_APP_NAME=GuardianPulse
VITE_APP_VERSION=1.0.0
```

## 🐳 Method 1: Docker Compose (Recommended for Backend)

### Start All Backend Services

```bash
# From project root
docker-compose up -d

# This starts:
# - PostgreSQL Database (port 5432)
# - Redis Cache (port 6379)
# - API Backend Server (port 8080)
```

### Verify Backend Services

```bash
# Check container status
docker-compose ps

# Check API health
curl http://localhost:8080/health

# View logs
docker-compose logs api
```

## 💻 Method 2: Local Development (Full Control)

### 1. Start Database Services Only

```bash
# Start only PostgreSQL and Redis
docker-compose up -d postgres redis
```

### 2. Start API Server Locally

```bash
cd packages/api

# Install dependencies
pnpm install

# Run database migrations
pnpm prisma migrate deploy

# Start development server
pnpm run dev
```

### 3. Start Web Frontend

```bash
cd packages/web

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

### 4. Start Mobile Development (Optional)

```bash
cd packages/mobile

# Install dependencies
pnpm install

# Start Expo development server
pnpm start
```

## 🔄 What Needs to Be Running (Complete List)

### Core Backend Services (Required)

1. **PostgreSQL Database** - `localhost:5432`
   - Stores user data, incidents, evidence metadata
   - Started via: `docker-compose up -d postgres`

2. **Redis Cache** - `localhost:6379`
   - Real-time data buffering, session storage
   - Started via: `docker-compose up -d redis`

3. **API Backend Server** - `localhost:8080`
   - Core REST API, WebSocket server, business logic
   - Started via: `docker-compose up -d api` OR `cd packages/api && pnpm run dev`

### Frontend Applications

4. **Web Dashboard** - `localhost:5173` (or 5174)
   - Guardian dashboard, incident management
   - Started via: `cd packages/web && pnpm run dev`

5. **Mobile App** - Expo Dev Server (Optional)
   - Ward mobile application
   - Started via: `cd packages/mobile && pnpm start`

### External Services (Configure as needed)

6. **AWS S3** - Evidence file storage
7. **Twilio SMS** - Emergency notifications
8. **SMTP Email** - Email notifications

## 🚀 Quick Start Commands

### Option A: Full Docker (Backend + Database)

```bash
# Start everything with Docker
docker-compose up -d

# Start web frontend separately
cd packages/web && pnpm run dev
```

### Option B: Mixed (Docker DB + Local API + Local Web)

```bash
# Start databases only
docker-compose up -d postgres redis

# Terminal 1: Start API
cd packages/api && pnpm run dev

# Terminal 2: Start Web
cd packages/web && pnpm run dev
```

### Option C: Full Local Development

```bash
# Terminal 1: Databases
docker-compose up -d postgres redis

# Terminal 2: API Server
cd packages/api && pnpm run dev

# Terminal 3: Web Frontend
cd packages/web && pnpm run dev

# Terminal 4: Mobile (optional)
cd packages/mobile && pnpm start
```

## 🔍 Verification Checklist

After starting services, verify everything is working:

### Backend Health Checks

```bash
# API Health
curl http://localhost:8080/health

# Database Connection
curl http://localhost:8080/health/detailed

# WebSocket Connection (browser console)
const socket = io('http://localhost:8080');
```

### Frontend Access

- **Web Dashboard**: http://localhost:5173 (or 5174)
- **API Documentation**: http://localhost:8080/api-docs
- **Health Status**: http://localhost:8080/health

### Test Login

- Email: `tester2@example.com`
- Password: `SecurePassword123!`

## 🛠️ Development Workflow

### Daily Development Startup

```bash
# 1. Start backend services
docker-compose up -d

# 2. Start web frontend
cd packages/web && pnpm run dev

# 3. Open browser to http://localhost:5173
```

### Development with Code Changes

```bash
# Backend changes - restart API container
docker-compose restart api

# Frontend changes - Vite hot reload handles automatically

# Database schema changes
cd packages/api && pnpm prisma migrate dev
```

## 🐛 Troubleshooting

### Port Conflicts

- **API (8080)**: Change in docker-compose.yml
- **Web (5173)**: Vite auto-assigns alternative port
- **Database (5432)**: Change in docker-compose.yml

### Container Issues

```bash
# Rebuild containers
docker-compose build --no-cache

# Reset everything
docker-compose down -v
docker-compose up -d
```

### CORS Issues

- API automatically allows localhost:5173, 5174, 3000
- Check CORS configuration in `packages/api/src/index.ts`

## 📊 Resource Usage

### Minimum System Requirements

- **RAM**: 4GB (8GB recommended)
- **CPU**: 2 cores (4 cores recommended)
- **Storage**: 2GB free space
- **Ports**: 3000, 5173-5174, 6379, 8080, 5432

### Docker Resources

```bash
# Check container resource usage
docker stats

# View container logs
docker-compose logs -f api
```

---

## ✅ Summary

**For basic GuardianPulse operation, you need:**

1. **Docker containers**: `docker-compose up -d`
2. **Web frontend**: `cd packages/web && pnpm run dev`

**That's it! The core safety platform will be fully functional.**

The mobile app and local API development are optional for extended development work.

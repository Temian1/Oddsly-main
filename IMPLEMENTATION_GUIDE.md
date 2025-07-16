# 🚀 Complete Implementation Guide: Firebase → Prisma + PostgreSQL Migration

## 📋 Prerequisites

### 1. Install PostgreSQL
```bash
# Windows (using Chocolatey)
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
# Default settings: Port 5432, Username: postgres
```

### 2. Create Database
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database and user
CREATE DATABASE oddsly_db;
CREATE USER oddsly_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE oddsly_db TO oddsly_user;
\q
```

### 3. Environment Setup
```bash
# Create .env file in project root
touch .env
```

**.env:**
```env
# Database
DATABASE_URL="postgresql://oddsly_user:your_secure_password@localhost:5432/oddsly_db"

# JWT Authentication
JWT_SECRET="your-super-secure-jwt-secret-key-here-min-32-chars"
JWT_EXPIRES_IN="7d"
BCRYPT_ROUNDS=12

# 2FA
TWO_FA_SERVICE_NAME="Oddsly"
TWO_FA_ISSUER="Oddsly EV Platform"

# API Keys (keep existing)
VITE_ODDS_API_KEY=your_odds_api_key
VITE_BACKEND_URL=http://localhost:3001/api

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:5174
```

---

## 🔧 Phase 1: Database & Prisma Setup

### Install Dependencies
```bash
npm install @prisma/client prisma bcryptjs jsonwebtoken speakeasy qrcode express-rate-limit helmet cors express
npm install -D @types/bcryptjs @types/jsonwebtoken @types/speakeasy @types/qrcode @types/cors @types/express
```

### Initialize Prisma
```bash
npx prisma init
```

### Update package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "db:migrate": "npx prisma migrate dev",
    "db:generate": "npx prisma generate",
    "db:studio": "npx prisma studio",
    "db:seed": "npx prisma db seed",
    "db:reset": "npx prisma migrate reset"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## 🗄️ Phase 2: Database Schema Implementation

This schema will be created in the next steps, providing:
- User management with 2FA
- Historical prop data tracking
- Real hit rate calculations
- User bookmarks and betting performance
- Admin functionality
- Security features

---

## 🔐 Phase 3: Authentication System

The new authentication system will include:
- JWT-based authentication
- Password hashing with bcrypt
- 2FA with TOTP (Time-based One-Time Password)
- Rate limiting and security middleware
- Admin role management

---

## 📊 Phase 4: Data Services

Implementation of:
- Real historical data storage
- Hit rate calculation algorithms
- Performance analytics
- User tracking and bookmarks
- Automated data refresh with database persistence

---

## 🛡️ Phase 5: Security & Production Features

- Anti-scraping protection
- Input validation and sanitization
- CORS configuration
- Rate limiting
- Error handling and logging
- Admin dashboard

---

## 🚀 Quick Start Commands

```bash
# 1. Install all dependencies
npm install

# 2. Set up database
npm run db:migrate
npm run db:generate

# 3. Seed initial data
npm run db:seed

# 4. Start development
npm run dev

# 5. View database (optional)
npm run db:studio
```

---

## 📁 New Project Structure

```
src/
├── lib/
│   ├── prisma.ts          # Prisma client
│   ├── auth.ts            # JWT utilities
│   ├── security.ts        # Security middleware
│   └── validation.ts      # Input validation
├── services/
│   ├── authService.ts     # Authentication logic
│   ├── userService.ts     # User management
│   ├── propService.ts     # Prop data management
│   ├── hitRateService.ts  # Hit rate calculations
│   └── analyticsService.ts # Performance analytics
├── types/
│   ├── auth.ts           # Auth types
│   ├── database.ts       # Database types
│   └── api.ts            # API types
└── hooks/
    ├── useAuth.ts        # Updated auth hook
    ├── useDatabase.ts    # Database operations
    └── useAnalytics.ts   # Analytics hook
```

---

## 🔄 Migration Checklist

### Phase 1: Foundation ✅
- [ ] PostgreSQL installed and configured
- [ ] Prisma schema created
- [ ] Database migrations run
- [ ] Environment variables set

### Phase 2: Authentication 🔄
- [ ] JWT authentication implemented
- [ ] 2FA system added
- [ ] Password hashing with bcrypt
- [ ] Security middleware

### Phase 3: Data Layer 🔄
- [ ] Historical data storage
- [ ] Real hit rate calculations
- [ ] User bookmarks system
- [ ] Performance tracking

### Phase 4: Security 🔄
- [ ] Rate limiting
- [ ] Input validation
- [ ] CORS configuration
- [ ] Admin functionality

### Phase 5: Testing 🔄
- [ ] Authentication flow testing
- [ ] Database operations testing
- [ ] Security testing
- [ ] Performance testing

---

## 🎯 Success Metrics

After implementation, you'll have:
- ✅ **Real Database**: PostgreSQL with Prisma ORM
- ✅ **Secure Authentication**: JWT + 2FA + bcrypt
- ✅ **Historical Data**: Real prop performance tracking
- ✅ **User Management**: Profiles, bookmarks, performance analytics
- ✅ **Admin Features**: User management and system monitoring
- ✅ **Production Security**: Rate limiting, validation, CORS
- ✅ **Scalable Architecture**: Type-safe, maintainable codebase

---

## 🆘 Troubleshooting

### Common Issues:

1. **PostgreSQL Connection Error**
   ```bash
   # Check if PostgreSQL is running
   pg_ctl status
   
   # Start PostgreSQL service
   net start postgresql-x64-14
   ```

2. **Prisma Migration Error**
   ```bash
   # Reset database if needed
   npm run db:reset
   ```

3. **Environment Variables**
   ```bash
   # Verify .env file exists and has correct values
   cat .env
   ```

4. **Port Conflicts**
   ```bash
   # Check what's running on port 5432
   netstat -an | findstr :5432
   ```

This guide will transform your EV platform from a prototype to a production-ready application with enterprise-level features and security.
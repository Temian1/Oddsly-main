# EV Model Requirements Analysis & Migration Strategy

## 📊 Current Implementation Status

### ✅ **IMPLEMENTED FEATURES**

#### Core EV Calculation Engine
- ✅ **EV Formula**: `EV = Hit Rate - Implied Probability`
- ✅ **Platform Multipliers**: PrizePicks, Underdog, Pick6 configurations
- ✅ **EV Threshold**: 56.5% minimum hit rate implemented
- ✅ **Implied Probability Calculations**: Both traditional and DFS platforms
- ✅ **Historical Hit Rate Simulation**: Basic framework in place

#### Platform Support
- ✅ **DFS Platforms**: PrizePicks, Underdog, DraftKings Pick6
- ✅ **Odds API Integration**: The Odds API with `us_dfs` region support
- ✅ **Platform-Specific Multipliers**: Accurate payout calculations
- ✅ **Alternate Markets**: Demons/Goblins markets support

#### Sports Coverage
- ✅ **Supported Sports**: NBA, NFL, MLB, NHL, WNBA
- ✅ **Prop Types**: Fantasy points, traditional stats, platform-specific scoring

#### UI/UX Components
- ✅ **EV Dashboard**: Real-time statistics and performance metrics
- ✅ **Advanced Player Props**: EV-focused interface with sorting/filtering
- ✅ **Value Highlighting**: Automatic +EV prop identification
- ✅ **Responsive Design**: Desktop and mobile support
- ✅ **Table Functionality**: Dynamic sorting by EV%, hit rate, player, sport, platform

#### Data Automation
- ✅ **Hourly Auto-Refresh**: Automated prop data pulling
- ✅ **Local Storage System**: Historical data tracking
- ✅ **Configuration Management**: Customizable refresh intervals and sports

---

## ❌ **MISSING CRITICAL COMPONENTS**

### 🔐 Authentication & Security
- ❌ **No Firebase Integration**: Auth service exists but no Firebase config file
- ❌ **Missing 2FA**: Optional 2FA not implemented
- ❌ **No Anti-Scraping Protection**: Security measures not in place
- ❌ **Admin User System**: No admin role management

### 🗄️ Database & Data Persistence
- ❌ **No Database Schema**: Only environment variables for Firebase
- ❌ **No Historical Data Storage**: Currently using localStorage only
- ❌ **No User Data Persistence**: User profiles not stored properly
- ❌ **No Hit Rate Tracking**: Historical performance data not persisted

### 📡 API Integration Gaps
- ❌ **Missing Real Hit Rate Data**: Currently using simulated data
- ❌ **No Game Results Integration**: Actual outcomes not tracked
- ❌ **Limited Historical Analysis**: No long-term performance tracking
- ❌ **No Line Movement Tracking**: Price changes not monitored

### 🔄 Advanced Features
- ❌ **Kelly Criterion Implementation**: Bet sizing not fully implemented
- ❌ **Confidence Scoring**: Statistical confidence not calculated
- ❌ **Performance Analytics**: User betting success not tracked
- ❌ **Real-time Notifications**: Value alerts not implemented

---

## 🚀 **MIGRATION STRATEGY: Firebase → Prisma + PostgreSQL**

### **Phase 1: Database Schema Design**

```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  date_of_birth DATE,
  subscription_status VARCHAR(50) DEFAULT 'free',
  two_fa_enabled BOOLEAN DEFAULT false,
  two_fa_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sports and Platforms
CREATE TABLE sports (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE platforms (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  platform_type VARCHAR(20) NOT NULL, -- 'dfs' or 'sportsbook'
  multipliers JSONB, -- Platform-specific payout multipliers
  active BOOLEAN DEFAULT true
);

-- Historical Prop Data
CREATE TABLE historical_props (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name VARCHAR(255) NOT NULL,
  prop_type VARCHAR(100) NOT NULL,
  line DECIMAL(10,2) NOT NULL,
  actual_result DECIMAL(10,2),
  hit BOOLEAN,
  game_date DATE NOT NULL,
  sport_id INTEGER REFERENCES sports(id),
  platform_id INTEGER REFERENCES platforms(id),
  season VARCHAR(20),
  odds INTEGER, -- American odds format
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calculated Hit Rates
CREATE TABLE hit_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name VARCHAR(255) NOT NULL,
  prop_type VARCHAR(100) NOT NULL,
  line_range_min DECIMAL(10,2),
  line_range_max DECIMAL(10,2),
  hit_rate DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
  game_count INTEGER NOT NULL,
  confidence_level VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
  sport_id INTEGER REFERENCES sports(id),
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_name, prop_type, line_range_min, line_range_max, sport_id)
);

-- User Bookmarks and Tracking
CREATE TABLE user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  prop_type VARCHAR(100) NOT NULL,
  line DECIMAL(10,2) NOT NULL,
  platform_id INTEGER REFERENCES platforms(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, player_name, prop_type, line, platform_id)
);

-- User Betting Performance
CREATE TABLE user_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  prop_type VARCHAR(100) NOT NULL,
  line DECIMAL(10,2) NOT NULL,
  predicted_ev DECIMAL(5,4) NOT NULL,
  bet_amount DECIMAL(10,2),
  actual_result DECIMAL(10,2),
  won BOOLEAN,
  profit_loss DECIMAL(10,2),
  platform_id INTEGER REFERENCES platforms(id),
  bet_date TIMESTAMP DEFAULT NOW()
);

-- System Configuration
CREATE TABLE system_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Phase 2: Prisma Setup**

```bash
# Install Prisma
npm install prisma @prisma/client
npm install -D prisma

# Initialize Prisma
npx prisma init
```

**prisma/schema.prisma:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                 String    @id @default(cuid())
  email              String    @unique
  passwordHash       String    @map("password_hash")
  fullName           String?   @map("full_name")
  dateOfBirth        DateTime? @map("date_of_birth")
  subscriptionStatus String    @default("free") @map("subscription_status")
  twoFaEnabled       Boolean   @default(false) @map("two_fa_enabled")
  twoFaSecret        String?   @map("two_fa_secret")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")
  
  bookmarks UserBookmark[]
  bets      UserBet[]
  
  @@map("users")
}

model Sport {
  id     Int     @id @default(autoincrement())
  key    String  @unique
  name   String
  active Boolean @default(true)
  
  historicalProps HistoricalProp[]
  hitRates        HitRate[]
  
  @@map("sports")
}

model Platform {
  id           Int     @id @default(autoincrement())
  key          String  @unique
  name         String
  platformType String  @map("platform_type")
  multipliers  Json?
  active       Boolean @default(true)
  
  historicalProps HistoricalProp[]
  bookmarks       UserBookmark[]
  bets            UserBet[]
  
  @@map("platforms")
}

model HistoricalProp {
  id           String    @id @default(cuid())
  playerName   String    @map("player_name")
  propType     String    @map("prop_type")
  line         Decimal   @db.Decimal(10, 2)
  actualResult Decimal?  @map("actual_result") @db.Decimal(10, 2)
  hit          Boolean?
  gameDate     DateTime  @map("game_date")
  sportId      Int       @map("sport_id")
  platformId   Int       @map("platform_id")
  season       String?
  odds         Int?
  createdAt    DateTime  @default(now()) @map("created_at")
  
  sport    Sport    @relation(fields: [sportId], references: [id])
  platform Platform @relation(fields: [platformId], references: [id])
  
  @@map("historical_props")
}

model HitRate {
  id              String   @id @default(cuid())
  playerName      String   @map("player_name")
  propType        String   @map("prop_type")
  lineRangeMin    Decimal  @map("line_range_min") @db.Decimal(10, 2)
  lineRangeMax    Decimal  @map("line_range_max") @db.Decimal(10, 2)
  hitRate         Decimal  @map("hit_rate") @db.Decimal(5, 4)
  gameCount       Int      @map("game_count")
  confidenceLevel String   @map("confidence_level")
  sportId         Int      @map("sport_id")
  lastUpdated     DateTime @default(now()) @map("last_updated")
  
  sport Sport @relation(fields: [sportId], references: [id])
  
  @@unique([playerName, propType, lineRangeMin, lineRangeMax, sportId])
  @@map("hit_rates")
}

model UserBookmark {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  playerName String   @map("player_name")
  propType   String   @map("prop_type")
  line       Decimal  @db.Decimal(10, 2)
  platformId Int      @map("platform_id")
  createdAt  DateTime @default(now()) @map("created_at")
  
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform Platform @relation(fields: [platformId], references: [id])
  
  @@unique([userId, playerName, propType, line, platformId])
  @@map("user_bookmarks")
}

model UserBet {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  playerName  String   @map("player_name")
  propType    String   @map("prop_type")
  line        Decimal  @db.Decimal(10, 2)
  predictedEv Decimal  @map("predicted_ev") @db.Decimal(5, 4)
  betAmount   Decimal? @map("bet_amount") @db.Decimal(10, 2)
  actualResult Decimal? @map("actual_result") @db.Decimal(10, 2)
  won         Boolean?
  profitLoss  Decimal? @map("profit_loss") @db.Decimal(10, 2)
  platformId  Int      @map("platform_id")
  betDate     DateTime @default(now()) @map("bet_date")
  
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform Platform @relation(fields: [platformId], references: [id])
  
  @@map("user_bets")
}
```

### **Phase 3: Implementation Steps**

1. **Environment Setup**
```bash
# Add to .env
DATABASE_URL="postgresql://username:password@localhost:5432/oddsly_db"
JWT_SECRET="your-jwt-secret-here"
BCRYPT_ROUNDS=12
```

2. **Database Migration**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

3. **Authentication Refactor**
- Replace Firebase Auth with JWT + bcrypt
- Implement 2FA with speakeasy
- Add rate limiting and security middleware

4. **Data Service Layer**
- Create Prisma service layer
- Implement real historical data tracking
- Add hit rate calculation algorithms
- Build performance analytics

### **Phase 4: Required New Dependencies**

```json
{
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/speakeasy": "^2.0.10",
    "@types/qrcode": "^1.5.5"
  }
}
```

---

## 🎯 **IMPLEMENTATION PRIORITY**

### **Phase 1 (Critical - Week 1)**
1. Set up PostgreSQL database
2. Implement Prisma schema and migrations
3. Refactor authentication system
4. Create basic CRUD operations for users

### **Phase 2 (High Priority - Week 2)**
1. Implement historical data storage
2. Build real hit rate calculation system
3. Add user bookmark functionality
4. Create performance tracking

### **Phase 3 (Medium Priority - Week 3)**
1. Add 2FA authentication
2. Implement admin user system
3. Build advanced analytics
4. Add real-time notifications

### **Phase 4 (Enhancement - Week 4)**
1. Optimize database queries
2. Add caching layer (Redis)
3. Implement advanced security measures
4. Performance monitoring and logging

---

## 📋 **IMMEDIATE ACTION ITEMS**

1. **Remove Firebase Dependencies**: Clean up unused Firebase configuration
2. **Set up PostgreSQL**: Local development database
3. **Install Prisma**: Database ORM and migration tools
4. **Create Database Schema**: Implement the proposed schema
5. **Refactor Auth Service**: Replace Firebase auth with JWT
6. **Implement Real Data Storage**: Replace localStorage with database
7. **Add Missing API Endpoints**: Game results and historical data
8. **Security Implementation**: Rate limiting, input validation, CORS

This migration will transform Oddsly from a prototype with simulated data into a production-ready EV betting platform with real historical tracking, user management, and advanced analytics capabilities.
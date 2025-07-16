# PostgreSQL Setup Guide for Oddsly EV Platform

This guide will help you set up PostgreSQL for the Oddsly EV platform migration from Firebase to Prisma + PostgreSQL.

## 🚀 Quick Start (Recommended)

### Option 1: Local PostgreSQL Installation

#### Windows Installation
1. **Download PostgreSQL**
   - Visit [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)
   - Download the latest stable version (15.x or 16.x)
   - Run the installer as Administrator

2. **Installation Steps**
   ```
   - Choose installation directory (default: C:\Program Files\PostgreSQL\16)
   - Select components: PostgreSQL Server, pgAdmin 4, Command Line Tools
   - Set data directory (default: C:\Program Files\PostgreSQL\16\data)
   - Set superuser password (REMEMBER THIS!)
   - Set port (default: 5432)
   - Set locale (default: English, United States)
   ```

3. **Verify Installation**
   ```bash
   # Open Command Prompt as Administrator
   psql --version
   
   # Connect to PostgreSQL
   psql -U postgres -h localhost
   ```

#### Create Database
```sql
-- Connect as postgres user
psql -U postgres -h localhost

-- Create database
CREATE DATABASE oddsly_db;

-- Create user (optional, for security)
CREATE USER oddsly_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE oddsly_db TO oddsly_user;

-- Exit
\q
```

### Option 2: Docker PostgreSQL (Alternative)

```bash
# Pull PostgreSQL image
docker pull postgres:16

# Run PostgreSQL container
docker run --name oddsly-postgres \
  -e POSTGRES_DB=oddsly_db \
  -e POSTGRES_USER=oddsly_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -d postgres:16

# Verify container is running
docker ps
```

### Option 3: SQLite (Development/Prototyping)

For quick prototyping, you can use SQLite instead:

```bash
# Install SQLite (if not already installed)
npm install sqlite3

# Update your .env file
DATABASE_URL="file:./dev.db"
```

## 🔧 Environment Configuration

1. **Copy Environment File**
   ```bash
   cp .env.example .env
   ```

2. **Update Database URL in .env**
   ```env
   # For PostgreSQL
   DATABASE_URL="postgresql://oddsly_user:your_secure_password@localhost:5432/oddsly_db?schema=public"
   
   # For SQLite (development)
   # DATABASE_URL="file:./dev.db"
   ```

3. **Set Other Required Variables**
   ```env
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
   API_KEY="your-odds-api-key-here"
   ```

## 📊 Database Setup

1. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

2. **Run Database Migration**
   ```bash
   npx prisma db push
   ```

3. **Seed Initial Data**
   ```bash
   npm run db:seed
   ```

4. **View Database (Optional)**
   ```bash
   npx prisma studio
   ```

## 🛠️ Available Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx src/scripts/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset --force",
    "db:deploy": "prisma migrate deploy"
  }
}
```

## 🔍 Verification Steps

1. **Test Database Connection**
   ```bash
   npm run db:test
   ```

2. **Check Tables Created**
   ```sql
   psql -U oddsly_user -d oddsly_db -h localhost
   \dt
   ```

3. **Verify Seed Data**
   ```sql
   SELECT * FROM sports;
   SELECT * FROM platforms;
   SELECT * FROM system_config;
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if PostgreSQL is running
   # Windows: Services -> PostgreSQL
   # Or restart service
   net stop postgresql-x64-16
   net start postgresql-x64-16
   ```

2. **Authentication Failed**
   - Verify username/password in .env
   - Check pg_hba.conf file for authentication settings
   - Restart PostgreSQL service

3. **Port Already in Use**
   ```bash
   # Check what's using port 5432
   netstat -ano | findstr :5432
   
   # Kill process if needed
   taskkill /PID <process_id> /F
   ```

4. **Prisma Schema Issues**
   ```bash
   # Reset and regenerate
   npx prisma db push --force-reset
   npx prisma generate
   ```

### Performance Optimization

1. **PostgreSQL Configuration**
   ```sql
   -- Increase connection limit (postgresql.conf)
   max_connections = 200
   
   -- Optimize memory settings
   shared_buffers = 256MB
   effective_cache_size = 1GB
   ```

2. **Database Indexes**
   ```sql
   -- Add custom indexes for performance
   CREATE INDEX idx_historical_props_player_prop ON historical_props(player_name, prop_type);
   CREATE INDEX idx_historical_props_game_date ON historical_props(game_date);
   CREATE INDEX idx_hit_rates_lookup ON hit_rates(player_name, prop_type, sport_id);
   ```

## 🔐 Security Best Practices

1. **Database User Permissions**
   ```sql
   -- Create limited user for application
   CREATE USER app_user WITH PASSWORD 'secure_app_password';
   GRANT CONNECT ON DATABASE oddsly_db TO app_user;
   GRANT USAGE ON SCHEMA public TO app_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
   ```

2. **Environment Variables**
   - Never commit .env files
   - Use strong passwords (16+ characters)
   - Rotate secrets regularly
   - Use different credentials for dev/prod

3. **Network Security**
   ```
   # postgresql.conf
   listen_addresses = 'localhost'  # Only local connections
   
   # pg_hba.conf
   local   all   all                     md5
   host    all   all   127.0.0.1/32    md5
   ```

## 📈 Monitoring & Maintenance

1. **Database Health Check**
   ```bash
   npm run db:health
   ```

2. **Backup Strategy**
   ```bash
   # Create backup
   pg_dump -U oddsly_user -h localhost oddsly_db > backup_$(date +%Y%m%d).sql
   
   # Restore backup
   psql -U oddsly_user -h localhost oddsly_db < backup_20241201.sql
   ```

3. **Log Monitoring**
   ```
   # PostgreSQL logs location (Windows)
   C:\Program Files\PostgreSQL\16\data\log
   ```

## 🎯 Next Steps

After completing the PostgreSQL setup:

1. ✅ Database installed and running
2. ✅ Environment variables configured
3. ✅ Prisma schema applied
4. ✅ Initial data seeded
5. 🔄 **Run the application**: `npm run dev`
6. 🔄 **Test authentication**: Register/login
7. 🔄 **Verify data flow**: Check EV calculations
8. 🔄 **Monitor performance**: Use Prisma Studio

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Ensure PostgreSQL service is running
4. Check application logs for specific errors
5. Use `npx prisma studio` to inspect database state

---

**🎉 Congratulations!** You've successfully migrated from Firebase to PostgreSQL with Prisma ORM. Your EV platform now has a robust, scalable database foundation with real data persistence, user management, and security features.
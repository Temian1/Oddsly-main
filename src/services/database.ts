import { PrismaClient } from '@prisma/client';

// Global Prisma instance to prevent multiple connections
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database connection helper
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Database disconnection helper
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

// Health check
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() };
  }
}

// Seed initial data
export async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...');

    // Seed Sports
    const sports = [
      { key: 'americanfootball_nfl', name: 'NFL', displayName: 'National Football League' },
      { key: 'basketball_nba', name: 'NBA', displayName: 'National Basketball Association' },
      { key: 'baseball_mlb', name: 'MLB', displayName: 'Major League Baseball' },
      { key: 'icehockey_nhl', name: 'NHL', displayName: 'National Hockey League' },
      { key: 'basketball_wnba', name: 'WNBA', displayName: 'Women\'s National Basketball Association' },
    ];

    for (const sport of sports) {
      await prisma.sport.upsert({
        where: { key: sport.key },
        update: {},
        create: sport,
      });
    }

    // Seed Platforms
    const platforms = [
      {
        key: 'underdog',
        name: 'Underdog Fantasy',
        displayName: 'Underdog Fantasy',
        platformType: 'dfs',
        multipliers: { higher: 3, lower: 3 },
        active: true,
      },
      {
        key: 'prizepicks',
        name: 'PrizePicks',
        displayName: 'PrizePicks',
        platformType: 'dfs',
        multipliers: { higher: 3, lower: 3 },
        active: true,
      },
      {
        key: 'pick6',
        name: 'DraftKings Pick6',
        displayName: 'DraftKings Pick6',
        platformType: 'dfs',
        multipliers: { higher: 3, lower: 3 },
        active: true,
      },
    ];

    for (const platform of platforms) {
      await prisma.platform.upsert({
        where: { key: platform.key },
        update: {},
        create: platform,
      });
    }

    // Seed System Configuration
    const systemConfigs = [
      {
        key: 'ev_threshold',
        value: 0.05,
        category: 'calculations',
      },
      {
        key: 'default_hit_rate',
        value: 0.5,
        category: 'calculations',
      },
      {
        key: 'min_games_for_hit_rate',
        value: 10,
        category: 'calculations',
      },
      {
        key: 'hit_rate_calculation_days',
        value: 90,
        category: 'calculations',
      },
      {
        key: 'data_refresh_interval',
        value: 30,
        category: 'automation',
      },
    ];

    for (const config of systemConfigs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: config,
      });
    }

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Database seed failed:', error);
    throw error;
  }
}

// Clean up test data (for development)
export async function cleanTestData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot clean data in production environment');
  }

  try {
    await prisma.userBet.deleteMany();
    await prisma.userBookmark.deleteMany();
    await prisma.userAnalytics.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.historicalProp.deleteMany();
    await prisma.hitRate.deleteMany();
    await prisma.apiUsage.deleteMany();
    
    console.log('✅ Test data cleaned successfully');
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
    throw error;
  }
}

export default prisma;
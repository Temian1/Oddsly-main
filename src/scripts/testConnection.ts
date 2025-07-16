#!/usr/bin/env tsx

import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from '../services/database';

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test connection
    await connectDatabase();
    console.log('✅ Database connection successful!');
    
    // Test health check
    const health = await checkDatabaseHealth();
    console.log('🏥 Database health check:', health);
    
    // Test basic queries
    const { prisma } = await import('../services/database');
    
    // Count tables
    const sports = await prisma.sport.count();
    const platforms = await prisma.platform.count();
    const users = await prisma.user.count();
    const historicalProps = await prisma.historicalProp.count();
    const hitRates = await prisma.hitRate.count();
    
    console.log('\n📊 Database Statistics:');
    console.log(`   Sports: ${sports}`);
    console.log(`   Platforms: ${platforms}`);
    console.log(`   Users: ${users}`);
    console.log(`   Historical Props: ${historicalProps}`);
    console.log(`   Hit Rates: ${hitRates}`);
    
    // Test system config
    const configs = await prisma.systemConfig.findMany();
    console.log(`   System Configs: ${configs.length}`);
    
    if (configs.length > 0) {
      console.log('\n⚙️  System Configuration:');
      configs.forEach(config => {
        console.log(`   ${config.key}: ${JSON.stringify(config.value)}`);
      });
    }
    
    console.log('\n✅ All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    // Provide helpful error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('ECONNREFUSED')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Make sure PostgreSQL is running');
      console.log('   2. Check your DATABASE_URL in .env file');
      console.log('   3. Verify database credentials');
      console.log('   4. Ensure database exists');
    } else if (errorMessage.includes('authentication failed')) {
      console.log('\n💡 Authentication issue:');
      console.log('   1. Check username/password in DATABASE_URL');
      console.log('   2. Verify user has access to the database');
      console.log('   3. Check pg_hba.conf settings');
    } else if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
      console.log('\n💡 Database does not exist:');
      console.log('   1. Create the database: CREATE DATABASE oddsly_db;');
      console.log('   2. Run: npm run db:push');
      console.log('   3. Run: npm run db:seed');
    }
    
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run the test
if (require.main === module) {
  testConnection();
}

export { testConnection };
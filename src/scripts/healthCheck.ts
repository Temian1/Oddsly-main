#!/usr/bin/env tsx

import { checkDatabaseHealth, connectDatabase, disconnectDatabase } from '../services/database';

interface HealthMetrics {
  database: {
    status: string;
    responseTime: number;
    connections?: number;
    version?: string;
  };
  tables: {
    users: number;
    historicalProps: number;
    hitRates: number;
    userBets: number;
    userBookmarks: number;
  };
  performance: {
    avgQueryTime: number;
    slowQueries: number;
  };
  storage: {
    databaseSize: string;
    tablesSizes: Record<string, string>;
  };
}

async function performHealthCheck(): Promise<HealthMetrics> {
  console.log('🏥 Performing comprehensive health check...');
  
  const startTime = Date.now();
  
  try {
    await connectDatabase();
    const { prisma } = await import('../services/database');
    
    // Basic health check
    const dbHealth = await checkDatabaseHealth();
    const responseTime = Date.now() - startTime;
    
    // Get database version and connection info
    const versionResult = await prisma.$queryRaw`SELECT version()` as any[];
    const version = versionResult[0]?.version?.split(' ')[1] || 'Unknown';
    
    // Count records in each table
    const [users, historicalProps, hitRates, userBets, userBookmarks] = await Promise.all([
      prisma.user.count(),
      prisma.historicalProp.count(),
      prisma.hitRate.count(),
      prisma.userBet.count(),
      prisma.userBookmark.count(),
    ]);
    
    // Performance metrics
    const queryStartTime = Date.now();
    await prisma.historicalProp.findFirst();
    const avgQueryTime = Date.now() - queryStartTime;
    
    // Storage information (PostgreSQL specific)
    let databaseSize = 'Unknown';
    let tablesSizes: Record<string, string> = {};
    
    try {
      const sizeResult = await prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      ` as any[];
      databaseSize = sizeResult[0]?.size || 'Unknown';
      
      const tableSizesResult = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      ` as any[];
      
      tablesSizes = tableSizesResult.reduce((acc, row) => {
        acc[row.tablename] = row.size;
        return acc;
      }, {});
    } catch (error) {
      // Fallback for SQLite or other databases
      console.log('ℹ️  Storage metrics not available for this database type');
    }
    
    return {
      database: {
        status: dbHealth.status,
        responseTime,
        version,
      },
      tables: {
        users,
        historicalProps,
        hitRates,
        userBets,
        userBookmarks,
      },
      performance: {
        avgQueryTime,
        slowQueries: 0, // Could be enhanced with actual slow query detection
      },
      storage: {
        databaseSize,
        tablesSizes,
      },
    };
    
  } catch (error) {
    throw new Error(`Health check failed: ${error.message}`);
  }
}

async function displayHealthReport(metrics: HealthMetrics) {
  console.log('\n📊 HEALTH CHECK REPORT');
  console.log('=' .repeat(50));
  
  // Database Status
  const statusIcon = metrics.database.status === 'healthy' ? '✅' : '❌';
  console.log(`\n${statusIcon} Database Status: ${metrics.database.status.toUpperCase()}`);
  console.log(`⏱️  Response Time: ${metrics.database.responseTime}ms`);
  console.log(`🔢 Database Version: ${metrics.database.version}`);
  
  // Table Counts
  console.log('\n📋 Table Statistics:');
  console.log(`   👥 Users: ${metrics.tables.users.toLocaleString()}`);
  console.log(`   📊 Historical Props: ${metrics.tables.historicalProps.toLocaleString()}`);
  console.log(`   🎯 Hit Rates: ${metrics.tables.hitRates.toLocaleString()}`);
  console.log(`   💰 User Bets: ${metrics.tables.userBets.toLocaleString()}`);
  console.log(`   🔖 User Bookmarks: ${metrics.tables.userBookmarks.toLocaleString()}`);
  
  // Performance
  console.log('\n⚡ Performance Metrics:');
  console.log(`   📈 Average Query Time: ${metrics.performance.avgQueryTime}ms`);
  
  const performanceStatus = metrics.performance.avgQueryTime < 100 ? '🟢 Excellent' :
                           metrics.performance.avgQueryTime < 500 ? '🟡 Good' : '🔴 Needs Attention';
  console.log(`   📊 Performance Status: ${performanceStatus}`);
  
  // Storage
  if (metrics.storage.databaseSize !== 'Unknown') {
    console.log('\n💾 Storage Information:');
    console.log(`   📦 Database Size: ${metrics.storage.databaseSize}`);
    
    if (Object.keys(metrics.storage.tablesSizes).length > 0) {
      console.log('   📋 Largest Tables:');
      Object.entries(metrics.storage.tablesSizes)
        .slice(0, 5)
        .forEach(([table, size]) => {
          console.log(`      ${table}: ${size}`);
        });
    }
  }
  
  // Health Score
  let healthScore = 100;
  if (metrics.database.status !== 'healthy') healthScore -= 50;
  if (metrics.database.responseTime > 1000) healthScore -= 20;
  if (metrics.performance.avgQueryTime > 500) healthScore -= 15;
  
  const scoreColor = healthScore >= 90 ? '🟢' :
                    healthScore >= 70 ? '🟡' : '🔴';
  
  console.log(`\n${scoreColor} Overall Health Score: ${healthScore}/100`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (metrics.database.responseTime > 1000) {
    console.log('   ⚠️  High database response time - check network/server load');
  }
  if (metrics.performance.avgQueryTime > 500) {
    console.log('   ⚠️  Slow query performance - consider adding indexes');
  }
  if (metrics.tables.historicalProps > 100000) {
    console.log('   ℹ️  Large historical props table - consider data archiving strategy');
  }
  if (healthScore >= 90) {
    console.log('   ✅ Database is performing well!');
  }
  
  console.log('\n' + '=' .repeat(50));
}

async function main() {
  try {
    const metrics = await performHealthCheck();
    await displayHealthReport(metrics);
    
    // Export metrics as JSON if requested
    if (process.argv.includes('--json')) {
      console.log('\n📄 JSON Export:');
      console.log(JSON.stringify(metrics, null, 2));
    }
    
    // Set exit code based on health
    const isHealthy = metrics.database.status === 'healthy' && 
                     metrics.database.responseTime < 2000;
    
    process.exit(isHealthy ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure database is running');
    console.log('   2. Check DATABASE_URL in .env');
    console.log('   3. Verify network connectivity');
    console.log('   4. Run: npm run db:test');
    
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run health check
if (require.main === module) {
  main();
}

export { performHealthCheck, displayHealthReport };
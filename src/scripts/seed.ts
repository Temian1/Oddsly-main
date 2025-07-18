#!/usr/bin/env tsx

import { seedDatabase, connectDatabase, disconnectDatabase } from '../services/database';
import { AuthService } from '../services/authClient';
import { DataServiceNode } from '../services/dataServiceNode';
import { NODE_CONFIG } from '../config/nodeEnv';

async function main() {
  console.log('🌱 Starting database seed...');
  
  try {
    // Connect to database
    await connectDatabase();
    
    // Seed basic data (sports, platforms, system config)
    await seedDatabase();
    
    // Create admin user
    await createAdminUser();
    
    // Seed sample historical data (optional)
    if (NODE_CONFIG.SEED_SAMPLE_DATA) {
      await seedSampleData();
    }
    
    console.log('✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('- Sports: NBA, NFL, MLB, NHL, WNBA');
    console.log('- Platforms: Underdog, PrizePicks, Pick6');
    console.log('- Admin user created');
    console.log('- System configuration set');
    
    if (NODE_CONFIG.SEED_SAMPLE_DATA) {
      console.log('- Sample historical data added');
    }
    
    console.log('\n🚀 Ready to start the application!');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

async function createAdminUser() {
  try {
    const adminEmail = NODE_CONFIG.ADMIN_EMAIL || 'admin@oddsly.com';
    const adminPassword = NODE_CONFIG.ADMIN_PASSWORD || 'Admin123!@#';
    
    console.log('👤 Creating admin user...');
    
    // Check if admin already exists
    const existingAdmin = await AuthService.getProfile('admin');
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists, skipping...');
      return;
    }
    
    // Create admin user
    await AuthService.register({
      email: adminEmail,
      password: adminPassword,
      fullName: 'System Administrator',
    });
    
    // Update user role to admin (direct database update)
    const { prisma } = await import('../services/database');
    await prisma.user.update({
      where: { email: adminEmail },
      data: { 
        role: 'admin',
        isVerified: true,
        subscriptionStatus: 'premium'
      },
    });
    
    console.log(`✅ Admin user created: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('⚠️  Please change the admin password after first login!');
    
  } catch (error) {
    console.error('Failed to create admin user:', error);
    throw error;
  }
}

async function seedSampleData() {
  console.log('📊 Seeding sample historical data...');
  
  try {
    const { prisma } = await import('../services/database');
    
    // Get sports and platforms
    const nba = await prisma.sport.findUnique({ where: { key: 'basketball_nba' } });
    const nfl = await prisma.sport.findUnique({ where: { key: 'americanfootball_nfl' } });
    const underdog = await prisma.platform.findUnique({ where: { key: 'underdog' } });
    const prizepicks = await prisma.platform.findUnique({ where: { key: 'prizepicks' } });
    
    if (!nba || !nfl || !underdog || !prizepicks) {
      throw new Error('Required sports or platforms not found');
    }
    
    // Sample NBA players and props
    const nbaPlayers = [
      { name: 'LeBron James', props: [{ type: 'points', lines: [25.5, 27.5, 29.5] }] },
      { name: 'Stephen Curry', props: [{ type: 'points', lines: [24.5, 26.5, 28.5] }, { type: 'threes', lines: [3.5, 4.5, 5.5] }] },
      { name: 'Giannis Antetokounmpo', props: [{ type: 'points', lines: [28.5, 30.5, 32.5] }, { type: 'rebounds', lines: [10.5, 11.5, 12.5] }] },
      { name: 'Luka Doncic', props: [{ type: 'points', lines: [26.5, 28.5, 30.5] }, { type: 'assists', lines: [7.5, 8.5, 9.5] }] },
      { name: 'Jayson Tatum', props: [{ type: 'points', lines: [25.5, 27.5, 29.5] }] },
    ];
    
    // Sample NFL players and props
    const nflPlayers = [
      { name: 'Josh Allen', props: [{ type: 'passing_yards', lines: [245.5, 265.5, 285.5] }, { type: 'passing_tds', lines: [1.5, 2.5] }] },
      { name: 'Patrick Mahomes', props: [{ type: 'passing_yards', lines: [255.5, 275.5, 295.5] }] },
      { name: 'Derrick Henry', props: [{ type: 'rushing_yards', lines: [65.5, 75.5, 85.5] }] },
      { name: 'Cooper Kupp', props: [{ type: 'receiving_yards', lines: [55.5, 65.5, 75.5] }] },
      { name: 'Travis Kelce', props: [{ type: 'receiving_yards', lines: [45.5, 55.5, 65.5] }] },
    ];
    
    // Generate historical data for the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    let propsCreated = 0;
    
    // NBA historical data
    for (const player of nbaPlayers) {
      for (const propType of player.props) {
        for (const line of propType.lines) {
          for (let i = 0; i < 10; i++) { // 10 games per line
            const gameDate = new Date(startDate);
            gameDate.setDate(gameDate.getDate() + Math.floor(Math.random() * 30));
            
            // Simulate actual results with some variance
            const variance = (Math.random() - 0.5) * 10; // ±5 variance
            const actualResult = line + variance;
            const hit = actualResult >= line;
            
            await DataServiceNode.saveHistoricalProp({
              playerName: player.name,
              propType: propType.type,
              line,
              actualResult,
              hit,
              gameDate,
              sport: 'basketball_nba',
              platform: Math.random() > 0.5 ? 'underdog' : 'prizepicks',
              odds: Math.floor(Math.random() * 200) - 110, // Random odds between -110 and +90
            });
            
            propsCreated++;
          }
        }
      }
    }
    
    // NFL historical data
    for (const player of nflPlayers) {
      for (const propType of player.props) {
        for (const line of propType.lines) {
          for (let i = 0; i < 5; i++) { // 5 games per line (NFL plays weekly)
            const gameDate = new Date(startDate);
            gameDate.setDate(gameDate.getDate() + (i * 7)); // Weekly games
            
            // Simulate actual results
            const variance = (Math.random() - 0.5) * 20; // ±10 variance
            const actualResult = line + variance;
            const hit = actualResult >= line;
            
            await DataServiceNode.saveHistoricalProp({
              playerName: player.name,
              propType: propType.type,
              line,
              actualResult,
              hit,
              gameDate,
              sport: 'americanfootball_nfl',
              platform: Math.random() > 0.5 ? 'underdog' : 'prizepicks',
              odds: Math.floor(Math.random() * 200) - 110,
            });
            
            propsCreated++;
          }
        }
      }
    }
    
    console.log(`✅ Created ${propsCreated} sample historical props`);
    
    // Calculate and save hit rates
    console.log('📈 Calculating hit rates...');
    const hitRateResult = await DataServiceNode.recalculateAllHitRates();
    console.log(`✅ Calculated ${hitRateResult.hitRatesCount} hit rates`);
    
    if (hitRateResult.errors.length > 0) {
      console.log('⚠️  Hit rate calculation warnings:');
      hitRateResult.errors.forEach(error => console.log(`   - ${error}`));
    }
    
  } catch (error) {
    console.error('Failed to seed sample data:', error);
    throw error;
  }
}

// Run the seed function
if (require.main === module) {
  main();
}

export { main as seedDatabase };
/**
 * Node.js-compatible API service
 * For use in server-side scripts like seed.ts that run in Node.js environment
 * Uses process.env instead of import.meta.env
 */

import axios from 'axios';
import { NODE_CONFIG } from '../config/nodeEnv';

const API_BASE_URL = NODE_CONFIG.API_BASE_URL;
const API_KEY = NODE_CONFIG.ODDS_API_KEY;

// DFS Platform Configuration (same as browser version)
const DFS_PLATFORMS = {
  PRIZEPICKS: 'us_dfs.prizepicks',
  UNDERDOG: 'us_dfs.underdog',
  PICK6: 'us_dfs.pick6'
} as const;

// Sport-specific market mappings (same as browser version)
const SPORT_MARKETS = {
  'basketball_nba': [
    'player_points',
    'player_rebounds',
    'player_assists',
    'player_threes',
    'player_steals',
    'player_blocks',
    'player_turnovers',
    'player_double_double',
    'player_triple_double',
    'player_fantasy_points'
  ],
  'basketball_wnba': [
    'player_points',
    'player_rebounds',
    'player_assists',
    'player_threes',
    'player_steals',
    'player_blocks',
    'player_turnovers',
    'player_double_double',
    'player_triple_double',
    'player_fantasy_points'
  ],
  'americanfootball_nfl': [
    'player_pass_tds',
    'player_pass_yds',
    'player_pass_attempts',
    'player_pass_completions',
    'player_pass_interceptions',
    'player_rush_yds',
    'player_rush_attempts',
    'player_receptions',
    'player_reception_yds',
    'player_anytime_td',
    'player_1st_td',
    'player_fantasy_points'
  ],
  'baseball_mlb': [
    'player_hits',
    'player_runs',
    'player_rbis',
    'player_strikeouts',
    'player_home_runs',
    'player_fantasy_points'
  ],
  'icehockey_nhl': [
    'player_goals',
    'player_assists',
    'player_shots_on_goal',
    'player_saves',
    'player_fantasy_points'
  ]
} as const;

/**
 * Get sport-specific markets for API calls
 */
export function getSportMarkets(sport: string): string[] {
  return [...(SPORT_MARKETS[sport as keyof typeof SPORT_MARKETS] || [])];
}

/**
 * Fetch DFS props for a specific sport (Node.js version)
 * Used primarily for data seeding and server-side operations
 */
export const fetchDFSPropsNode = async (
  sport: string,
  region: string = 'us'
): Promise<any> => {
  try {
    console.log(`🔍 Fetching DFS props for ${sport}...`);
    
    // Get sport-specific markets
    const markets = getSportMarkets(sport);
    if (markets.length === 0) {
      console.warn(`No markets configured for sport: ${sport}`);
      return [];
    }

    // Use first 4 markets to avoid URL length issues
    const selectedMarkets = markets.slice(0, 4);
    
    const response = await axios.get(`${API_BASE_URL}/sports/${sport}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: region,
        markets: selectedMarkets.join(','),
        oddsFormat: 'american',
        dateFormat: 'iso'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`✅ Fetched ${response.data?.length || 0} DFS props for ${sport}`);
    return response.data || [];
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`❌ API Error for ${sport}:`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        url: error.config?.url
      });
    } else {
      console.error(`❌ Unexpected error fetching DFS props for ${sport}:`, error);
    }
    return [];
  }
};

/**
 * Fetch available sports (Node.js version)
 */
export const fetchSportsNode = async (): Promise<any[]> => {
  try {
    console.log('🏈 Fetching available sports...');
    
    const response = await axios.get(`${API_BASE_URL}/sports`, {
      params: { 
        apiKey: API_KEY
      },
      timeout: 10000
    });
    
    console.log(`✅ Fetched ${response.data?.length || 0} sports`);
    return response.data || [];
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ API Error fetching sports:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    } else {
      console.error('❌ Unexpected error fetching sports:', error);
    }
    return [];
  }
};

/**
 * Test API connectivity (Node.js version)
 */
export const testApiConnectionNode = async (): Promise<boolean> => {
  try {
    console.log('🔌 Testing API connection...');
    
    const response = await axios.get(`${API_BASE_URL}/sports`, {
      params: { apiKey: API_KEY },
      timeout: 5000
    });
    
    const isConnected = response.status === 200 && Array.isArray(response.data);
    console.log(isConnected ? '✅ API connection successful' : '❌ API connection failed');
    
    return isConnected;
    
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    return false;
  }
};

// Export constants for use in other Node.js scripts
export { DFS_PLATFORMS, SPORT_MARKETS };
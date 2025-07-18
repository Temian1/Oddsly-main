import axios from 'axios';
import { useAuth } from '../authorization/AuthContext';

const API_BASE_URL = 'https://api.the-odds-api.com/v4';
const GLOBAL_API_KEY = import.meta.env.VITE_ODDS_API_KEY;

// Hook to get the appropriate API key for the current user
export const useApiKey = () => {
  const { user } = useAuth();
  
  // Return user's personal API key if active, otherwise use global key
  if (user?.apiKeyActive && user?.oddsApiKey) {
    return user.oddsApiKey;
  }
  
  return GLOBAL_API_KEY;
};

// Enhanced API service that uses user-specific API keys
export class UserAwareApiService {
  private static getApiKey(userApiKey?: string, userApiKeyActive?: boolean): string {
    if (userApiKeyActive && userApiKey) {
      return userApiKey;
    }
    return GLOBAL_API_KEY;
  }

  // Fetch sports with user-specific API key
  static async fetchSports(userApiKey?: string, userApiKeyActive?: boolean) {
    const apiKey = this.getApiKey(userApiKey, userApiKeyActive);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/sports`, {
        params: {
          apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sports:', error);
      throw error;
    }
  }

  // Fetch odds with user-specific API key
  static async fetchOdds(
    sport: string,
    regions: string = 'us',
    markets: string = 'h2h',
    userApiKey?: string,
    userApiKeyActive?: boolean
  ) {
    const apiKey = this.getApiKey(userApiKey, userApiKeyActive);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/sports/${sport}/odds`, {
        params: {
          apiKey,
          regions,
          markets,
          oddsFormat: 'american',
          dateFormat: 'iso',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching odds:', error);
      throw error;
    }
  }

  // Fetch player props with user-specific API key
  static async fetchPlayerProps(
    sport: string,
    regions: string = 'us',
    markets: string[],
    userApiKey?: string,
    userApiKeyActive?: boolean
  ) {
    const apiKey = this.getApiKey(userApiKey, userApiKeyActive);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/sports/${sport}/odds`, {
        params: {
          apiKey,
          regions,
          markets: markets.join(','),
          oddsFormat: 'american',
          dateFormat: 'iso',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching player props:', error);
      throw error;
    }
  }

  // Fetch DFS props with user-specific API key
  static async fetchDFSProps(
    sport: string,
    matchId: string,
    platforms: string[],
    _includeAlternates: boolean = false,
    userApiKey?: string,
    userApiKeyActive?: boolean
  ) {
    const apiKey = this.getApiKey(userApiKey, userApiKeyActive);
    
    if (!matchId) {
      throw new Error('Match ID is required for DFS props');
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/sports/${sport}/events/${matchId}/odds`, {
        params: {
          apiKey,
          regions: 'us,us2',
          markets: platforms.slice(0, 10).join(','), // Limit to prevent URL length issues
          oddsFormat: 'american',
          dateFormat: 'iso',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching DFS props:', error);
      throw error;
    }
  }

  // Validate API key
  static async validateApiKey(apiKey: string): Promise<{ valid: boolean; remainingRequests?: number; error?: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/sports`, {
        params: {
          apiKey,
        },
      });
      
      // Check response headers for rate limit info
      const remainingRequests = response.headers['x-requests-remaining'];
      
      return {
        valid: true,
        remainingRequests: remainingRequests ? parseInt(remainingRequests) : undefined,
      };
    } catch (error: any) {
      let errorMessage = 'Invalid API key';
      
      if (error.response?.status === 401) {
        errorMessage = 'API key is invalid or expired';
      } else if (error.response?.status === 429) {
        errorMessage = 'API key has exceeded rate limits';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  // Track API usage (for user's personal key)
  static async trackApiUsage(userId: string, userApiKey?: string, userApiKeyActive?: boolean) {
    // Only track if user is using their personal API key
    if (!userApiKeyActive || !userApiKey) {
      return;
    }

    try {
      // This would typically be a backend call to update the user's API usage count
      // For now, we'll just log it
      console.log(`API usage tracked for user ${userId}`);
      
      // In a real implementation, you would:
      // 1. Call your backend API to increment the user's apiUsageCount
      // 2. Reset the count monthly based on apiUsageResetDate
      // 3. Potentially enforce usage limits based on subscription tier
    } catch (error) {
      console.error('Error tracking API usage:', error);
    }
  }
}

// Export the hook for use in components
export default UserAwareApiService;
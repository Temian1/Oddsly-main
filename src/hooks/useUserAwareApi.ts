import { useCallback } from 'react';
import { useAuth } from '../authorization/AuthContext';
import UserAwareApiService from '../services/userAwareApi';

// Custom hook that provides user-aware API functions
export const useUserAwareApi = () => {
  const { user } = useAuth();

  // Get the current API key configuration
  const getApiConfig = useCallback(() => {
    return {
      apiKey: user?.oddsApiKey,
      apiKeyActive: user?.apiKeyActive || false,
      isUsingPersonalKey: user?.apiKeyActive && !!user?.oddsApiKey,
      usageCount: user?.apiUsageCount || 0,
    };
  }, [user]);

  // Fetch sports with user's API key
  const fetchSports = useCallback(async () => {
    const result = await UserAwareApiService.fetchSports(
      user?.oddsApiKey,
      user?.apiKeyActive
    );
    
    // Track usage if using personal key
    if (user?.apiKeyActive && user?.oddsApiKey && user?.id) {
      await UserAwareApiService.trackApiUsage(user.id, user.oddsApiKey, user.apiKeyActive);
    }
    
    return result;
  }, [user]);

  // Fetch odds with user's API key
  const fetchOdds = useCallback(async (
    sport: string,
    regions: string = 'us',
    markets: string = 'h2h'
  ) => {
    const result = await UserAwareApiService.fetchOdds(
      sport,
      regions,
      markets,
      user?.oddsApiKey,
      user?.apiKeyActive
    );
    
    // Track usage if using personal key
    if (user?.apiKeyActive && user?.oddsApiKey && user?.id) {
      await UserAwareApiService.trackApiUsage(user.id, user.oddsApiKey, user.apiKeyActive);
    }
    
    return result;
  }, [user]);

  // Fetch player props with user's API key
  const fetchPlayerProps = useCallback(async (
    sport: string,
    regions: string = 'us',
    markets: string[]
  ) => {
    const result = await UserAwareApiService.fetchPlayerProps(
      sport,
      regions,
      markets,
      user?.oddsApiKey,
      user?.apiKeyActive
    );
    
    // Track usage if using personal key
    if (user?.apiKeyActive && user?.oddsApiKey && user?.id) {
      await UserAwareApiService.trackApiUsage(user.id, user.oddsApiKey, user.apiKeyActive);
    }
    
    return result;
  }, [user]);

  // Fetch DFS props with user's API key
  const fetchDFSProps = useCallback(async (
    sport: string,
    matchId: string | undefined,
    platforms: string[],
    includeAlternates: boolean = false
  ) => {
    if (!matchId) {
      throw new Error('Match ID is required for DFS props');
    }
    
    const result = await UserAwareApiService.fetchDFSProps(
      sport,
      matchId,
      platforms,
      includeAlternates,
      user?.oddsApiKey,
      user?.apiKeyActive
    );
    
    // Track usage if using personal key
    if (user?.apiKeyActive && user?.oddsApiKey && user?.id) {
      await UserAwareApiService.trackApiUsage(user.id, user.oddsApiKey, user.apiKeyActive);
    }
    
    return result;
  }, [user]);

  // Validate user's API key
  const validateApiKey = useCallback(async (apiKey: string) => {
    return await UserAwareApiService.validateApiKey(apiKey);
  }, []);

  return {
    // API configuration
    getApiConfig,
    
    // API functions
    fetchSports,
    fetchOdds,
    fetchPlayerProps,
    fetchDFSProps,
    validateApiKey,
    
    // Utility functions
    isUsingPersonalKey: user?.apiKeyActive && !!user?.oddsApiKey,
    hasPersonalKey: !!user?.oddsApiKey,
    usageCount: user?.apiUsageCount || 0,
  };
};

export default useUserAwareApi;
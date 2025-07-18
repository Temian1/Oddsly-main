# User-Specific API Key Management

This document outlines the implementation of user-specific API key management in Oddsly, allowing individual users to manage their own Odds API keys for higher rate limits and personalized usage tracking.

## Overview

The user-specific API key management system allows users to:
- Add their personal Odds API key to their profile
- Validate API keys before saving
- Toggle between using their personal key or the global application key
- Track their API usage and remaining requests
- Benefit from higher rate limits with their own API key

## Implementation Details

### Database Schema Changes

The `User` model in `prisma/schema.prisma` has been extended with the following fields:

```prisma
model User {
  // ... existing fields
  oddsApiKey       String?   // User's personal Odds API key
  apiKeyActive     Boolean   @default(false) // Whether to use personal key
  apiUsageCount    Int       @default(0) // Monthly API usage count
  apiUsageResetDate DateTime? // When usage count resets
}
```

### Core Services

#### UserAwareApiService (`src/services/userAwareApi.ts`)

A new service class that dynamically chooses between user's personal API key and the global key:

- **`getApiKey()`**: Determines which API key to use based on user preferences
- **`fetchSports()`**: Fetch available sports with user-aware API key
- **`fetchOdds()`**: Fetch odds data with user-aware API key
- **`fetchPlayerProps()`**: Fetch player props with user-aware API key
- **`fetchDFSProps()`**: Fetch DFS props with user-aware API key
- **`validateApiKey()`**: Validate an API key and return usage information
- **`trackApiUsage()`**: Track API usage for billing/limiting purposes

#### useUserAwareApi Hook (`src/hooks/useUserAwareApi.ts`)

A React hook that provides user-aware API functions to components:

```typescript
const { fetchSports, fetchOdds, fetchPlayerProps, fetchDFSProps } = useUserAwareApi();
```

The hook automatically:
- Gets the current user's API configuration
- Passes the appropriate API key to service functions
- Tracks API usage for the current user
- Provides usage statistics

### User Interface Changes

#### UserProfile Component (`src/components/Account/UserProfile.tsx`)

Enhanced with API key management features:

- **API Key Input**: Secure password field for entering personal API key
- **Validation Button**: Real-time API key validation with status feedback
- **Activation Toggle**: Checkbox to enable/disable personal API key usage
- **Usage Display**: Shows current month's API usage count
- **Status Indicators**: Visual feedback for validation results

#### Component Updates

All data-fetching components have been updated to use the user-aware API:

- **PlayerProps**: Uses `useUserAwareApi` hook for fetching player props
- **EVPlayerProps**: Uses user-aware DFS props fetching
- **OddsPage**: Uses user-aware odds fetching
- **MatchDetails**: Uses user-aware match details fetching
- **EVDashboard**: Uses user-aware DFS props for dashboard data

### API Key Validation

The validation system provides comprehensive feedback:

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  remainingRequests?: number;
}
```

- **Real-time validation**: Validates keys as users enter them
- **Usage information**: Shows remaining API requests
- **Error handling**: Provides clear error messages for invalid keys
- **Visual feedback**: Green/red indicators for validation status

### Security Considerations

- **Secure Storage**: API keys are stored securely in the database
- **Input Validation**: All API key inputs are validated before storage
- **Error Handling**: Graceful fallback to global key if personal key fails
- **No Logging**: API keys are never logged or exposed in error messages

## Usage Instructions

### For Users

1. **Navigate to Profile**: Go to Account → Profile
2. **Enter API Key**: Add your personal Odds API key in the designated field
3. **Validate Key**: Click "Validate" to verify the key works correctly
4. **Activate Key**: Check the "Use Personal API Key" checkbox
5. **Save Profile**: Save your changes to activate the personal key

### For Developers

#### Using the User-Aware API Hook

```typescript
import { useUserAwareApi } from '../hooks/useUserAwareApi';

const MyComponent = () => {
  const { fetchOdds, fetchPlayerProps } = useUserAwareApi();
  
  const { data } = useQuery({
    queryKey: ['odds', sport],
    queryFn: () => fetchOdds(sport, 'us', 'h2h')
  });
  
  // Component logic...
};
```

#### Direct Service Usage

```typescript
import UserAwareApiService from '../services/userAwareApi';

// With user context
const data = await UserAwareApiService.fetchSports(
  user?.oddsApiKey,
  user?.apiKeyActive
);
```

## Benefits

### For Users
- **Higher Rate Limits**: Personal API keys typically have higher rate limits
- **Usage Tracking**: Monitor your API usage and remaining requests
- **Reliability**: Reduced chance of hitting rate limits during peak usage
- **Control**: Full control over your API usage and costs

### For the Application
- **Scalability**: Distributes API load across multiple keys
- **Cost Management**: Users bear the cost of their own API usage
- **Performance**: Reduced bottlenecks from shared API limits
- **User Experience**: Better performance for users with personal keys

## Configuration

### Environment Variables

The system requires the following environment variable for the global fallback key:

```env
VITE_ODDS_API_KEY=your_global_api_key_here
```

### API Key Sources

Users can obtain API keys from:
- [The Odds API](https://the-odds-api.com/) - Official API provider
- Various pricing tiers available based on usage needs

## Monitoring and Analytics

### Usage Tracking

- **Monthly Reset**: Usage counts reset monthly
- **Real-time Updates**: Usage is tracked with each API call
- **Threshold Alerts**: Users can be notified when approaching limits

### Performance Metrics

- **Response Times**: Track API response times per user
- **Success Rates**: Monitor API call success rates
- **Error Tracking**: Log and analyze API errors by user

## Future Enhancements

### Planned Features

1. **Usage Analytics Dashboard**: Detailed usage statistics and trends
2. **Rate Limit Notifications**: Proactive alerts for approaching limits
3. **Multiple API Key Support**: Support for multiple API keys per user
4. **Cost Tracking**: Integration with API billing information
5. **Team Management**: Shared API keys for team accounts

### Technical Improvements

1. **Caching Layer**: Implement intelligent caching to reduce API calls
2. **Load Balancing**: Distribute calls across multiple user keys
3. **Failover Logic**: Advanced fallback mechanisms for key failures
4. **Usage Optimization**: Smart routing based on user usage patterns

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Ensure the key is correctly copied from the provider
2. **Rate Limit Exceeded**: Check usage statistics and consider upgrading plan
3. **Validation Failures**: Verify network connectivity and key permissions
4. **Fallback Behavior**: System automatically falls back to global key on errors

### Support

For issues with API key management:
1. Check the validation status in your profile
2. Verify your API key with the provider
3. Contact support if problems persist

This implementation provides a robust foundation for user-specific API key management while maintaining backward compatibility and ensuring a smooth user experience.
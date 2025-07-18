# Supabase Integration Setup Guide

This guide will help you integrate Supabase as your cloud PostgreSQL database provider for the Oddsly project.

## Overview

Supabase has been integrated into this project to provide:
- Cloud-hosted PostgreSQL database
- Real-time subscriptions
- Built-in authentication (optional)
- Row Level Security (RLS)
- Auto-generated APIs

The integration works alongside Prisma:
- **Prisma**: Handles schema definition, migrations, and type-safe database access
- **Supabase**: Provides the hosted PostgreSQL database and additional cloud features

## Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `oddsly-production` (or your preferred name)
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose the region closest to your users
5. Click "Create new project"
6. Wait for the project to be provisioned (usually 1-2 minutes)

### 2. Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **anon/public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 3. Update Environment Variables

Update your `.env` file with the Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-public-anon-key"

# Update DATABASE_URL to point to Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:your-db-password@db.your-project-id.supabase.co:5432/postgres"
```

**To get the DATABASE_URL:**
1. Go to **Settings** → **Database**
2. Scroll down to "Connection string"
3. Copy the "URI" format
4. Replace `[YOUR-PASSWORD]` with your actual database password

### 4. Run Prisma Migrations

Now that your DATABASE_URL points to Supabase, run the Prisma migrations to create your tables:

```bash
# Generate Prisma client
npm run db:generate

# Run migrations to create tables in Supabase
npm run db:migrate

# Optional: Seed the database with initial data
npm run db:seed
```

### 5. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/supabase-test` in your browser
3. Click "Run Supabase Tests" to verify the connection
4. You should see:
   - ✅ Configuration status
   - ✅ Connection test results
   - ✅ Database health check
   - ✅ Sample data queries

## File Structure

The Supabase integration adds these files:

```
src/
├── lib/
│   └── supabaseClient.ts          # Supabase client configuration
├── services/
│   └── supabaseService.ts         # Supabase service functions
└── components/
    └── SupabaseTest/
        ├── SupabaseTest.tsx       # Test component
        └── index.ts               # Export file
```

## Usage Examples

### Basic Query
```typescript
import { supabaseService } from '../services/supabaseService';

// Get all sports
const { success, data, error } = await supabaseService.getSports();
if (success) {
  console.log('Sports:', data);
}
```

### Using Supabase Client Directly
```typescript
import { supabase } from '../lib/supabaseClient';

// Query with filters
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('subscription_status', 'premium')
  .limit(10);
```

### Real-time Subscriptions
```typescript
import { supabase } from '../lib/supabaseClient';

// Subscribe to changes
const subscription = supabase
  .channel('user_bookmarks')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_bookmarks'
  }, (payload) => {
    console.log('Bookmark changed:', payload);
  })
  .subscribe();

// Don't forget to unsubscribe
// subscription.unsubscribe();
```

## Security Considerations

### Row Level Security (RLS)

Consider enabling RLS for sensitive tables:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);
```

### Environment Variables

- **Never commit** your actual Supabase credentials to version control
- Use different projects for development, staging, and production
- The `anon` key is safe to use in frontend code
- Keep your `service_role` key secret (not used in this integration)

## Troubleshooting

### Common Issues

1. **"Missing environment variables" error**
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`
   - Restart your dev server after updating `.env`

2. **"relation does not exist" error**
   - Run `npm run db:migrate` to create tables
   - Verify your `DATABASE_URL` is correct

3. **Connection timeout**
   - Check your Supabase project is active
   - Verify the DATABASE_URL format and credentials

4. **CORS errors**
   - Supabase automatically handles CORS for your domain
   - For local development, `localhost` should work by default

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Visit the [Supabase Discord](https://discord.supabase.com)
- Review the test component at `/supabase-test` for debugging

## Next Steps

1. **Enable Authentication**: Use Supabase Auth for user management
2. **Set up Real-time**: Add live updates for bookmarks and bets
3. **Configure RLS**: Implement row-level security policies
4. **Add Edge Functions**: Create serverless functions for complex operations
5. **Set up Backups**: Configure automated database backups

## Migration from Local Database

If you're migrating from a local database:

1. Export your local data:
   ```bash
   pg_dump your_local_db > backup.sql
   ```

2. Import to Supabase using the SQL editor in the Supabase dashboard

3. Update your `DATABASE_URL` to point to Supabase

4. Test thoroughly using the `/supabase-test` page

Your Supabase integration is now complete! 🎉
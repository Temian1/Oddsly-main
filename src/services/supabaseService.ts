/**
 * Supabase Service
 * 
 * This service provides functions to interact with Supabase database
 * and demonstrates the integration with the existing Prisma models.
 * 
 * Note: This works alongside Prisma - Prisma handles migrations and schema,
 * while Supabase provides the hosted PostgreSQL database and additional features.
 */

import { supabase } from '../lib/supabaseClient';
import type { User } from '@prisma/client';

/**
 * Test Supabase connection by attempting to fetch users
 * This function demonstrates that Supabase client is working correctly
 */
export const testSupabaseConnection = async () => {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .limit(5);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.log('Supabase connection test successful');
    return {
      success: true,
      error: null,
      data: data,
      message: `Successfully connected to Supabase. Found ${data?.length || 0} users.`
    };
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
};

/**
 * Get user by ID using Supabase client
 * Demonstrates querying specific records
 */
export const getUserById = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, error: null, data };
  } catch (error) {
    console.error('Error in getUserById:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
};

/**
 * Get all sports using Supabase client
 * Demonstrates querying reference data
 */
export const getSports = async () => {
  try {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .eq('active', true)
      .order('display_name');

    if (error) {
      console.error('Error fetching sports:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, error: null, data };
  } catch (error) {
    console.error('Error in getSports:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
};

/**
 * Get user bookmarks using Supabase client
 * Demonstrates querying related data with joins
 */
export const getUserBookmarks = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_bookmarks')
      .select(`
        *,
        platform:platforms(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user bookmarks:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, error: null, data };
  } catch (error) {
    console.error('Error in getUserBookmarks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
};

/**
 * Create a new user bookmark using Supabase client
 * Demonstrates inserting data
 */
export const createUserBookmark = async (bookmarkData: {
  userId: string;
  playerName: string;
  propType: string;
  line: number;
  platformId: number;
  notes?: string;
  tags?: string[];
}) => {
  try {
    const { data, error } = await supabase
      .from('user_bookmarks')
      .insert({
        user_id: bookmarkData.userId,
        player_name: bookmarkData.playerName,
        prop_type: bookmarkData.propType,
        line: bookmarkData.line,
        platform_id: bookmarkData.platformId,
        notes: bookmarkData.notes,
        tags: bookmarkData.tags || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bookmark:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, error: null, data };
  } catch (error) {
    console.error('Error in createUserBookmark:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
};

/**
 * Get database health status
 * Useful for monitoring and debugging
 */
export const getDatabaseHealth = async () => {
  try {
    // Test multiple table access
    const [usersResult, sportsResult, platformsResult] = await Promise.all([
      supabase.from('users').select('count', { count: 'exact', head: true }),
      supabase.from('sports').select('count', { count: 'exact', head: true }),
      supabase.from('platforms').select('count', { count: 'exact', head: true })
    ]);

    const health = {
      timestamp: new Date().toISOString(),
      tables: {
        users: {
          accessible: !usersResult.error,
          count: usersResult.count || 0,
          error: usersResult.error?.message
        },
        sports: {
          accessible: !sportsResult.error,
          count: sportsResult.count || 0,
          error: sportsResult.error?.message
        },
        platforms: {
          accessible: !platformsResult.error,
          count: platformsResult.count || 0,
          error: platformsResult.error?.message
        }
      },
      overall: !usersResult.error && !sportsResult.error && !platformsResult.error
    };

    return { success: true, error: null, data: health };
  } catch (error) {
    console.error('Error checking database health:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
};

// Export all functions as a service object for easier importing
export const supabaseService = {
  testConnection: testSupabaseConnection,
  getUserById,
  getSports,
  getUserBookmarks,
  createUserBookmark,
  getDatabaseHealth
};

export default supabaseService;
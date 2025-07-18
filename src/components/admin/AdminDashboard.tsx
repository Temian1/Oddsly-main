/* ++++++++++ ADMIN DASHBOARD COMPONENT ++++++++++ */
import React, { useState, useEffect } from 'react';
import dataAutomationClient from '../../services/dataAutomationClient';

// Admin interfaces
interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalBets: number;
  totalRevenue: number;
  systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  dataAutomationStatus: 'RUNNING' | 'STOPPED' | 'ERROR';
  lastDataUpdate: Date | null;
}

interface UserManagementData {
  users: UserProfile[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// Admin Dashboard Component
export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system' | 'analytics'>('overview');
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [userManagement, setUserManagement] = useState<UserManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [stats, users] = await Promise.all([
        loadSystemStats(),
        loadUserManagement(1, 10)
      ]);
      
      setSystemStats(stats);
      setUserManagement(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async (): Promise<SystemStats> => {
    // This would typically call an admin API endpoint
    // For now, we'll simulate the data
    return {
      totalUsers: 1250,
      activeUsers: 890,
      totalBets: 15420,
      totalRevenue: 125000,
      systemHealth: 'HEALTHY',
      dataAutomationStatus: 'RUNNING',
      lastDataUpdate: new Date()
    };
  };

  const loadUserManagement = async (page: number, pageSize: number): Promise<UserManagementData> => {
    // TODO: Implement admin user management API
    // const adminUserId = 'current-admin-id'; // Get from auth context
    // const users = await AuthService.getAllUsers(adminUserId);
    
    // Mock data for now
    const mockUsers: UserProfile[] = [
      {
        id: '1',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    
    return {
      users: mockUsers.slice((page - 1) * pageSize, page * pageSize),
      totalCount: mockUsers.length,
      currentPage: page,
      pageSize
    };
  };

  const handleUserRoleUpdate = async (userId: string, newRole: string) => {
    try {
      // TODO: Implement user role update API
      // const adminUserId = 'current-admin-id'; // Get from auth context
      // await AuthService.updateUserRole(adminUserId, userId, newRole);
      console.log(`Updating user ${userId} role to ${newRole}`);
      await loadUserManagement(userManagement?.currentPage || 1, userManagement?.pageSize || 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  const handleDataAutomationToggle = async () => {
    try {
      // For client-side, we'll simulate the toggle and refresh data
      if (systemStats?.dataAutomationStatus === 'RUNNING') {
        // Simulate stopping automation
        console.log('Stopping data automation...');
      } else {
        // Start automation by refreshing data
        await dataAutomationClient.refreshAllData();
      }
      await loadSystemStats().then(setSystemStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle data automation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Manage users, monitor system health, and view analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                systemStats?.systemHealth === 'HEALTHY' ? 'bg-green-100 text-green-800' :
                systemStats?.systemHealth === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                System {systemStats?.systemHealth}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'users', name: 'User Management', icon: '👥' },
              { id: 'system', name: 'System Health', icon: '⚙️' },
              { id: 'analytics', name: 'Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab systemStats={systemStats} />
        )}
        
        {activeTab === 'users' && (
          <UserManagementTab 
            userManagement={userManagement}
            onRoleUpdate={handleUserRoleUpdate}
            onLoadUsers={loadUserManagement}
          />
        )}
        
        {activeTab === 'system' && (
          <SystemHealthTab 
            systemStats={systemStats}
            onDataAutomationToggle={handleDataAutomationToggle}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ systemStats: SystemStats | null }> = ({ systemStats }) => {
  if (!systemStats) return <div>Loading...</div>;

  const stats = [
    { name: 'Total Users', value: systemStats.totalUsers.toLocaleString(), icon: '👥', color: 'blue' },
    { name: 'Active Users', value: systemStats.activeUsers.toLocaleString(), icon: '🟢', color: 'green' },
    { name: 'Total Bets', value: systemStats.totalBets.toLocaleString(), icon: '🎯', color: 'purple' },
    { name: 'Revenue', value: `$${systemStats.totalRevenue.toLocaleString()}`, icon: '💰', color: 'yellow' }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="text-lg font-medium text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              📊 View Analytics
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
              🔄 Refresh Data
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
              ⚙️ System Settings
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {[
                { action: 'New user registration', user: 'john@example.com', time: '2 minutes ago' },
                { action: 'Data automation completed', user: 'System', time: '15 minutes ago' },
                { action: 'High-value bet placed', user: 'sarah@example.com', time: '1 hour ago' }
              ].map((activity, index) => (
                <li key={index}>
                  <div className="relative pb-8">
                    {index !== 2 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                          <span className="text-white text-sm">•</span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            {activity.action} <span className="font-medium text-gray-900">{activity.user}</span>
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// User Management Tab Component
const UserManagementTab: React.FC<{
  userManagement: UserManagementData | null;
  onRoleUpdate: (userId: string, newRole: string) => void;
  onLoadUsers: (page: number, pageSize: number) => Promise<UserManagementData>;
}> = ({ userManagement, onRoleUpdate }) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  if (!userManagement) return <div>Loading users...</div>;

  const filteredUsers = userManagement.users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search Users</label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email or name..."
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700">Filter by Role</label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Roles</option>
              <option value="USER">User</option>
              <option value="PREMIUM">Premium</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              Export Users
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Users ({filteredUsers.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.firstName?.[0] || user.email[0].toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => onRoleUpdate(user.id, e.target.value)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="USER">User</option>
                        <option value="PREMIUM">Premium</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Suspend</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// System Health Tab Component
const SystemHealthTab: React.FC<{
  systemStats: SystemStats | null;
  onDataAutomationToggle: () => void;
}> = ({ systemStats, onDataAutomationToggle }) => {
  if (!systemStats) return <div>Loading system health...</div>;

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Overall Health</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                systemStats.systemHealth === 'HEALTHY' ? 'bg-green-100 text-green-800' :
                systemStats.systemHealth === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {systemStats.systemHealth}
              </span>
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Data Automation</span>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  systemStats.dataAutomationStatus === 'RUNNING' ? 'bg-green-100 text-green-800' :
                  systemStats.dataAutomationStatus === 'STOPPED' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {systemStats.dataAutomationStatus}
                </span>
                <button
                  onClick={onDataAutomationToggle}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {systemStats.dataAutomationStatus === 'RUNNING' ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Last Data Update</span>
              <span className="text-sm text-gray-900">
                {systemStats.lastDataUpdate ? 
                  new Date(systemStats.lastDataUpdate).toLocaleString() : 
                  'Never'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Health */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Database Health</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Connection Status</h4>
              <p className="text-sm text-gray-500">Database connectivity</p>
            </div>
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Query Performance</h4>
              <p className="text-sm text-gray-500">Average response time</p>
            </div>
            <span className="text-sm font-medium text-gray-900">45ms</span>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Storage Usage</h4>
              <p className="text-sm text-gray-500">Database size</p>
            </div>
            <span className="text-sm font-medium text-gray-900">2.3 GB</span>
          </div>
        </div>
      </div>

      {/* API Health */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">API Health</h3>
        <div className="space-y-4">
          {[
            { name: 'Odds API', status: 'HEALTHY', lastCheck: '2 minutes ago', responseTime: '120ms' },
            { name: 'DraftKings API', status: 'HEALTHY', lastCheck: '5 minutes ago', responseTime: '95ms' },
            { name: 'PrizePicks API', status: 'WARNING', lastCheck: '10 minutes ago', responseTime: '450ms' },
            { name: 'Underdog API', status: 'HEALTHY', lastCheck: '3 minutes ago', responseTime: '180ms' }
          ].map((api) => (
            <div key={api.name} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{api.name}</h4>
                <p className="text-sm text-gray-500">Last check: {api.lastCheck}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  api.status === 'HEALTHY' ? 'bg-green-100 text-green-800' :
                  api.status === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {api.status}
                </span>
                <p className="text-sm text-gray-500 mt-1">{api.responseTime}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeframe]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    // Simulate loading analytics data
    setTimeout(() => {
      setAnalyticsData({
        userGrowth: {
          current: 1250,
          previous: 1100,
          change: 13.6
        },
        bettingVolume: {
          current: 15420,
          previous: 12800,
          change: 20.5
        },
        revenue: {
          current: 125000,
          previous: 98000,
          change: 27.6
        },
        topPerformers: [
          { email: 'user1@example.com', roi: 45.2, bets: 156 },
          { email: 'user2@example.com', roi: 38.7, bets: 203 },
          { email: 'user3@example.com', roi: 32.1, bets: 89 }
        ]
      });
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Analytics Overview</h3>
          <div className="flex space-x-2">
            {[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
              { value: '1y', label: '1 Year' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeframe(option.value as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  timeframe === option.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          {
            name: 'User Growth',
            current: analyticsData?.userGrowth.current,
            change: analyticsData?.userGrowth.change,
            icon: '👥'
          },
          {
            name: 'Betting Volume',
            current: analyticsData?.bettingVolume.current,
            change: analyticsData?.bettingVolume.change,
            icon: '🎯'
          },
          {
            name: 'Revenue',
            current: `$${analyticsData?.revenue.current?.toLocaleString()}`,
            change: analyticsData?.revenue.change,
            icon: '💰'
          }
        ].map((metric) => (
          <div key={metric.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{metric.icon}</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{metric.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{metric.current}</div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.change >= 0 ? '↗' : '↘'}
                        {Math.abs(metric.change)}%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Performers */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Performing Users</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Bets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData?.topPerformers.map((user: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      +{user.roi}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.bets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
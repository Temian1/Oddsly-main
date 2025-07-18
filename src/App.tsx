/* ++++++++++ IMPORTS ++++++++++ */
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

/* ++++++++++ HEADER ++++++++++ */
import Header from './components/Header/Header';

/* ++++++++++ HOME ++++++++++ */
import Home from './components/Home/Home';

/* ++++++++++ MAIN CONTENT ++++++++++ */
import OddsPage from './components/OddsPage';
import MatchDetailsPage from './components/Match Details/MatchDetails';

/* ++++++++++ PLAYER PROPS & EV ++++++++++ */
import { PlayerProps } from './components/Player Props/PlayerProps';
import EVPlayerProps from './components/Player Props/EVPlayerProps';
import ValueHighlighter from './components/ValueHighlighting/ValueHighlighter';
import EVDashboard from './components/Dashboard/EVDashboard';

/* ++++++++++ AUTHORIZATION / LOGIN ++++++++++ */
import { AuthProvider, useAuth } from "./authorization/AuthContext";
import Login from "./components/Account/Login";
import RingLoader from 'react-spinners/RingLoader'

/* ++++++++++ DATABASE - SERVER SIDE ONLY ++++++++++ */
// Database operations moved to server-side API endpoints

/* ++++++++++ USER PROFILE ++++++++++ */
import UserProfile from './components/Account/UserProfile';

/* ++++++++++ ADMIN ++++++++++ */
import AdminDashboard from './components/admin/AdminDashboard';

/* ++++++++++ LEGAL ++++++++++ */
import TermsPage from './components/Legal/TermsPage';
import PrivacyPolicyPage from './components/Legal/PrivacyPolicyPage';

/* ++++++++++ SUPABASE TEST ++++++++++ */
import SupabaseTest from './components/SupabaseTest';

/* ++++++++++ STYLES ++++++++++ */
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const [bankroll, setBankroll] = useState<number>(10000);
  const { user, loading } = useAuth();

  // Database connection handled by server-side API endpoints

  // Get current location
  const location = window.location.pathname;
  const isLoginPage = location === '/login';

  if (loading) {
    return (

      <div className="flex items-center justify-center min-h-screen">
        <RingLoader size={300} color='white' speedMultiplier={1.25}/>
      </div>

    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#171717]">

        {!isLoginPage && <Header />}

        <Routes>
            {/* Home page as default route */}
            <Route path="/" element={<Home />} />
            
            {/* Login page */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute user={user}>
                  <EVDashboard bankroll={bankroll} setBankroll={setBankroll} />
                </PrivateRoute>
              }
            />
            <Route
              path="/odds"
              element={
                <PrivateRoute user={user}>
                  <OddsPage bankroll={bankroll} setBankroll={setBankroll} />
                </PrivateRoute>
              }
            />
            <Route
              path="/match/:sportKey/:matchId"
              element={
                <PrivateRoute user={user}>
                  <MatchDetailsPage bankroll={bankroll} setBankroll={setBankroll} />
                </PrivateRoute>
              }
            />
            
            {/* Player Props Routes */}
            <Route
              path="/props"
              element={
                <PrivateRoute user={user}>
                  <PlayerProps sportKey="basketball_nba" matchId="" />
                </PrivateRoute>
              }
            />
            <Route
              path="/ev-props"
              element={
                <PrivateRoute user={user}>
                  <EVPlayerProps sportKey="basketball_nba" bankroll={bankroll} setBankroll={setBankroll} />
                </PrivateRoute>
              }
            />
            <Route
              path="/value-highlights"
              element={
                <PrivateRoute user={user}>
                  <ValueHighlighter props={[]} />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/profile"
              element={
                <PrivateRoute user={user}>
                  <UserProfile />
                </PrivateRoute>
              }
            />
            
            {/* Admin Dashboard - Only accessible by admin users */}
            <Route
              path="/admin"
              element={
                <AdminRoute user={user}>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* Legal pages */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            
            {/* Supabase Test page */}
            <Route path="/supabase-test" element={<SupabaseTest />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/* ++++++++++ PRIVATE ROUTE ++++++++++ */
// PrivateRoute Component to handle protected routes

/*
// UNCOMMENT TO DEACTIVATE AUTHORIZATION
function PrivateRoute({ children }: { user: any; children: JSX.Element }) { // Add user prop
  return children
}
*/

// UNCOMMENT TO ACTIVATE AUTHORIZATION
function PrivateRoute({ user, children }: { user: unknown; children: JSX.Element }) { // Add user prop
  return user ? children : <Navigate to="/login" replace />; // Redirect to login if user is not authenticated
}

/* ++++++++++ ADMIN ROUTE ++++++++++ */
// AdminRoute Component to handle admin-only routes
function AdminRoute({ user, children }: { user: any; children: JSX.Element }) {
  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has admin role
  if (user.role !== 'ADMIN' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-sm text-gray-500 mb-4">
            You don't have permission to access the admin dashboard. This area is restricted to administrators only.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return children;
}


function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

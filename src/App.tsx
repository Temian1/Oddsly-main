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

/* ++++++++++ LEGAL ++++++++++ */
import TermsPage from './components/Legal/TermsPage';
import PrivacyPolicyPage from './components/Legal/PrivacyPolicyPage';

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

            {/* Legal pages */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
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


function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

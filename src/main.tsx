/* ++++++++++ IMPORTS ++++++++++ */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* ++++++++++ ERROR BOUNDARY ++++++++++ */
import ErrorBoundary from './components/ErrorBoundary.tsx'

/* ++++++++++ ENVIRONMENT GUARD ++++++++++ */
import { EnvironmentGuard } from './components/EnvironmentError.tsx'

/* ++++++++++ AUTHORIZATION ++++++++++ */
import { AuthProvider } from './authorization/AuthContext.tsx'

/* ++++++++++ ALL CONTENT ++++++++++ */
import App from './App.tsx'

/* ++++++++++ STYLES ++++++++++ */
import './index.css'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <EnvironmentGuard>
        <AuthProvider>
          <App />
        </AuthProvider>
      </EnvironmentGuard>
    </ErrorBoundary>
  </StrictMode>,
)


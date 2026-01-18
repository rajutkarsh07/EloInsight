import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Games } from './pages/Games';
import { Analysis } from './pages/Analysis';
import { LinkedAccounts } from './pages/LinkedAccounts';
import { SyncJobs } from './pages/SyncJobs';
import { AnalysisJobs } from './pages/AnalysisJobs';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Auth guard component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="games" element={<Games />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="linked-accounts" element={<LinkedAccounts />} />
            <Route path="sync-jobs" element={<SyncJobs />} />
            <Route path="analysis-jobs" element={<AnalysisJobs />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

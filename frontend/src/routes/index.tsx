import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import VerifyEmail from '../pages/VerifyEmail';
import Dashboard from '../pages/Dashboard';
import GamesList from '../pages/GamesList';
import AnalysisViewer from '../pages/AnalysisViewer';
import { authService } from '../services/authService';

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!authService.isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

// Public route wrapper (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    if (authService.isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
};

export const router = createBrowserRouter([
    {
        path: '/login',
        element: (
            <PublicRoute>
                <Login />
            </PublicRoute>
        ),
    },
    {
        path: '/signup',
        element: (
            <PublicRoute>
                <Signup />
            </PublicRoute>
        ),
    },
    {
        path: '/verify-email',
        element: <VerifyEmail />,
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <MainLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: 'dashboard',
                element: <Dashboard />,
            },
            {
                path: 'games',
                element: <GamesList />,
            },
            {
                path: 'games/:gameId/analysis',
                element: <AnalysisViewer />,
            },
        ],
    },
]);

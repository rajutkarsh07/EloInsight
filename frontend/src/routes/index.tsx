import { createBrowserRouter, Navigate, Outlet, useRoutes } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import VerifyEmail from '../pages/VerifyEmail';
import Dashboard from '../pages/Dashboard';
import GamesList from '../pages/GamesList';
import AnalysisList from '../pages/AnalysisList';
import AnalysisViewer from '../pages/AnalysisViewer';
import Settings from '../pages/Settings';
import { useAuth } from '../contexts/AuthContext';
import { RotateCw } from 'lucide-react';

// Loading spinner component
const LoadingScreen = () => (
    <div className="flex justify-center items-center h-screen w-screen bg-background text-foreground">
        <RotateCw className="animate-spin h-12 w-12 text-primary" />
    </div>
);

// Protected route wrapper
const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

// Public route wrapper (redirects to dashboard if already logged in)
const PublicRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

// Route definitions
const routeConfig = [
    {
        element: <PublicRoute />,
        children: [
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/signup',
                element: <Signup />,
            },
        ],
    },
    {
        path: '/verify-email',
        element: <VerifyEmail />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: '/',
                element: <MainLayout />,
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
                        path: 'analysis',
                        element: <AnalysisList />,
                    },
                    {
                        path: 'analysis/:gameId',
                        element: <AnalysisViewer />,
                    },
                    {
                        path: 'settings',
                        element: <Settings />,
                    },
                ],
            },
        ],
    },
];

// AppRoutes component that uses useRoutes hook - must be used inside AuthProvider
export const AppRoutes = () => {
    return useRoutes(routeConfig);
};

// Also export router for RouterProvider usage
export const router = createBrowserRouter(routeConfig);

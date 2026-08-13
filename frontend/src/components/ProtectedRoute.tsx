// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useContexts';

export const ProtectedRoute: React.FC = () => {
    const { isAuthenticated } = useAuth();

    // Instant redirect if token does not exist
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Render child routes (MainLayout, Dashboard, etc.) if authenticated
    return <Outlet />;
};
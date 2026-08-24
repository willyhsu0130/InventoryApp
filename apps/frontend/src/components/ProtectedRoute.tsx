// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import {
    useAuth,
   
} from '@/hooks/useContexts';
// import { LoadingScreen } from '@/components/LoadingScreen';

export const ProtectedRoute: React.FC = () => {
    // 1. Unconditional Hook Calls with Alias Destructuring
    const { isAuthenticated } = useAuth();


    // 2. Redirect Unauthenticated Users Immediately
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 3. Aggregate Loading States
   

    // 4. Render Full-Screen Loader Until All Catalogs Resolve
    // if (isDataLoading) {
    //     return <LoadingScreen message="載入系統資料中..." />;
    // }

    // 5. Render Protected App Routes
    return <Outlet />;
};
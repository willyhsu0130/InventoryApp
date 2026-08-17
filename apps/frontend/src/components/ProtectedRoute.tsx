// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import {
    useAuth,
    useInventoryCatalog,
    useCustomersCatalog,
    useProductCatalog,
    useOrdersCatalog,
    useManufactureCatalog
} from '@/hooks/useContexts';
import { LoadingScreen } from '@/components/LoadingScreen';

export const ProtectedRoute: React.FC = () => {
    // 1. Unconditional Hook Calls with Alias Destructuring
    const { isAuthenticated } = useAuth();

    const { loading: productsLoading } = useProductCatalog();
    const { loading: inventoryLoading } = useInventoryCatalog();
    const { loading: ordersLoading } = useOrdersCatalog();
    const { loading: customersLoading } = useCustomersCatalog();
    const { loading: manufactureLoading } = useManufactureCatalog();

    // 2. Redirect Unauthenticated Users Immediately
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 3. Aggregate Loading States
    const isDataLoading =
        productsLoading ||
        inventoryLoading ||
        ordersLoading ||
        customersLoading ||
        manufactureLoading;

    // 4. Render Full-Screen Loader Until All Catalogs Resolve
    if (isDataLoading) {
        return <LoadingScreen message="載入系統資料中..." />;
    }

    // 5. Render Protected App Routes
    return <Outlet />;
};
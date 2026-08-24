import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { ComponentType, ReactNode } from "react";

// Layout & Pages
import MainLayout from "./MainLayout";
import Login from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Orders } from "./pages/Orders";
import { Inventory } from "./pages/Inventory";
import { InventoryBatches } from "./pages/InventoryBatches";
import { Manufacture } from "./pages/Manufacture";
import { Settings } from "./pages/Settings";
import { Products } from "./pages/Products";
import { Customers } from "./pages/Customers";

// Auth & Route Guard
import { ProtectedRoute } from "./components/ProtectedRoute";

// Providers
import { TooltipProvider } from "./components/ui/tooltip";
import { ErrorProvider } from "./context/error/ErrorProvider";
import { AuthProvider } from "./context/auth/AuthProvider";
// import { CustomersProvider } from "./context/customers/CustomersProvider";
// import { ManufactureProvider } from "./context/manufacture/ManufactureProvider";
// import { InventoryProvider } from "./context/inventory/InventoryProvider";
// // import { ProductProvider } from "./context/product/ProductProvider";
// import { VariantProvider } from "./context/variant/VariantProvider";
// import { OrdersProvider } from "./context/orders/OrdersProvider";

// Composer
import { ProviderComposer } from "./components/ProviderComposer";

// Evaluated from top (outermost) to bottom (innermost)
const appProviders: Array<ComponentType<{ children: ReactNode }>> = [
  TooltipProvider,
  ErrorProvider,
  AuthProvider,
  // CustomersProvider,
  // ManufactureProvider,
  // InventoryProvider,
  // ProductProvider,
  // VariantProvider,
  // OrdersProvider,
];

export default function App() {
  return (
    <ProviderComposer providers={appProviders}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inventory/batches" element={<InventoryBatches />} />
              <Route path="/manufacture" element={<Manufacture />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/products" element={<Products />} />
              <Route path="/customers" element={<Customers />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ProviderComposer>
  );
}
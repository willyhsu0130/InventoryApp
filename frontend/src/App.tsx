// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import MainLayout from "./MainLayout"
import { Dashboard } from "./pages/Dashboard"
import { Orders } from "./pages/Orders"
import { Inventory } from "./pages/Inventory"
import { Production } from "./pages/Production"
import { Settings } from "./pages/Settings"
import { Products } from "./pages/Products"

import { ErrorProvider } from "./context/error/ErrorProvider"
import { ProductProvider } from "./context/ProductProvider"
import { InventoryProvider } from "./context/InventoryProvider"
import { OrdersProvider } from "./context/orders/OrdersProvider"
import { CustomersProvider } from "./context/customers/CustomersProvider"

// Helper component to keep App.tsx clean
const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorProvider>
    <CustomersProvider>
      <ProductProvider>
        <InventoryProvider>
          <OrdersProvider>
            {children}
          </OrdersProvider>
        </InventoryProvider>
      </ProductProvider>
    </CustomersProvider>
  </ErrorProvider>
);

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/production" element={<Production />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/products" element={<Products />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}
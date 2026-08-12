// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import MainLayout from "./MainLayout"
import { Dashboard } from "./pages/Dashboard"
import { Orders } from "./pages/Orders"
import { Inventory } from "./pages/Inventory"
import { InventoryBatches } from "./pages/InventoryBatches"
import { Manufacture } from "./pages/Manufacture"
import { Settings } from "./pages/Settings"
import { Products } from "./pages/Products"

import { ErrorProvider } from "./context/error/ErrorProvider"
import { ProductProvider } from "./context/ProductProvider"
import { InventoryProvider } from "./context/InventoryProvider"
import { OrdersProvider } from "./context/orders/OrdersProvider"
import { CustomersProvider } from "./context/customers/CustomersProvider"
import { Customers } from "./pages/Customers"
import { ManufactureProvider } from "./context/manufacture/ManufactureProvider"
import { TooltipProvider } from "./components/ui/tooltip"
import Login from "./pages/Login"

// Helper component to keep App.tsx clean
const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipProvider><ErrorProvider>
    <CustomersProvider>
      <ManufactureProvider>
        <ProductProvider>
          <InventoryProvider>
            <OrdersProvider>
              {children}
            </OrdersProvider>
          </InventoryProvider>
        </ProductProvider>
      </ManufactureProvider>
    </CustomersProvider>
  </ErrorProvider></TooltipProvider>

);

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}
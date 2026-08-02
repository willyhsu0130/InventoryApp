// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import MainLayout from "./MainLayout"
import { Dashboard } from "./pages/Dashboard"
import { Orders } from "./pages/Orders"
import { Inventory } from "./pages/Inventory"
import { Production } from "./pages/Production"
import { Settings } from "./pages/Settings"
import { Products } from "./pages/Products"
import { ProductProvider } from "./context/ProductProvider"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Parent Route using MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/production" element={<Production />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/products" element={<ProductProvider><Products /></ProductProvider>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
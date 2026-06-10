import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useAuth } from './auth/AuthContext';
import AdminLayout from './layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductEditorPage from './pages/ProductEditorPage';
import CategoriesPage from './pages/CategoriesPage';
import OrdersPage from './pages/OrdersPage';
import OrderCardPage from './pages/OrderCardPage';
import RatesPage from './pages/RatesPage';
import ImportExportPage from './pages/ImportExportPage';
import ApplicabilityPage from './pages/ApplicabilityPage';
import SettingsPage from './pages/SettingsPage';
import { C } from './theme';

function Protected({ children }: { children: React.ReactElement }) {
  const { loading, username } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: C.muted, fontSize: 14 }}>
        Загрузка…
      </Box>
    );
  }
  if (!username) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  const { loading, username } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!loading && username ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        element={
          <Protected>
            <AdminLayout />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductEditorPage />} />
        <Route path="/products/:id" element={<ProductEditorPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderCardPage />} />
        <Route path="/rates" element={<RatesPage />} />
        <Route path="/import-export" element={<ImportExportPage />} />
        <Route path="/applicability" element={<ApplicabilityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

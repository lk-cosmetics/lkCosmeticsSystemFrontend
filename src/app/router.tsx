import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import DashbordLayout from '@/components/dashboardLayout/pageDashbord';
import LoginPage from '@/pages/login';
import NotFoundPage from '@/pages/NotFoundPage';
import StatisticsPage from '@/pages/StatisticsPage';
import AddUserPage from '@/pages/AddUserPage';
import UsersPage from '@/pages/UsersPage';
import CompaniesPage from '@/pages/CompaniesPage';
import AddCompanyPage from '@/pages/AddCompanyPage';
import BrandsPage from '@/pages/BrandsPage';
import SalesChannelsPage from '@/pages/SalesChannelsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import SettingsPage from '@/pages/SettingsPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleGuard from '@/components/RoleGuard';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashbordLayout />}>
            <Route index element={<StatisticsPage />} />
            <Route path="add-user" element={<AddUserPage />} />
            <Route path="users" element={<UsersPage />} />
            {/* SuperAdmin only routes */}
            <Route
              path="companies"
              element={
                <RoleGuard requiredRole="SuperAdmin">
                  <CompaniesPage />
                </RoleGuard>
              }
            />
            <Route
              path="add-company"
              element={
                <RoleGuard requiredRole="SuperAdmin">
                  <AddCompanyPage />
                </RoleGuard>
              }
            />
            <Route
              path="brands"
              element={
                <RoleGuard requiredRole="SuperAdmin">
                  <BrandsPage />
                </RoleGuard>
              }
            />
            <Route
              path="sales-channels"
              element={
                <RoleGuard requiredRole="SuperAdmin">
                  <SalesChannelsPage />
                </RoleGuard>
              }
            />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* 404 Page - catches all unmatched routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

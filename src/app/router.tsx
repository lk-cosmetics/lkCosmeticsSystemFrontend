import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import DashbordLayout from '@/components/dashboardLayout/pageDashbord';
import LoginPage from '@/pages/login';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import StatisticsPage from '@/pages/StatisticsPage';
import AddUserPageNew from '@/pages/AddUserPageNew';
import UsersPageNew from '@/pages/UsersPageNew';
import UserDetailsPage from '@/pages/UserDetailsPage';
import EditUserPage from '@/pages/EditUserPage';
import RolesPage from '@/pages/RolesPage';
import ProfilePage from '@/pages/ProfilePage';
import CompaniesPage from '@/pages/CompaniesPage';
import AddCompanyPage from '@/pages/AddCompanyPage';
import BrandsPage from '@/pages/BrandsPage';
import SalesChannelsPage from '@/pages/SalesChannelsPage';
import ProductsPage from '@/pages/ProductsPage';
import InventoryPage from '@/pages/InventoryPage';
import CategoriesPage from '@/pages/CategoriesPage';
import PromotionsPage from '@/pages/PromotionsPage';
import OrdersPage from '@/pages/OrdersPage';
import ClientsPage from '@/pages/ClientsPage';
import POSPage from '@/pages/POSPage';
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
            {/* User Management Routes */}
            <Route path="users" element={<UsersPageNew />} />
            <Route path="users/add" element={<AddUserPageNew />} />
            <Route path="users/:id" element={<UserDetailsPage />} />
            <Route path="users/:id/edit" element={<EditUserPage />} />
            {/* Legacy route redirect */}
            <Route path="add-user" element={<AddUserPageNew />} />
            {/* Role Management */}
            <Route
              path="roles"
              element={
                <RoleGuard requiredPermission="manage_roles">
                  <RolesPage />
                </RoleGuard>
              }
            />
            {/* Profile */}
            <Route path="profile" element={<ProfilePage />} />
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
            {/* Product & Category Management */}
            <Route
              path="products"
              element={
                <RoleGuard requiredRole="SuperAdmin">
                  <ProductsPage />
                </RoleGuard>
              }
            />
            <Route
              path="inventory"
              element={
                <RoleGuard requiredRole="SuperAdmin">
                  <InventoryPage />
                </RoleGuard>
              }
            />
            <Route
              path="categories"
              element={
                <RoleGuard requiredRole="SuperAdmin">
                  <CategoriesPage />
                </RoleGuard>
              }
            />
            {/* Promotions Management */}
            <Route
              path="promotions"
              element={
                <RoleGuard
                  requiredRoles={['Admin', 'Manager', 'CEO', 'SuperAdmin']}
                >
                  <PromotionsPage />
                </RoleGuard>
              }
            />
            {/* Orders & Clients */}
            <Route path="orders" element={<OrdersPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* 404 Page - catches all unmatched routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

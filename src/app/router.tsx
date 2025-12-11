import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import DashbordLayout from '@/components/dashboardLayout/pageDashbord';
import LoginPage from '@/pages/login';
import NotFoundPage from '@/pages/NotFoundPage';
import StatisticsPage from '@/pages/StatisticsPage';
import AddUserPage from '@/pages/AddUserPage';
import UsersPage from '@/pages/UsersPage';
import NotificationsPage from '@/pages/NotificationsPage';

export function AppRouter() {
  return ( 
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
        </Route>
        <Route path="/dashboard" element={<DashbordLayout />}>

          <Route index element={<StatisticsPage />} />
          <Route path="add-user" element={<AddUserPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route> 

        <Route path='/login' element={<LoginPage />} />
        {/* 404 Page - catches all unmatched routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

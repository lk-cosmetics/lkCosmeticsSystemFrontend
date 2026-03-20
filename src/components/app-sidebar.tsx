import * as React from 'react';
import {
  IconChartBar,
  IconDashboard,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconSearch,
  IconSettings,
  IconUsers,
  IconBuilding,
  IconTag,
  IconShoppingCart,
  IconShield,
  IconUserCircle,
  IconPackage,
  IconCategory,
  IconDiscount,
  IconBoxSeam,
  IconReceipt,
  IconUsersGroup,
  IconCash,
} from '@tabler/icons-react';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/store/authStore';

// Static navigation data (doesn't depend on user state)
const navMain = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: IconDashboard,
  },
  {
    title: 'Lifecycle',
    url: '#',
    icon: IconListDetails,
  },
  {
    title: 'Analytics',
    url: '#',
    icon: IconChartBar,
  },
  {
    title: 'Projects',
    url: '#',
    icon: IconFolder,
  },
  {
    title: 'Team',
    url: '#',
    icon: IconUsers,
  },
  {
    title: 'Users',
    url: '/dashboard/users',
    icon: IconUsers,
  },
  {
    title: 'Roles',
    url: '/dashboard/roles',
    icon: IconShield,
    requiredRole: 'SuperAdmin',
  },
  {
    title: 'My Profile',
    url: '/dashboard/profile',
    icon: IconUserCircle,
  },
  {
    title: 'Companies',
    url: '/dashboard/companies',
    icon: IconBuilding,
    requiredRole: 'SuperAdmin',
  },
  {
    title: 'Brands',
    url: '/dashboard/brands',
    icon: IconTag,
    requiredRole: 'SuperAdmin',
  },
  {
    title: 'Sales Channels',
    url: '/dashboard/sales-channels',
    icon: IconShoppingCart,
    requiredRole: 'SuperAdmin',
  },
  {
    title: 'Products',
    url: '/dashboard/products',
    icon: IconPackage,
    requiredRole: 'SuperAdmin',
  },
  {
    title: 'Inventory',
    url: '/dashboard/inventory',
    icon: IconBoxSeam,
    requiredRole: 'SuperAdmin',
  },
  {
    title: 'Categories',
    url: '/dashboard/categories',
    icon: IconCategory,
    requiredRole: 'SuperAdmin',
  },
  {
    title: 'Promotions',
    url: '/dashboard/promotions',
    icon: IconDiscount,
    requiredRole: 'SuperAdmin',
  },
  {
    title: 'Orders',
    url: '/dashboard/orders',
    icon: IconReceipt,
  },
  {
    title: 'Clients',
    url: '/dashboard/clients',
    icon: IconUsersGroup,
  },
  {
    title: 'POS',
    url: '/dashboard/pos',
    icon: IconCash,
  },
];

const navSecondary = [
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: IconSettings,
  },
  {
    title: 'Get Help',
    url: '#',
    icon: IconHelp,
  },
  {
    title: 'Search',
    url: '#',
    icon: IconSearch,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Hook must be called inside the component
  const { user: currentUser } = useAuthStore();

  // Memoize user data to prevent unnecessary re-renders
  const userData = React.useMemo(
    () => ({
      name: currentUser?.full_name || 'User',
      email: currentUser?.email || 'No Email',
      avatar: '/avatars/shadcn.jpg',
    }),
    [currentUser?.full_name, currentUser?.email]
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="flex justify-center items-center">
        <img src="/logo.svg" alt="Logo" className="size-30" />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}

import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react"
import { Link, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/store/authStore"
import { hasRole } from "@/hooks/useAuth"

export function NavMain({
  items,
}: {
  readonly items: readonly {
    title: string
    url: string
    icon?: Icon
    requiredRole?: string
  }[]
}) {
  const location = useLocation();
  const { user } = useAuthStore();

  // Filter items based on user role
  const visibleItems = items.filter(item => {
    if (!item.requiredRole) return true;
    // Check if user and user.roles exist before checking role
    if (!user || !user.roles) return false;
    return hasRole(user, item.requiredRole);
  });

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              asChild
            >
              <Link to="/dashboard/add-user">
                <IconCirclePlusFilled />
                <span>Quick Create</span>
              </Link>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <IconMail />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                tooltip={item.title} 
                asChild
                isActive={location.pathname === item.url}
              >
                <Link to={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

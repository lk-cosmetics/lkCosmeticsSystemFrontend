'use client';

import * as React from 'react';
import { Link } from 'react-router-dom';
import { type Icon } from '@tabler/icons-react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: Icon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { isMobile, setOpenMobile } = useSidebar();

  const isRoutable = (url: string) => url.trim() !== '' && url !== '#';

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(item => (
            <SidebarMenuItem key={item.title}>
              {isRoutable(item.url) ? (
                <SidebarMenuButton asChild>
                  <Link to={item.url} onClick={handleNavClick}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  disabled
                  aria-disabled="true"
                  className="cursor-not-allowed opacity-60"
                  tooltip={`${item.title} (Coming soon)`}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

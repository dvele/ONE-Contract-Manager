import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileCheck,
  Shield,
  Plus,
  Box,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { signOut } from "aws-amplify/auth";
import useAuthHelper from "@/hooks/use-auth-helper";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "New Contract",
    url: "/generate-contracts",
    icon: Plus,
  },
  {
    title: "Active Contracts",
    url: "/contracts",
    icon: FileCheck,
  },
  // {
  //   title: "Component Library",
  //   url: "/component-library",
  //   icon: Box,
  // },
];

const adminNavItems = [
  {
    title: "Admin",
    url: "/admin",
    icon: Shield,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { currentUserIsAdmin } = useAuthHelper();

  const isActive = (url: string) => {
    if (url === "/") return location === url;
    return location.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            D
          </div>
          <div className="flex flex-col">
            <span
              className="text-base font-semibold text-sidebar-foreground"
              data-testid="text-app-title">
              Dvele ONE
            </span>
            <span className="text-xs text-muted-foreground">
              Contract Platform
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}>
                    <Link
                      href={item.url}
                      data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {currentUserIsAdmin &&
                adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}>
                      <Link
                        href={item.url}
                        data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={"Logout"}>
                  <Button
                    variant={"ghost"}
                    size={"sm"}
                    className="justify-start"
                    onClick={async () => await signOut({ global: true })}>
                    <LogOut className="h-4 w-4 rotate-180" />
                    <span>Logout</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        <div className="text-xs text-muted-foreground">Version 1.0.0</div>
      </SidebarFooter>
    </Sidebar>
  );
}
